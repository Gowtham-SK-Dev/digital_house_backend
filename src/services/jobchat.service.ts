// Backend/src/services/jobchat.service.ts
// Job board messaging and chat management

import { db } from '../config/database';
import { JobChat } from '../types/jobboard';

export class JobChatService {
  /**
   * Get or create conversation
   */
  private generateConversationId(userId1: string, userId2: string): string {
    const ids = [userId1, userId2].sort();
    return `${ids[0]}_${ids[1]}`;
  }

  /**
   * Send a message
   */
  async sendMessage(
    employerId: string,
    jobSeekerId: string,
    senderId: string,
    messageText: string,
    jobPostId?: string,
    jobApplicationId?: string,
    attachmentUrls?: string[]
  ): Promise<JobChat> {
    // Verify sender is one of the participants
    if (senderId !== employerId && senderId !== jobSeekerId) {
      throw new Error('Unauthorized sender');
    }

    const senderType = senderId === employerId ? 'employer' : 'seeker';
    const conversationId = this.generateConversationId(employerId, jobSeekerId);

    // Check for external links
    const hasExternalLinks = this.detectExternalLinks(messageText);
    if (hasExternalLinks) {
      // Log for moderation but still allow sending
      console.warn(
        `Message from ${senderId} contains external links in conversation ${conversationId}`
      );
    }

    const result = await db.query(
      `INSERT INTO job_chats (
        conversation_id,
        employer_id,
        job_seeker_id,
        job_post_id,
        job_application_id,
        sender_id,
        sender_type,
        message_text,
        attachment_urls,
        has_external_links
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        conversationId,
        employerId,
        jobSeekerId,
        jobPostId,
        jobApplicationId,
        senderId,
        senderType,
        messageText,
        attachmentUrls || [],
        hasExternalLinks,
      ]
    );

    return result.rows[0];
  }

  /**
   * Get conversation messages
   */
  async getConversation(
    employerId: string,
    jobSeekerId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<JobChat[]> {
    // Verify user is part of conversation
    if (userId !== employerId && userId !== jobSeekerId) {
      throw new Error('Unauthorized');
    }

    const conversationId = this.generateConversationId(employerId, jobSeekerId);

    // Mark all messages as read for the user
    await db.query(
      `UPDATE job_chats 
       SET is_read = true, read_at = NOW()
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [conversationId, userId]
    );

    const result = await db.query(
      `SELECT * FROM job_chats
       WHERE conversation_id = $1 AND is_deleted = false AND is_hidden = false
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );

    // Reverse to show oldest first
    return result.rows.reverse();
  }

  /**
   * Get active conversations for user
   */
  async getUserConversations(userId: string, limit: number = 20): Promise<any[]> {
    const result = await db.query(
      `SELECT DISTINCT ON (conversation_id)
        jc.*,
        CASE 
          WHEN employer_id = $1 THEN job_seeker_id
          ELSE employer_id
        END as other_user_id,
        COUNT(*) OVER (PARTITION BY conversation_id) as message_count,
        COUNT(*) FILTER (WHERE is_read = false AND sender_id != $1) OVER (PARTITION BY conversation_id) as unread_count
       FROM job_chats jc
       WHERE (employer_id = $1 OR job_seeker_id = $1) AND is_deleted = false
       ORDER BY conversation_id, created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Send offer message
   */
  async sendOfferMessage(
    employerId: string,
    jobSeekerId: string,
    jobApplicationId: string,
    offerDetails: string
  ): Promise<JobChat> {
    // Verify employer ownership
    const app = await db.query(
      `SELECT ja.* FROM job_applications ja
       JOIN job_posts jp ON ja.job_post_id = jp.id
       WHERE ja.id = $1 AND ja.job_seeker_id = $2 AND jp.posted_by_user_id = $3`,
      [jobApplicationId, jobSeekerId, employerId]
    );

    if (!app.rows[0]) {
      throw new Error('Application not found or unauthorized');
    }

    const conversationId = this.generateConversationId(employerId, jobSeekerId);

    const result = await db.query(
      `INSERT INTO job_chats (
        conversation_id,
        employer_id,
        job_seeker_id,
        job_application_id,
        sender_id,
        sender_type,
        message_text,
        message_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        conversationId,
        employerId,
        jobSeekerId,
        jobApplicationId,
        employerId,
        'employer',
        offerDetails,
        'offer',
      ]
    );

    // Update application status
    await db.query(
      'UPDATE job_applications SET application_status = $1 WHERE id = $2',
      ['offered', jobApplicationId]
    );

    return result.rows[0];
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await db.query(
      'SELECT * FROM job_chats WHERE id = $1 AND sender_id = $2',
      [messageId, userId]
    );

    if (!message.rows[0]) {
      throw new Error('Message not found or unauthorized');
    }

    await db.query(
      'UPDATE job_chats SET is_deleted = true, deleted_at = NOW() WHERE id = $1',
      [messageId]
    );
  }

  /**
   * Flag message for moderation
   */
  async flagMessage(messageId: string, reason: string): Promise<void> {
    const validReasons = ['spam', 'inappropriate', 'suspicious_link', 'harassment'];

    if (!validReasons.includes(reason)) {
      throw new Error('Invalid reason');
    }

    await db.query(
      `UPDATE job_chats 
       SET is_flagged = true, flagged_reason = $1, flagged_at = NOW()
       WHERE id = $2`,
      [reason, messageId]
    );
  }

  /**
   * Check if two users can direct message
   */
  async canDirectMessage(userId1: string, userId2: string): Promise<boolean> {
    // Both users must be verified/active
    const user1 = await db.query('SELECT verified_at FROM users WHERE id = $1', [userId1]);
    const user2 = await db.query('SELECT verified_at FROM users WHERE id = $1', [userId2]);

    if (!user1.rows[0] || !user2.rows[0]) {
      return false;
    }

    // Check if either is blocked
    const blocked = await db.query(
      `SELECT is_blocked FROM employer_profiles WHERE user_id = $1 OR user_id = $2`,
      [userId1, userId2]
    );

    for (const row of blocked.rows) {
      if (row.is_blocked) {
        return false;
      }
    }

    return true;
  }

  /**
   * Detect external links in message
   */
  private detectExternalLinks(text: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    return urlRegex.test(text);
  }

  /**
   * Detect suspicious patterns
   */
  async moderateMessage(messageText: string): Promise<{ isFlagged: boolean; reason?: string }> {
    // Check for common scam indicators
    if (/bitcoin|crypto|wire transfer|bank account|social security/i.test(messageText)) {
      return { isFlagged: true, reason: 'suspicious_link' };
    }

    // Check for harassment keywords
    if (/\b(abuse|threat|harassment|hate)\b/i.test(messageText)) {
      return { isFlagged: true, reason: 'harassment' };
    }

    return { isFlagged: false };
  }
}

export const jobChatService = new JobChatService();
