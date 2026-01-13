// Business Inquiry Service
import db from '../config/database';
import { InquiryStatus, CreateInquiryRequest } from '../types/directory';

export class DirectoryInquiryService {
  /**
   * Create new inquiry
   */
  async createInquiry(
    businessId: string,
    inquirerId: string,
    data: CreateInquiryRequest
  ): Promise<any> {
    // Check if user already contacted in last 24 hours
    const existingQuery = `
      SELECT id FROM business_inquiries
      WHERE business_id = $1 AND inquirer_id = $2
      AND created_at > NOW() - INTERVAL '24 hours'
      AND deleted_at IS NULL
    `;

    const existing = await db.query(existingQuery, [businessId, inquirerId]);
    if (existing.rows.length > 0) {
      throw new Error('You have already contacted this business within 24 hours');
    }

    const query = `
      INSERT INTO business_inquiries (
        business_id, inquirer_id, service_id, inquiry_type, message, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [
      businessId,
      inquirerId,
      data.serviceId || null,
      data.inquiryType,
      data.message,
      InquiryStatus.PENDING,
    ]);

    // Increment inquiry count
    await db.query('UPDATE business_profiles SET total_inquiries = total_inquiries + 1 WHERE id = $1', [
      businessId,
    ]);

    // Create notification
    await this.createNotification(businessId, inquirerId, `New ${data.inquiryType} inquiry`, data.message);

    return result.rows[0];
  }

  /**
   * Get inquiry details
   */
  async getInquiry(inquiryId: string): Promise<any> {
    const query = `
      SELECT bi.*, bp.business_name, bp.phone, bp.email
      FROM business_inquiries bi
      LEFT JOIN business_profiles bp ON bi.business_id = bp.id
      WHERE bi.id = $1 AND bi.deleted_at IS NULL
    `;

    const result = await db.query(query, [inquiryId]);
    return result.rows[0] || null;
  }

  /**
   * Get inquiries received by business
   */
  async getBusinessInquiries(businessId: string, status?: string): Promise<any[]> {
    let query = `
      SELECT bi.*, u.full_name, u.profile_image
      FROM business_inquiries bi
      LEFT JOIN users u ON bi.inquirer_id = u.id
      WHERE bi.business_id = $1 AND bi.deleted_at IS NULL
    `;

    const params = [businessId];

    if (status) {
      query += ` AND bi.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY bi.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get inquiries sent by user
   */
  async getUserInquiries(userId: string): Promise<any[]> {
    const query = `
      SELECT bi.*, bp.business_name, bp.phone, bp.email, bp.average_rating
      FROM business_inquiries bi
      LEFT JOIN business_profiles bp ON bi.business_id = bp.id
      WHERE bi.inquirer_id = $1 AND bi.deleted_at IS NULL
      ORDER BY bi.created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Respond to inquiry
   */
  async respondToInquiry(inquiryId: string, businessId: string, responseMessage: string): Promise<any> {
    const inquiry = await this.getInquiry(inquiryId);
    if (!inquiry || inquiry.business_id !== businessId) {
      return null;
    }

    const query = `
      UPDATE business_inquiries
      SET status = $1, response_message = $2, responded_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, [InquiryStatus.RESPONDED, responseMessage, inquiryId]);

    // Create notification for inquirer
    if (inquiry.inquirer_id) {
      await this.createNotification(
        inquiry.inquirer_id,
        businessId,
        `${inquiry.business_name} responded to your inquiry`,
        responseMessage
      );
    }

    return result.rows[0];
  }

  /**
   * Mark inquiry as completed
   */
  async markCompleted(inquiryId: string, businessId: string): Promise<any> {
    const inquiry = await this.getInquiry(inquiryId);
    if (!inquiry || inquiry.business_id !== businessId) {
      return null;
    }

    const query = `
      UPDATE business_inquiries
      SET status = $1, can_review = true
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [InquiryStatus.COMPLETED, inquiryId]);
    return result.rows[0];
  }

  /**
   * Share contact with inquirer
   */
  async shareContact(inquiryId: string, businessId: string): Promise<any> {
    const inquiry = await this.getInquiry(inquiryId);
    if (!inquiry || inquiry.business_id !== businessId) {
      return null;
    }

    const query = `
      UPDATE business_inquiries
      SET contact_shared = true
      WHERE id = $1
      RETURNING contact_shared
    `;

    const result = await db.query(query, [inquiryId]);
    return result.rows[0];
  }

  /**
   * Detect spam/scam in message
   */
  detectSpamContent(message: string): { isSpam: boolean; flags: string[] } {
    const flags: string[] = [];

    // Check for external links
    if (/(http|https):\/\/|www\./gi.test(message)) {
      flags.push('external_links');
    }

    // Check for multiple phone numbers
    const phonePattern = /(\d{10}|\d{3}-\d{3}-\d{4})/g;
    const matches = message.match(phonePattern);
    if (matches && matches.length > 1) {
      flags.push('multiple_phone_numbers');
    }

    // Check for WhatsApp numbers
    if (/whatsapp|wa\.|watsapp/gi.test(message)) {
      flags.push('whatsapp_promotion');
    }

    // Check for all caps (spam indicator)
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.5) {
      flags.push('excessive_caps');
    }

    return {
      isSpam: flags.length > 0,
      flags,
    };
  }

  /**
   * Flag inquiry for review
   */
  async flagInquiry(inquiryId: string, reason: string): Promise<void> {
    const query = `
      UPDATE business_inquiries
      SET conversation_data = jsonb_set(
        conversation_data,
        '{flagged}',
        'true'::jsonb
      ),
      conversation_data = jsonb_set(
        conversation_data,
        '{flag_reason}',
        to_jsonb($1)
      )
      WHERE id = $2
    `;

    await db.query(query, [reason, inquiryId]);
  }

  /**
   * Create notification
   */
  private async createNotification(recipientId: string, businessId: string, title: string, message: string): Promise<void> {
    const query = `
      INSERT INTO business_notifications (
        recipient_id, business_id, notification_type, title, message
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    await db.query(query, [recipientId, businessId, 'inquiry', title, message]);
  }

  /**
   * Get inquiry statistics
   */
  async getInquiryStats(businessId: string): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = $1 THEN 1 END) as pending,
        COUNT(CASE WHEN status = $2 THEN 1 END) as responded,
        COUNT(CASE WHEN status = $3 THEN 1 END) as completed,
        COUNT(DISTINCT DATE(created_at)) as days_with_inquiries
      FROM business_inquiries
      WHERE business_id = $4 AND deleted_at IS NULL
    `;

    const result = await db.query(query, [
      InquiryStatus.PENDING,
      InquiryStatus.RESPONDED,
      InquiryStatus.COMPLETED,
      businessId,
    ]);

    return result.rows[0];
  }

  /**
   * Close inquiry
   */
  async closeInquiry(inquiryId: string): Promise<any> {
    const query = `
      UPDATE business_inquiries
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [InquiryStatus.CLOSED, inquiryId]);
    return result.rows[0];
  }
}

export default new DirectoryInquiryService();
