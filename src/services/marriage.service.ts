// Backend/src/services/marriage.service.ts
// Core Marriage Module Service with all business logic

import { db } from '../config/database';
import {
  MarriageProfile,
  MarriageInterest,
  HoroscopeMatch,
  AdminVerification,
  MarriageReport,
  ContactVisibilityLog,
  CreateMarriageProfileRequest,
  UpdateMarriageProfileRequest,
  SearchMarriageProfilesRequest,
  SendInterestRequest,
  RespondToInterestRequest,
  ReportProfileRequest,
  VerifyProfileRequest,
  RespondToReportRequest,
  UploadDocumentsRequest,
  UploadPhotosRequest,
} from '../types/marriage';
import { PrivacyService } from './privacy.service';

export class MarriageService {
  private privacyService = new PrivacyService();

  // ==================== PROFILE OPERATIONS ====================

  /**
   * Create a new marriage profile for a user
   */
  async createProfile(userId: string, data: CreateMarriageProfileRequest): Promise<MarriageProfile> {
    try {
      const profileId = require('uuid').v4();

      const query = `
        INSERT INTO marriage_profiles (
          id, user_id, created_by, created_by_user_id, verification_status,
          name, gender, dob, age, height, weight, complexion,
          education, profession, income, native_place, current_location,
          caste, sub_caste, gothram, raasi, natchathiram, dosham_details,
          time_of_birth, place_of_birth, marital_status,
          family_details, expectations, contact_visibility, profile_completeness,
          match_score, views, interests_received, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23,
          $24, $25, $26,
          $27, $28, $29, $30,
          $31, $32, $33, NOW(), NOW()
        )
        RETURNING *;
      `;

      const values = [
        profileId,
        userId,
        data.createdBy,
        userId, // created_by_user_id
        'pending',
        data.name,
        data.gender,
        data.dateOfBirth,
        data.age,
        data.height || null,
        data.weight || null,
        data.complexion || null,
        data.education || null,
        data.profession || null,
        data.income || null,
        data.nativePlace || null,
        data.currentLocation || null,
        data.caste || null,
        data.subCaste || null,
        data.gothram || null,
        data.raasi || null,
        data.natchathiram || null,
        JSON.stringify(data.doshamDetails) || null,
        data.timeOfBirth || null,
        data.placeOfBirth || null,
        data.maritalStatus || null,
        JSON.stringify(data.familyDetails) || null,
        JSON.stringify(data.expectations) || null,
        data.contactVisibility || 'hidden',
        0, // profileCompleteness - will be calculated
        0, // matchScore
        0, // views
        0, // interestsReceived
      ];

      const result = await db.query(query, values);
      const profile = result.rows[0];

      // Create admin verification record
      await this.createAdminVerificationRecord(profile.id);

      return this.formatProfile(profile);
    } catch (error) {
      throw new Error(`Failed to create marriage profile: ${error.message}`);
    }
  }

