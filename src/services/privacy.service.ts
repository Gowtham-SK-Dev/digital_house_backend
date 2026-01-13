// Backend/src/services/privacy.service.ts
// Privacy and contact visibility enforcement service

import { db } from '../config/database';
import { MarriageProfile } from '../types/marriage';

export class PrivacyService {
  /**
   * Check if a user can view contact info of another profile
   */
  async canViewContactInfo(
    viewerId: string,
    profileOwnerId: string,
    interestStatus?: string
  ): Promise<boolean> {
    try {
      // Profile owner can always view their own info
      if (viewerId === profileOwnerId) {
        return true;
      }

      // Check if there's a mutual interest/acceptance
      const interestCheck = await db.query(
        `SELECT * FROM marriage_interests
         WHERE (
           (sender_user_id = $1 AND receiver_user_id = $2) OR
           (sender_user_id = $2 AND receiver_user_id = $1)
         )
         AND status = 'accepted'`,
        [viewerId, profileOwnerId]
      );

      return interestCheck.rows.length > 0;
    } catch (error) {
      console.error('Error checking contact visibility:', error);
      return false;
    }
  }

  /**
   * Get visible fields for a profile based on viewer's relationship
   */
  async getVisibleFields(profile: MarriageProfile, viewerId: string): Promise<MarriageProfile> {
    try {
      // Profile owner sees everything
      if (viewerId === profile.userId) {
        return profile;
      }

      // Check interest status
      const interestCheck = await db.query(
        `SELECT status FROM marriage_interests
         WHERE (
           (sender_user_id = $1 AND receiver_user_id = $2 AND receiver_profile_id = $3) OR
           (sender_user_id = $2 AND receiver_user_id = $1 AND sender_profile_id = $3)
         )`,
        [viewerId, profile.userId, profile.id]
      );

      const interest = interestCheck.rows[0];

      // If no interest, show limited fields
      if (!interest) {
        return this.applyPrivacyRestriction(profile, 'no_interest');
      }

      // If interest sent (stage 1), show blurred version
      if (interest.status === 'sent') {
        return this.applyPrivacyRestriction(profile, 'interest_sent');
      }

      // If interest accepted (stage 2+), show full info
      if (interest.status === 'accepted') {
        return this.applyPrivacyRestriction(profile, 'accepted');
      }

      // Default: restricted view
      return this.applyPrivacyRestriction(profile, 'no_interest');
    } catch (error) {
      console.error('Error getting visible fields:', error);
      return this.applyPrivacyRestriction(profile, 'no_interest');
    }
  }

  /**
   * Enforce privacy restrictions on a profile
   */
  async enforcePrivacy(profile: MarriageProfile, viewerId: string): Promise<MarriageProfile> {
    return this.getVisibleFields(profile, viewerId);
  }

  /**
   * Log when contact information is revealed
   */
  async logContactVisibility(
    viewerUserId: string,
    viewedUserId: string,
    interestId: string,
    infoType: 'phone' | 'email' | 'address' | 'full_photo' | 'horoscope' | 'family_details',
    context: 'interest_accepted' | 'mutual_approval' | 'admin_request' | 'direct_contact'
  ): Promise<void> {
    try {
      const logId = require('uuid').v4();

      await db.query(
        `INSERT INTO contact_visibility_logs (
          id, viewer_user_id, viewed_user_id, interest_id, info_revealed, revealed_at, context, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW())`,
        [logId, viewerUserId, viewedUserId, interestId, infoType, context]
      );
    } catch (error) {
      console.error('Error logging contact visibility:', error);
      // Don't throw - logging failure shouldn't break the flow
    }
  }

