// Chat Moderation Service - Safety & Abuse Management
import { pool } from '../config/database';
import { ModerationAction, ModerationLog } from '../types/chat';

export class ChatModerationService {
  // ========== MESSAGE MODERATION ==========

  /**
   * Hide a message from the chat (admin action)
   */
  async hideMessage(messageId: string, adminId: string, reason: string): Promise<void> {
    try {
      const msgQuery = `SELECT chat_id, sender_id FROM chat_messages WHERE message_id = $1`;
      const msgResult = await pool.query(msgQuery, [messageId]);
      
      if (msgResult.rows.length === 0) {
        throw new Error('MESSAGE_NOT_FOUND');
      }

      const { chat_id, sender_id } = msgResult.rows[0];

      // Hide message
      await pool.query(`
        UPDATE chat_messages 
        SET is_deleted = TRUE
        WHERE message_id = $1
      `, [messageId]);

      // Log moderation action
      await this.logModerationAction(
        adminId,
        'message',
        messageId,
        ModerationAction.MESSAGE_HIDE,
        reason,
        null,
        chat_id,
        messageId
      );

      // Add strike to user
      await this.addStrike(sender_id, adminId, `Message hidden: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to hide message: ${error.message}`);
    }
  }

  /**
   * Delete a message permanently (admin action)
   */
  async deleteMessage(messageId: string, adminId: string, reason: string): Promise<void> {
    try {
      const msgQuery = `SELECT chat_id, sender_id FROM chat_messages WHERE message_id = $1`;
      const msgResult = await pool.query(msgQuery, [messageId]);
      
      if (msgResult.rows.length === 0) {
        throw new Error('MESSAGE_NOT_FOUND');
      }

      const { chat_id, sender_id } = msgResult.rows[0];

      // Mark as deleted
      await pool.query(`
        UPDATE chat_messages 
        SET is_deleted = TRUE, is_retracted = TRUE
        WHERE message_id = $1
      `, [messageId]);

      // Log action
      await this.logModerationAction(
        adminId,
        'message',
        messageId,
        ModerationAction.MESSAGE_DELETE,
        reason,
        null,
        chat_id,
        messageId
      );

      await this.addStrike(sender_id, adminId, `Message deleted: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  // ========== CHAT MODERATION ==========

  /**
   * Send warning to user about chat behavior
   */
  async warnUser(
    userId: string,
    adminId: string,
    chatId: string,
    reason: string
  ): Promise<void> {
    try {
      // Log warning
      await this.logModerationAction(
        adminId,
        'chat_room',
        chatId,
        ModerationAction.CHAT_WARNING,
        reason,
        null,
        chatId
      );

      // Add strike
      await this.addStrike(userId, adminId, `Chat warning: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to warn user: ${error.message}`);
    }
  }

  /**
   * Temporarily mute a user in a chat
   */
  async muteUser(
    userId: string,
    adminId: string,
    chatId: string,
    durationMinutes: number,
    reason: string
  ): Promise<void> {
    try {
      // Update chat status to muted
      await pool.query(`
        UPDATE chat_rooms
        SET status = 'muted', muted_by = $1, muted_at = CURRENT_TIMESTAMP
        WHERE chat_id = $2 AND (user_id_a = $3 OR user_id_b = $3)
      `, [userId, chatId, userId]);

      // Log action
      await this.logModerationAction(
        adminId,
        'chat_room',
        chatId,
        ModerationAction.CHAT_MUTE,
        reason,
        durationMinutes,
        chatId
      );

      // Add strike
      await this.addStrike(userId, adminId, `Chat muted for ${durationMinutes} min: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to mute user: ${error.message}`);
    }
  }

  /**
   * Close a chat as admin action
   */
  async closeChat(
    chatId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      // Get chat participants
      const chatQuery = `SELECT user_id_a, user_id_b FROM chat_rooms WHERE chat_id = $1`;
      const chatResult = await pool.query(chatQuery, [chatId]);
      
      if (chatResult.rows.length === 0) {
        throw new Error('CHAT_NOT_FOUND');
      }

      const { user_id_a, user_id_b } = chatResult.rows[0];

      // Close chat
      await pool.query(`
        UPDATE chat_rooms 
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP, is_deleted = TRUE
        WHERE chat_id = $1
      `, [chatId]);

      // Log action
      await this.logModerationAction(
        adminId,
        'chat_room',
        chatId,
        ModerationAction.CHAT_CLOSE,
        reason,
        null,
        chatId
      );

      // Add strikes to both users
      await this.addStrike(user_id_a, adminId, `Chat closed by admin: ${reason}`);
      await this.addStrike(user_id_b, adminId, `Chat closed by admin: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to close chat: ${error.message}`);
    }
  }

  // ========== USER PUNISHMENTS ==========

  /**
   * Temporarily ban a user from chatting
   */
  async banUserTemporarily(
    userId: string,
    adminId: string,
    durationMinutes: number,
    reason: string
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Log action
      await this.logModerationAction(
        adminId,
        'user',
        userId,
        ModerationAction.USER_MUTE,
        reason,
        durationMinutes
      );

      // Create temporary block from chatting
      await pool.query(`
        INSERT INTO user_blocks (blocker_id, blocked_id, block_type, is_permanent, expires_at, blocked_by_admin)
        VALUES ('ADMIN', $1, 'admin', FALSE, $2, $3)
      `, [userId, expiresAt, adminId]);

      // Add strike
      await this.addStrike(userId, adminId, `Temporary ban for ${durationMinutes} min: ${reason}`);
    } catch (error) {
      throw new Error(`Failed to ban user: ${error.message}`);
    }
  }

  /**
   * Permanently ban a user from chatting
   */
  async banUserPermanently(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      // Log action
      await this.logModerationAction(
        adminId,
        'user',
        userId,
        ModerationAction.USER_BAN,
        reason
      );

      // Block from all chats
      await pool.query(`
        INSERT INTO user_blocks (blocker_id, blocked_id, block_type, is_permanent, blocked_by_admin)
        VALUES ('ADMIN', $1, 'admin', TRUE, $2)
      `, [userId, adminId]);

      // Close all active chats
      await pool.query(`
        UPDATE chat_rooms 
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP, is_deleted = TRUE
        WHERE (user_id_a = $1 OR user_id_b = $1) AND status != 'closed'
      `, [userId]);

      // Add multiple strikes
      await this.addStrike(userId, adminId, `Permanent ban: ${reason}`, 3);
    } catch (error) {
      throw new Error(`Failed to permanently ban user: ${error.message}`);
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(userId: string, adminId: string, reason: string): Promise<void> {
    try {
      // Remove admin blocks
      await pool.query(`
        UPDATE user_blocks 
        SET is_active = FALSE, unblocked_at = CURRENT_TIMESTAMP
        WHERE (blocker_id = 'ADMIN' OR blocked_by_admin IS NOT NULL) 
        AND blocked_id = $1 AND is_active = TRUE
      `, [userId]);

      // Log action
      await this.logModerationAction(
        adminId,
        'user',
        userId,
        ModerationAction.USER_UNBAN,
        reason
      );
    } catch (error) {
      throw new Error(`Failed to unban user: ${error.message}`);
    }
  }

  // ========== STRIKES & ESCALATION ==========

  /**
   * Add a strike to a user (for tracking violations)
   */
  async addStrike(
    userId: string,
    adminId: string,
    reason: string,
    strikeCount: number = 1
  ): Promise<number> {
    try {
      const result = await pool.query(`
        INSERT INTO chat_moderation_logs (admin_id, target_type, target_id, action, reason, user_strike_count)
        VALUES ($1, 'user', $2, $3, $4, $5)
        RETURNING user_strike_count
      `, [adminId, userId, ModerationAction.USER_WARN, reason, strikeCount]);

      // Check if auto-escalation needed (3+ strikes = ban)
      const strikesQuery = `
        SELECT COUNT(*) as strike_count FROM chat_moderation_logs 
        WHERE target_type = 'user' AND target_id = $1 
        AND action IN ('user_warn', 'chat_warning')
      `;
      const strikesResult = await pool.query(strikesQuery, [userId]);
      const totalStrikes = parseInt(strikesResult.rows[0].strike_count) || 0;

      if (totalStrikes >= 3) {
        // Auto-ban after 3 strikes
        await this.banUserTemporarily(userId, adminId, 24 * 60, 'Automatic ban after 3 strikes');
      }

      return totalStrikes;
    } catch (error) {
      throw new Error(`Failed to add strike: ${error.message}`);
    }
  }

  /**
   * Get user's strike history
   */
  async getUserStrikes(userId: string): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM chat_moderation_logs
        WHERE target_type = 'user' AND target_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get user strikes: ${error.message}`);
    }
  }