  /**
   * Update marriage profile
   */
  async updateProfile(profileId: string, userId: string, data: UpdateMarriageProfileRequest): Promise<MarriageProfile> {
    try {
      // Verify ownership
      const ownershipCheck = await db.query(
        'SELECT user_id FROM marriage_profiles WHERE id = $1',
        [profileId]
      );

      if (ownershipCheck.rows.length === 0) {
        throw new Error('Profile not found');
      }

      if (ownershipCheck.rows[0].user_id !== userId) {
        throw new Error('Unauthorized to update this profile');
      }

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Dynamically build UPDATE query
      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.height !== undefined) {
        updateFields.push(`height = $${paramIndex++}`);
        values.push(data.height);
      }
      if (data.weight !== undefined) {
        updateFields.push(`weight = $${paramIndex++}`);
        values.push(data.weight);
      }
      if (data.education !== undefined) {
        updateFields.push(`education = $${paramIndex++}`);
        values.push(data.education);
      }
      if (data.profession !== undefined) {
        updateFields.push(`profession = $${paramIndex++}`);
        values.push(data.profession);
      }
      if (data.income !== undefined) {
        updateFields.push(`income = $${paramIndex++}`);
        values.push(data.income);
      }
      if (data.nativePlace !== undefined) {
        updateFields.push(`native_place = $${paramIndex++}`);
        values.push(data.nativePlace);
      }
      if (data.currentLocation !== undefined) {
        updateFields.push(`current_location = $${paramIndex++}`);
        values.push(data.currentLocation);
      }
      if (data.caste !== undefined) {
        updateFields.push(`caste = $${paramIndex++}`);
        values.push(data.caste);
      }
      if (data.familyDetails !== undefined) {
        updateFields.push(`family_details = $${paramIndex++}`);
        values.push(JSON.stringify(data.familyDetails));
      }
      if (data.expectations !== undefined) {
        updateFields.push(`expectations = $${paramIndex++}`);
        values.push(JSON.stringify(data.expectations));
      }
      if (data.contactVisibility !== undefined) {
        updateFields.push(`contact_visibility = $${paramIndex++}`);
        values.push(data.contactVisibility);
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(profileId);

      const query = `
        UPDATE marriage_profiles
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
      `;

      const result = await db.query(query, values);
      return this.formatProfile(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update marriage profile: ${error.message}`);
    }
  }

  /**
   * Get profile (with privacy enforcement)
   */
  async getProfile(profileId: string, viewerId?: string): Promise<MarriageProfile | null> {
    try {
      const result = await db.query(
        'SELECT * FROM marriage_profiles WHERE id = $1 AND deleted_at IS NULL',
        [profileId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      let profile = this.formatProfile(result.rows[0]);

      // Enforce privacy if viewer is not owner
      if (viewerId && viewerId !== profile.userId) {
        profile = await this.privacyService.enforcePrivacy(profile, viewerId);
      }

      // Increment view count
      if (viewerId && viewerId !== profile.userId) {
        await db.query(
          'UPDATE marriage_profiles SET views = views + 1 WHERE id = $1',
          [profileId]
        );
      }

      return profile;
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Search marriage profiles with filters
   */
  async searchProfiles(filters: SearchMarriageProfilesRequest, userId: string): Promise<MarriageProfile[]> {
    try {
      let query = `
        SELECT * FROM marriage_profiles
        WHERE deleted_at IS NULL
        AND user_id != $1
        AND verification_status = 'verified'
      `;
      const values = [userId];
      let paramIndex = 2;

      // Gender filter
      if (filters.gender) {
        query += ` AND gender = $${paramIndex++}`;
        values.push(filters.gender);
      }

      // Age range filter
      if (filters.ageRange) {
        query += ` AND age >= $${paramIndex} AND age <= $${paramIndex + 1}`;
        values.push(filters.ageRange.min, filters.ageRange.max);
        paramIndex += 2;
      }

      // Location filter
      if (filters.location && filters.location.length > 0) {
        const placeholders = filters.location.map(() => `$${paramIndex++}`).join(',');
        query += ` AND current_location IN (${placeholders})`;
        values.push(...filters.location);
      }

      // Education filter
      if (filters.education && filters.education.length > 0) {
        const placeholders = filters.education.map(() => `$${paramIndex++}`).join(',');
        query += ` AND education IN (${placeholders})`;
        values.push(...filters.education);
      }

      // Caste filter
      if (filters.caste) {
        query += ` AND caste = $${paramIndex++}`;
        values.push(filters.caste);
      }

      // Raasi filter
      if (filters.raasi && filters.raasi.length > 0) {
        const placeholders = filters.raasi.map(() => `$${paramIndex++}`).join(',');
        query += ` AND raasi IN (${placeholders})`;
        values.push(...filters.raasi);
      }

      // Dosham filter
      if (filters.dosham) {
        if (filters.dosham === 'with') {
          query += ` AND dosham_details IS NOT NULL`;
        } else if (filters.dosham === 'without') {
          query += ` AND dosham_details IS NULL`;
        }
      }

      // Verified only filter
      if (filters.verifiedOnly) {
        query += ` AND verification_status = 'verified'`;
      }

      // With horoscope filter
      if (filters.withHoroscope) {
        query += ` AND horoscope_file IS NOT NULL`;
      }

      // With photos filter
      if (filters.withPhotos) {
        query += ` AND photos IS NOT NULL AND json_array_length(photos) > 0`;
      }

      // Minimum profile completion
      if (filters.minProfileCompletion) {
        query += ` AND profile_completeness >= $${paramIndex++}`;
        values.push(filters.minProfileCompletion);
      }

      // Sorting
      const sortBy = filters.sortBy || 'recent';
      switch (sortBy) {
        case 'match_score':
          query += ` ORDER BY match_score DESC`;
          break;
        case 'age':
          query += ` ORDER BY age ASC`;
          break;
        case 'location':
          query += ` ORDER BY current_location ASC`;
          break;
        default:
          query += ` ORDER BY created_at DESC`;
      }

      // Pagination
      const limit = filters.limit || 20;
      const page = filters.page || 1;
      const offset = (page - 1) * limit;

      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      values.push(limit, offset);

      const result = await db.query(query, values);

      // Enforce privacy on results
      const profiles = await Promise.all(
        result.rows.map(p => this.privacyService.enforcePrivacy(this.formatProfile(p), userId))
      );

      return profiles;
    } catch (error) {
      throw new Error(`Failed to search profiles: ${error.message}`);
    }
  }

  /**
   * Delete profile (soft delete)
   */
  async deleteProfile(profileId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      const result = await db.query(
        'SELECT user_id FROM marriage_profiles WHERE id = $1',
        [profileId]
      );

      if (result.rows.length === 0 || result.rows[0].user_id !== userId) {
        throw new Error('Unauthorized');
      }

      await db.query(
        'UPDATE marriage_profiles SET deleted_at = NOW() WHERE id = $1',
        [profileId]
      );
    } catch (error) {
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  }

  // ==================== INTEREST OPERATIONS ====================

  /**
   * Send interest to another profile
   */
  async sendInterest(senderProfileId: string, userId: string, data: SendInterestRequest): Promise<MarriageInterest> {
    try {
      const interestId = require('uuid').v4();

      // Verify sender profile ownership
      const senderCheck = await db.query(
        'SELECT user_id FROM marriage_profiles WHERE id = $1',
        [senderProfileId]
      );

      if (senderCheck.rows.length === 0 || senderCheck.rows[0].user_id !== userId) {
        throw new Error('Unauthorized to send interest');
      }

      // Check if receiver profile exists
      const receiverCheck = await db.query(
        'SELECT user_id FROM marriage_profiles WHERE id = $1',
        [data.receiverProfileId]
      );

      if (receiverCheck.rows.length === 0) {
        throw new Error('Receiver profile not found');
      }

      const receiverUserId = receiverCheck.rows[0].user_id;

      // Check for existing interest
      const existingInterest = await db.query(
        `SELECT id FROM marriage_interests 
         WHERE sender_profile_id = $1 AND receiver_profile_id = $2`,
        [senderProfileId, data.receiverProfileId]
      );

      if (existingInterest.rows.length > 0) {
        throw new Error('Interest already sent to this profile');
      }

      const query = `
        INSERT INTO marriage_interests (
          id, sender_profile_id, sender_user_id, receiver_profile_id, receiver_user_id,
          status, message, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *;
      `;

      const result = await db.query(query, [
        interestId,
        senderProfileId,
        userId,
        data.receiverProfileId,
        receiverUserId,
        'sent',
        data.message || null,
      ]);

      // Increment interests_received count for receiver
      await db.query(
        'UPDATE marriage_profiles SET interests_received = interests_received + 1 WHERE id = $1',
        [data.receiverProfileId]
      );

      return this.formatInterest(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to send interest: ${error.message}`);
    }
  }

  /**
   * Respond to interest request
   */
  async respondToInterest(interestId: string, userId: string, data: RespondToInterestRequest): Promise<MarriageInterest> {
    try {
      // Get the interest
      const interestResult = await db.query(
        'SELECT * FROM marriage_interests WHERE id = $1',
        [interestId]
      );

      if (interestResult.rows.length === 0) {
        throw new Error('Interest not found');
      }

      const interest = interestResult.rows[0];

      // Verify this user is the receiver
      if (interest.receiver_user_id !== userId) {
        throw new Error('Unauthorized');
      }

      if (interest.status !== 'sent') {
        throw new Error('Interest already responded to');
      }

      // Update interest status
      const query = `
        UPDATE marriage_interests
        SET status = $1, responded_at = NOW(), responded_by = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *;
      `;

      const result = await db.query(query, [data.status, userId, interestId]);

      // If accepted, log that contact details will be shared
      if (data.status === 'accepted') {
        await this.privacyService.logContactVisibility(
          interest.receiver_user_id,
          interest.sender_user_id,
          interestId,
          'phone',
          'interest_accepted'
        );
      }

      return this.formatInterest(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to respond to interest: ${error.message}`);
    }
  }

  /**
   * Get interests received
   */
  async getInterestsReceived(userId: string, page = 1, limit = 20): Promise<MarriageInterest[]> {
    try {
      const offset = (page - 1) * limit;

      const result = await db.query(
        `SELECT * FROM marriage_interests
         WHERE receiver_user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows.map(r => this.formatInterest(r));
    } catch (error) {
      throw new Error(`Failed to get interests: ${error.message}`);
    }
  }

  /**
   * Get interests sent
   */
  async getInterestsSent(userId: string, page = 1, limit = 20): Promise<MarriageInterest[]> {
    try {
      const offset = (page - 1) * limit;

      const result = await db.query(
        `SELECT * FROM marriage_interests
         WHERE sender_user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows.map(r => this.formatInterest(r));
    } catch (error) {
      throw new Error(`Failed to get sent interests: ${error.message}`);
    }
  }

  // ==================== DOCUMENT OPERATIONS ====================

  /**
   * Upload documents (horoscope, ID proof, community proof)
   */
  async uploadDocuments(profileId: string, userId: string, data: UploadDocumentsRequest): Promise<MarriageProfile> {
    try {
      // Verify ownership
      const ownerCheck = await db.query(
        'SELECT user_id FROM marriage_profiles WHERE id = $1',
        [profileId]
      );

      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
        throw new Error('Unauthorized');
      }

      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (data.horoscopeUrl) {
        updateFields.push(`horoscope_file = $${paramIndex++}`);
        values.push(JSON.stringify({ documentUrl: data.horoscopeUrl, fileType: 'pdf', uploadedAt: new Date() }));
      }

      if (data.idProofUrl) {
        updateFields.push(`id_proof_file = $${paramIndex++}`);
        values.push(JSON.stringify({ documentUrl: data.idProofUrl, fileType: 'pdf', uploadedAt: new Date() }));
      }

      if (data.communityProofUrl) {
        updateFields.push(`community_proof_file = $${paramIndex++}`);
        values.push(JSON.stringify({ documentUrl: data.communityProofUrl, fileType: 'pdf', uploadedAt: new Date() }));
      }

      updateFields.push(`verification_status = 'pending', updated_at = NOW()`);
      values.push(profileId);

      const query = `
        UPDATE marriage_profiles
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
      `;

      const result = await db.query(query, values);
      return this.formatProfile(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to upload documents: ${error.message}`);
    }
  }

  /**
   * Upload photos
   */
  async uploadPhotos(profileId: string, userId: string, data: UploadPhotosRequest): Promise<MarriageProfile> {
    try {
      // Verify ownership
      const ownerCheck = await db.query(
        'SELECT user_id, photos FROM marriage_profiles WHERE id = $1',
        [profileId]
      );

      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
        throw new Error('Unauthorized');
      }

      const existingPhotos = ownerCheck.rows[0].photos || [];

      const newPhotos = data.photoUrls.map(url => ({
        id: require('uuid').v4(),
        url,
        uploadedAt: new Date(),
        isBlurred: true, // Default to blurred, admin can approve
        watermarked: true,
      }));

      const allPhotos = [...existingPhotos, ...newPhotos];

      const result = await db.query(
        `UPDATE marriage_profiles
         SET photos = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *;`,
        [JSON.stringify(allPhotos), profileId]
      );

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to upload photos: ${error.message}`);
    }
  }

  /**
   * Delete photo
   */
  async deletePhoto(profileId: string, userId: string, photoId: string): Promise<MarriageProfile> {
    try {
      // Verify ownership
      const ownerCheck = await db.query(
        'SELECT user_id, photos FROM marriage_profiles WHERE id = $1',
        [profileId]
      );

      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
        throw new Error('Unauthorized');
      }

      const photos = (ownerCheck.rows[0].photos || []).filter((p: any) => p.id !== photoId);

      const result = await db.query(
        `UPDATE marriage_profiles
         SET photos = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *;`,
        [JSON.stringify(photos), profileId]
      );

      return this.formatProfile(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
  }

  // ==================== REPORT OPERATIONS ====================

  /**
   * Report a profile for abuse/fraud
   */
  async reportProfile(reportedProfileId: string, userId: string, data: ReportProfileRequest): Promise<MarriageReport> {
    try {
      const reportId = require('uuid').v4();

      const query = `
        INSERT INTO marriage_reports (
          id, reported_profile_id, reported_by_user_id, report_type, details, screenshots, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *;
      `;

      const result = await db.query(query, [
        reportId,
        reportedProfileId,
        userId,
        data.reportType,
        data.details,
        JSON.stringify(data.screenshotUrls?.map(url => ({ url, uploadedAt: new Date() })) || []),
        'pending',
      ]);

      return this.formatReport(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to report profile: ${error.message}`);
    }
  }

  /**
   * Get user's sent reports
   */
  async getUserReports(userId: string): Promise<MarriageReport[]> {
    try {
      const result = await db.query(
        `SELECT * FROM marriage_reports
         WHERE reported_by_user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map(r => this.formatReport(r));
    } catch (error) {
      throw new Error(`Failed to get user reports: ${error.message}`);
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private formatProfile(row: any): MarriageProfile {
    return {
      id: row.id,
      userId: row.user_id,
      createdBy: row.created_by,
      createdByUserId: row.created_by_user_id,
      verificationStatus: row.verification_status,
      verifiedAt: row.verified_at,
      verifiedBy: row.verified_by,
      rejectionReason: row.rejection_reason,
      name: row.name,
      gender: row.gender,
      dateOfBirth: row.dob,
      age: row.age,
      height: row.height,
      weight: row.weight,
      complexion: row.complexion,
      education: row.education,
      profession: row.profession,
      income: row.income,
      nativePlace: row.native_place,
      currentLocation: row.current_location,
      caste: row.caste,
      subCaste: row.sub_caste,
      gothram: row.gothram,
      raasi: row.raasi,
      natchathiram: row.natchathiram,
      doshamDetails: row.dosham_details,
      timeOfBirth: row.time_of_birth,
      placeOfBirth: row.place_of_birth,
      maritalStatus: row.marital_status,
      familyDetails: row.family_details,
      expectations: row.expectations,
      photos: row.photos || [],
      horoscopeFile: row.horoscope_file,
      idProofFile: row.id_proof_file,
      communityProofFile: row.community_proof_file,
      contactVisibility: row.contact_visibility,
      profileCompleteness: row.profile_completeness,
      matchScore: row.match_score,
      views: row.views,
      interestsReceived: row.interests_received,
      lastActive: row.updated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private formatInterest(row: any): MarriageInterest {
    return {
      id: row.id,
      senderProfileId: row.sender_profile_id,
      senderUserId: row.sender_user_id,
      receiverProfileId: row.receiver_profile_id,
      receiverUserId: row.receiver_user_id,
      status: row.status,
      message: row.message,
      respondedAt: row.responded_at,
      respondedBy: row.responded_by,
      adminReviewRequested: row.admin_review_requested,
      adminReviewedAt: row.admin_reviewed_at,
      reviewedBy: row.reviewed_by,
      adminReviewNotes: row.admin_review_notes,
      contactDetailsSharedAt: row.contact_details_shared_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private formatReport(row: any): MarriageReport {
    return {
      id: row.id,
      reportedProfileId: row.reported_profile_id,
      reportedByUserId: row.reported_by_user_id,
      reportType: row.report_type,
      details: row.details,
      screenshots: row.screenshots,
      status: row.status,
      adminNotes: row.admin_notes,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      actionTaken: row.action_taken,
      actionTakenAt: row.action_taken_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async createAdminVerificationRecord(profileId: string): Promise<void> {
    const verificationId = require('uuid').v4();

    await db.query(
      `INSERT INTO admin_verifications (id, profile_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [verificationId, profileId]
    );
  }
}