  /**
   * Get privacy logs for audit purposes (admin only)
   */
  async getPrivacyLogs(filters?: {
    viewerId?: string;
    viewedUserId?: string;
    infoType?: string;
    days?: number;
  }): Promise<any[]> {
    try {
      let query = 'SELECT * FROM contact_visibility_logs WHERE 1=1';
      const values = [];
      let paramIndex = 1;

      if (filters?.viewerId) {
        query += ` AND viewer_user_id = $${paramIndex++}`;
        values.push(filters.viewerId);
      }

      if (filters?.viewedUserId) {
        query += ` AND viewed_user_id = $${paramIndex++}`;
        values.push(filters.viewedUserId);
      }

      if (filters?.infoType) {
        query += ` AND info_revealed = $${paramIndex++}`;
        values.push(filters.infoType);
      }

      if (filters?.days) {
        query += ` AND created_at >= NOW() - INTERVAL '${filters.days} days'`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get privacy logs: ${error.message}`);
    }
  }

  /**
   * Apply privacy restrictions based on relationship stage
   */
  private applyPrivacyRestriction(profile: MarriageProfile, stage: string): MarriageProfile {
    const restricted = { ...profile };

    switch (stage) {
      case 'no_interest':
        // Stage 0: Show only public info
        restricted.photos = (profile.photos || []).map(p => ({
          ...p,
          isBlurred: true,
          url: this.blurImageUrl(p.url), // In real impl, return blurred image
        }));
        restricted.horoscopeFile = undefined;
        restricted.idProofFile = undefined;
        restricted.communityProofFile = undefined;
        restricted.familyDetails = undefined;
        restricted.doshamDetails = undefined;
        restricted.expectations = undefined;
        break;

      case 'interest_sent':
        // Stage 1: Show blurred photos but some astrological info
        restricted.photos = (profile.photos || []).map(p => ({
          ...p,
          isBlurred: true,
          url: this.blurImageUrl(p.url),
        }));
        restricted.horoscopeFile = undefined;
        restricted.idProofFile = undefined;
        restricted.communityProofFile = undefined;
        restricted.familyDetails = undefined;
        break;

      case 'accepted':
        // Stage 2+: Show everything except ID proofs
        restricted.photos = profile.photos || [];
        restricted.idProofFile = undefined;
        restricted.communityProofFile = undefined;
        break;

      case 'mutual_approval':
        // Stage 3: Show everything
        break;
    }

    return restricted;
  }

  /**
   * Blur image URL (placeholder - real implementation would use image processing)
   */
  private blurImageUrl(originalUrl: string): string {
    // In production, you'd process the image server-side
    // For now, return a placeholder blur effect URL
    return originalUrl.includes('?') 
      ? `${originalUrl}&blur=true` 
      : `${originalUrl}?blur=true`;
  }

  /**
   * Check if user has violated privacy policies
   */
  async checkPrivacyViolation(userId: string): Promise<boolean> {
    try {
      // Check if user has been reported for sharing contact info inappropriately
      const reports = await db.query(
        `SELECT COUNT(*) as count FROM marriage_reports
         WHERE reported_by_user_id = $1
         AND report_type = 'inappropriate_behavior'
         AND created_at >= NOW() - INTERVAL '30 days'
         AND status != 'false_report'`,
        [userId]
      );

      return reports.rows[0].count > 2; // Threshold: 3 reports in 30 days
    } catch (error) {
      console.error('Error checking privacy violation:', error);
      return false;
    }
  }

  /**
   * Watermark image for privacy (placeholder)
   */
  watermarkImage(imageUrl: string, userId: string): string {
    // In production, this would add a watermark to the image
    return imageUrl.includes('?')
      ? `${imageUrl}&watermark=${userId}`
      : `${imageUrl}?watermark=${userId}`;
  }

  /**
   * Prevent screenshots/screen recording (technical implementation)
   * This is typically done on the frontend with CSS/JS tricks
   */
  getScreenshotPreventionHeaders(): { [key: string]: string } {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'",
    };
  }

  /**
   * Detect potentially violating users
   */
  async detectViodatingUsers(days: number = 30): Promise<string[]> {
    try {
      // Find users who have viewed many profiles' contact info in short time
      const result = await db.query(
        `SELECT viewer_user_id, COUNT(*) as view_count
         FROM contact_visibility_logs
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         AND info_revealed IN ('phone', 'email', 'address')
         GROUP BY viewer_user_id
         HAVING COUNT(*) > 20
         ORDER BY view_count DESC`,
        []
      );

      return result.rows.map(r => r.viewer_user_id);
    } catch (error) {
      console.error('Error detecting violating users:', error);
      return [];
    }
  }
}