  // ========== LOGGING ==========

  /**
   * Log a moderation action to the audit trail
   */
  async logModerationAction(
    adminId: string,
    targetType: 'chat_room' | 'message' | 'user',
    targetId: string,
    action: ModerationAction,
    reason: string,
    durationMinutes?: number,
    relatedChatId?: string,
    relatedMessageId?: string
  ): Promise<string> {
    try {
      const query = `
        INSERT INTO chat_moderation_logs (
          admin_id, target_type, target_id, action, reason, 
          duration_minutes, related_chat_id, related_message_id, appeal_allowed, appeal_deadline
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP + INTERVAL '7 days')
        RETURNING log_id
      `;

      const result = await pool.query(query, [
        adminId, targetType, targetId, action, reason,
        durationMinutes || null, relatedChatId || null, relatedMessageId || null
      ]);

      return result.rows[0].log_id;
    } catch (error) {
      throw new Error(`Failed to log moderation action: ${error.message}`);
    }
  }

  /**
   * Get moderation logs for a user
   */
  async getUserModerationLogs(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM chat_moderation_logs
        WHERE target_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get moderation logs: ${error.message}`);
    }
  }

  /**
   * Appeal a moderation action
   */
  async appealAction(
    logId: string,
    userId: string,
    appealReason: string
  ): Promise<void> {
    try {
      const query = `
        UPDATE chat_moderation_logs 
        SET appealed_at = CURRENT_TIMESTAMP, appeal_decision = 'pending'
        WHERE log_id = $1 AND appeal_allowed = TRUE AND appeal_deadline > CURRENT_TIMESTAMP
      `;

      const result = await pool.query(query, [logId]);
      if (result.rowCount === 0) {
        throw new Error('APPEAL_NOT_ALLOWED_OR_EXPIRED');
      }
    } catch (error) {
      throw new Error(`Failed to appeal: ${error.message}`);
    }
  }

  /**
   * Resolve an appeal
   */
  async resolveAppeal(
    logId: string,
    decision: 'upheld' | 'overturned',
    reviewerAdminId: string,
    notes: string
  ): Promise<void> {
    try {
      await pool.query(`
        UPDATE chat_moderation_logs 
        SET appeal_decision = $1, appeal_reviewed_by = $2, notes = $3
        WHERE log_id = $4
      `, [decision, reviewerAdminId, notes, logId]);
    } catch (error) {
      throw new Error(`Failed to resolve appeal: ${error.message}`);
    }
  }

  // ========== ANALYTICS ==========

  /**
   * Get moderation dashboard statistics
   */
  async getDashboardStats(): Promise<any> {
    try {
      const stats: any = {};

      // Total reports
      const reportsQuery = `SELECT COUNT(*) as count FROM chat_reports`;
      stats.totalReports = (await pool.query(reportsQuery)).rows[0].count;

      // Pending reports
      const pendingQuery = `SELECT COUNT(*) as count FROM chat_reports WHERE status = 'pending'`;
      stats.pendingReports = (await pool.query(pendingQuery)).rows[0].count;

      // Flagged messages
      const flaggedQuery = `SELECT COUNT(*) as count FROM chat_messages WHERE is_flagged = TRUE`;
      stats.flaggedMessages = (await pool.query(flaggedQuery)).rows[0].count;

      // Reports by type
      const typeQuery = `SELECT report_type, COUNT(*) as count FROM chat_reports GROUP BY report_type`;
      stats.reportsByType = (await pool.query(typeQuery)).rows;

      // Top offenders
      const offendersQuery = `
        SELECT target_id, COUNT(*) as strikes FROM chat_moderation_logs 
        WHERE target_type = 'user' GROUP BY target_id ORDER BY strikes DESC LIMIT 10
      `;
      stats.topOffenders = (await pool.query(offendersQuery)).rows;

      return stats;
    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error.message}`);
    }
  }
}

export default new ChatModerationService();
