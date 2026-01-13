// Business Review Service
import db from '../config/database';
import { CreateReviewRequest, ModerationStatus } from '../types/directory';

export class DirectoryReviewService {
  /**
   * Create review
   */
  async createReview(
    businessId: string,
    reviewerId: string,
    data: CreateReviewRequest
  ): Promise<any> {
    // Check if inquiry exists and is completed
    const inquiryQuery = `
      SELECT * FROM business_inquiries
      WHERE id = $1 AND inquirer_id = $2 AND business_id = $3
      AND (status = 'completed' OR status = 'closed')
      AND deleted_at IS NULL
    `;

    const inquiry = await db.query(inquiryQuery, [data.inquiryId, reviewerId, businessId]);
    if (inquiry.rows.length === 0) {
      throw new Error('You can only review after completing an inquiry');
    }

    // Check if already reviewed this inquiry
    const existingReviewQuery = `
      SELECT id FROM business_reviews
      WHERE inquiry_id = $1 AND deleted_at IS NULL
    `;

    const existing = await db.query(existingReviewQuery, [data.inquiryId]);
    if (existing.rows.length > 0) {
      throw new Error('You have already reviewed this inquiry');
    }

    const query = `
      INSERT INTO business_reviews (
        business_id, reviewer_id, inquiry_id, rating, comment,
        photo_urls, moderation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await db.query(query, [
      businessId,
      reviewerId,
      data.inquiryId,
      Math.max(1, Math.min(5, data.rating)), // Ensure rating is between 1-5
      data.comment || null,
      data.photoUrls ? JSON.stringify(data.photoUrls) : null,
      ModerationStatus.PENDING,
    ]);

    // Create notification
    await this.createNotification(businessId, `New review from customer`, `${data.rating} star review`);

    return result.rows[0];
  }

  /**
   * Get reviews for business
   */
  async getBusinessReviews(businessId: string, includeHidden: boolean = false): Promise<any[]> {
    let query = `
      SELECT br.*, u.full_name, u.profile_image,
        COUNT(CASE WHEN helpful = true THEN 1 END) as helpful_count
      FROM business_reviews br
      LEFT JOIN users u ON br.reviewer_id = u.id
      WHERE br.business_id = $1 AND br.deleted_at IS NULL
    `;

    if (!includeHidden) {
      query += ` AND br.moderation_status = $2`;
    }

    query += ` GROUP BY br.id, u.full_name, u.profile_image
      ORDER BY br.created_at DESC`;

    const params = [businessId];
    if (!includeHidden) params.push(ModerationStatus.APPROVED);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get user reviews
   */
  async getUserReviews(userId: string): Promise<any[]> {
    const query = `
      SELECT br.*, bp.business_name, bp.average_rating
      FROM business_reviews br
      LEFT JOIN business_profiles bp ON br.business_id = bp.id
      WHERE br.reviewer_id = $1 AND br.deleted_at IS NULL
      ORDER BY br.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get review details
   */
  async getReviewDetails(reviewId: string): Promise<any> {
    const query = `
      SELECT br.*, u.full_name, u.profile_image, bp.business_name
      FROM business_reviews br
      LEFT JOIN users u ON br.reviewer_id = u.id
      LEFT JOIN business_profiles bp ON br.business_id = bp.id
      WHERE br.id = $1 AND br.deleted_at IS NULL
    `;

    const result = await db.query(query, [reviewId]);
    return result.rows[0] || null;
  }

  /**
   * Moderate review (admin)
   */
  async moderateReview(
    reviewId: string,
    approve: boolean,
    reason?: string
  ): Promise<any> {
    const status = approve ? ModerationStatus.APPROVED : ModerationStatus.REJECTED;

    const query = `
      UPDATE business_reviews
      SET moderation_status = $1, moderated_by = CURRENT_USER, moderation_reason = $2, moderated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, [status, reason || null, reviewId]);

    if (approve) {
      // Update business average rating
      const review = result.rows[0];
      await db.query(`
        UPDATE business_profiles
        SET average_rating = (
          SELECT AVG(rating) FROM business_reviews
          WHERE business_id = $1 AND moderation_status = $2 AND deleted_at IS NULL
        ),
        total_reviews = (
          SELECT COUNT(*) FROM business_reviews
          WHERE business_id = $1 AND moderation_status = $2 AND deleted_at IS NULL
        )
        WHERE id = $1
      `, [review.business_id, ModerationStatus.APPROVED]);
    }

    return result.rows[0];
  }

  /**
   * Get reviews pending moderation (admin)
   */
  async getPendingReviews(limit: number = 50, offset: number = 0): Promise<any[]> {
    const query = `
      SELECT br.*, u.full_name, bp.business_name
      FROM business_reviews br
      LEFT JOIN users u ON br.reviewer_id = u.id
      LEFT JOIN business_profiles bp ON br.business_id = bp.id
      WHERE br.moderation_status = $1 AND br.deleted_at IS NULL
      ORDER BY br.created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [ModerationStatus.PENDING, limit, offset]);
    return result.rows;
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string, helpful: boolean): Promise<void> {
    const column = helpful ? 'helpful_count' : 'unhelpful_count';
    const query = `
      UPDATE business_reviews
      SET ${column} = ${column} + 1
      WHERE id = $1
    `;

    await db.query(query, [reviewId]);
  }

  /**
   * Hide review (admin)
   */
  async hideReview(reviewId: string, reason?: string): Promise<any> {
    const query = `
      UPDATE business_reviews
      SET moderation_status = $1, moderation_reason = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, [ModerationStatus.HIDDEN, reason || null, reviewId]);
    return result.rows[0];
  }

  /**
   * Delete review (soft)
   */
  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    const review = await this.getReviewDetails(reviewId);
    if (!review || review.reviewer_id !== userId) {
      return false;
    }

    const query = `
      UPDATE business_reviews
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await db.query(query, [reviewId]);
    return true;
  }

  /**
   * Get review statistics
   */
  async getReviewStats(businessId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM business_reviews
      WHERE business_id = $1 AND moderation_status = $2 AND deleted_at IS NULL
    `;

    const result = await db.query(query, [businessId, ModerationStatus.APPROVED]);
    return result.rows[0];
  }

  /**
   * Check moderation issues
   */
  detectModerationIssues(comment: string): { hasIssues: boolean; flags: string[] } {
    const flags: string[] = [];

    // Check for external links
    if (/(http|https):\/\/|www\./gi.test(comment)) {
      flags.push('external_links');
    }

    // Check for spam keywords
    const spamKeywords = ['click here', 'buy now', 'visit us'];
    if (spamKeywords.some((keyword) => comment.toLowerCase().includes(keyword))) {
      flags.push('promotional_content');
    }

    // Check for harassment
    const harmfulWords = ['hate', 'kill', 'destroy'];
    if (harmfulWords.some((word) => comment.toLowerCase().includes(word))) {
      flags.push('potentially_harmful');
    }

    // Check for excessive repetition
    if (/(.)\1{3,}/.test(comment)) {
      flags.push('excessive_repetition');
    }

    return {
      hasIssues: flags.length > 0,
      flags,
    };
  }

  /**
   * Create notification
   */
  private async createNotification(recipientId: string, title: string, message: string): Promise<void> {
    const query = `
      INSERT INTO business_notifications (
        recipient_id, notification_type, title, message
      ) VALUES ($1, $2, $3, $4)
    `;

    await db.query(query, [recipientId, 'review', title, message]);
  }
}

export default new DirectoryReviewService();
