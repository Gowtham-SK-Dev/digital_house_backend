// Secure Chat Routes - User Endpoints (DM System)
import { Router, Request, Response } from 'express';
import { authenticateToken, validateRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { ChatContextType, MessageType, ReportType } from '../types/chat';

const router = Router();

// ============================================================================
// CHAT MANAGEMENT
// ============================================================================

/**
 * POST /api/secure-chat/initiate
 * Initiate a secure chat with another user
 * Body: { otherUserId, contextType, contextId?, initialMessage? }
 */
router.post('/initiate', authenticateToken, validateRequest, async (req: Request, res: Response) => {
  try {
    const { otherUserId, contextType, contextId, initialMessage } = req.body;
    const userId = req.user.userId;

    // Validate context type
    if (!Object.values(ChatContextType).includes(contextType)) {
      return res.status(400).json({ success: false, error: 'INVALID_CONTEXT_TYPE' });
    }

    // Prevent self-chat
    if (userId === otherUserId) {
      return res.status(400).json({ success: false, error: 'CANNOT_CHAT_WITH_SELF' });
    }

    // Check if blocked
    const blockedQuery = `
      SELECT * FROM user_blocks 
      WHERE blocker_id = $1 AND blocked_id = $2 AND is_active = TRUE
      AND (is_permanent = TRUE OR expires_at > CURRENT_TIMESTAMP)
    `;
    const blockedResult = await pool.query(blockedQuery, [userId, otherUserId]);
    if (blockedResult.rows.length > 0) {
      return res.status(403).json({ success: false, error: 'CHAT_BLOCKED' });
    }

    // Validate context eligibility
    if (contextType === ChatContextType.MARRIAGE) {
      const interestQuery = `
        SELECT * FROM marriage_interests 
        WHERE (sender_id = $1 AND receiver_id = $2 AND status = 'accepted')
        OR (sender_id = $2 AND receiver_id = $1 AND status = 'accepted')
      `;
      const interest = await pool.query(interestQuery, [userId, otherUserId]);
      if (interest.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'MARRIAGE_INTEREST_NOT_ACCEPTED' });
      }
    } else if (contextType === ChatContextType.JOB && contextId) {
      const appQuery = `
        SELECT * FROM job_applications WHERE id = $1 AND status = 'shortlisted'
      `;
      const app = await pool.query(appQuery, [contextId]);
      if (app.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'JOB_APPLICATION_NOT_SHORTLISTED' });
      }
    } else if (contextType === ChatContextType.BUSINESS && contextId) {
      const inquiryQuery = `
        SELECT * FROM business_inquiries WHERE id = $1 AND status != 'rejected'
      `;
      const inquiry = await pool.query(inquiryQuery, [contextId]);
      if (inquiry.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'BUSINESS_INQUIRY_INVALID' });
      }
    }

    // Create or get existing chat
    const normalizedUserA = userId < otherUserId ? userId : otherUserId;
    const normalizedUserB = userId < otherUserId ? otherUserId : userId;

    const query = `
      INSERT INTO chat_rooms (user_id_a, user_id_b, context_type, context_id, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (
        CASE WHEN $1 < $2 THEN $1 ELSE $2 END,
        CASE WHEN $1 < $2 THEN $2 ELSE $1 END,
        context_type,
        context_id
      ) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING chat_id
    `;

    const result = await pool.query(query, [
      normalizedUserA, normalizedUserB, contextType, contextId, 'active'
    ]);
    const chatId = result.rows[0].chat_id;

    // Send initial message if provided
    if (initialMessage) {
      const msgQuery = `
        INSERT INTO chat_messages (chat_id, sender_id, message_type, content, encrypted)
        VALUES ($1, $2, $3, $4, TRUE)
      `;
      await pool.query(msgQuery, [chatId, userId, MessageType.TEXT, initialMessage]);
    }

    res.status(201).json({
      success: true,
      chatId,
      message: 'Chat initiated successfully'
    });
  } catch (error) {
    console.error('Chat initiation error:', error);
    res.status(500).json({ success: false, error: 'CHAT_INITIATION_FAILED' });
  }
});

/**
 * GET /api/secure-chat/inbox
 * Get user's chat list
 */
router.get('/inbox', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT 
        cr.chat_id, cr.user_id_a, cr.user_id_b, cr.context_type, cr.status,
        cr.muted_by, cr.blocked_by, cr.last_message_at, cr.message_count,
        CASE WHEN cr.user_id_a = $1 THEN cr.unread_count_a ELSE cr.unread_count_b END as unread_count,
        u.name, u.avatar_url
      FROM chat_rooms cr
      JOIN users u ON (
        CASE WHEN cr.user_id_a = $1 THEN cr.user_id_b ELSE cr.user_id_a END = u.user_id
      )
      WHERE ($1 = cr.user_id_a OR $1 = cr.user_id_b) AND cr.is_deleted = FALSE
      ORDER BY cr.last_message_at DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    res.json({
      success: true,
      chats: result.rows,
      totalChats: result.rows.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Inbox fetch error:', error);
    res.status(500).json({ success: false, error: 'FETCH_CHATS_FAILED' });
  }
});

/**
 * GET /api/secure-chat/:chatId/messages
 * Get messages in a chat
 */
router.get('/:chatId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify user has access to this chat
    const accessQuery = `SELECT * FROM chat_rooms WHERE chat_id = $1 AND (user_id_a = $2 OR user_id_b = $2)`;
    const accessResult = await pool.query(accessQuery, [chatId, userId]);
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED_ACCESS' });
    }

    const query = `
      SELECT * FROM chat_messages
      WHERE chat_id = $1 AND is_deleted = FALSE
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [chatId, limit, offset]);

    // Mark as read
    await pool.query(`
      UPDATE chat_messages 
      SET read_at = CURRENT_TIMESTAMP
      WHERE chat_id = $1 AND sender_id != $2 AND read_at IS NULL
    `, [chatId, userId]);

    // Update unread count
    const chatQuery = `SELECT user_id_a, user_id_b FROM chat_rooms WHERE chat_id = $1`;
    const chatResult = await pool.query(chatQuery, [chatId]);
    if (chatResult.rows[0].user_id_a === userId) {
      await pool.query(`UPDATE chat_rooms SET unread_count_a = 0 WHERE chat_id = $1`, [chatId]);
    } else {
      await pool.query(`UPDATE chat_rooms SET unread_count_b = 0 WHERE chat_id = $1`, [chatId]);
    }

    res.json({
      success: true,
      messages: result.rows.reverse(),
      totalMessages: result.rows.length
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ success: false, error: 'FETCH_MESSAGES_FAILED' });
  }
});

// ============================================================================
// MESSAGE SENDING
// ============================================================================

/**
 * POST /api/secure-chat/:chatId/message
 * Send a message
 */
router.post('/:chatId/message', authenticateToken, validateRequest, async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { messageType, content, replyToId } = req.body;
    const senderId = req.user.userId;

    // Validate message type
    if (!Object.values(MessageType).includes(messageType)) {
      return res.status(400).json({ success: false, error: 'INVALID_MESSAGE_TYPE' });
    }

    // Validate content
    if (!content || content.length === 0 || content.length > 5000) {
      return res.status(400).json({ success: false, error: 'INVALID_MESSAGE_LENGTH' });
    }

    // Check chat status
    const chatQuery = `SELECT status, muted_by FROM chat_rooms WHERE chat_id = $1`;
    const chatResult = await pool.query(chatQuery, [chatId]);
    if (chatResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'CHAT_NOT_FOUND' });
    }

    const chat = chatResult.rows[0];
    if (chat.status === 'blocked' || chat.status === 'closed') {
      return res.status(403).json({ success: false, error: 'CHAT_INACTIVE' });
    }

    if (chat.muted_by === senderId) {
      return res.status(403).json({ success: false, error: 'USER_MUTED_IN_CHAT' });
    }

    // Detect safety issues (simplified)
    const phonePattern = /\b(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/;
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const upiPattern = /[a-zA-Z0-9._-]+@[a-zA-Z0-9]+/;
    const linkPattern = /(https?:\/\/|www\.)/i;

    const hasPhone = phonePattern.test(content);
    const hasEmail = emailPattern.test(content);
    const hasUpi = upiPattern.test(content);
    const hasLink = linkPattern.test(content);

    let isFlagged = hasPhone || hasEmail || hasUpi || hasLink;

    // Send message
    const msgQuery = `
      INSERT INTO chat_messages (
        chat_id, sender_id, message_type, content, encrypted, reply_to_id,
        is_flagged, contains_phone, contains_email, contains_upi, contains_external_link
      ) VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9, $10)
      RETURNING message_id
    `;

    const result = await pool.query(msgQuery, [
      chatId, senderId, messageType, content, replyToId || null,
      isFlagged, hasPhone, hasEmail, hasUpi, hasLink
    ]);

    const messageId = result.rows[0].message_id;

    // Update chat
    await pool.query(`
      UPDATE chat_rooms 
      SET last_message_id = $1, last_message_at = CURRENT_TIMESTAMP, message_count = message_count + 1
      WHERE chat_id = $2
    `, [messageId, chatId]);

    res.status(201).json({
      success: true,
      messageId,
      isFlagged,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'SEND_MESSAGE_FAILED' });
  }
});

/**
 * DELETE /api/secure-chat/message/:messageId
 * Delete a message
 */
router.delete('/message/:messageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const msgQuery = `SELECT sender_id FROM chat_messages WHERE message_id = $1`;
    const msgResult = await pool.query(msgQuery, [messageId]);

    if (msgResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'MESSAGE_NOT_FOUND' });
    }

    if (msgResult.rows[0].sender_id !== userId) {
      return res.status(403).json({ success: false, error: 'CANNOT_DELETE_OTHER_MESSAGE' });
    }

    await pool.query(`
      UPDATE chat_messages SET is_hidden = TRUE, is_retracted = TRUE WHERE message_id = $1
    `, [messageId]);

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, error: 'DELETE_MESSAGE_FAILED' });
  }
});

// ============================================================================
// BLOCKING
// ============================================================================

/**
 * POST /api/secure-chat/block/:userId
 * Block a user
 */
router.post('/block/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { blockReason } = req.body;
    const blockerId = req.user.userId;

    if (blockerId === userId) {
      return res.status(400).json({ success: false, error: 'CANNOT_BLOCK_SELF' });
    }

    const query = `
      INSERT INTO user_blocks (blocker_id, blocked_id, block_reason, is_permanent)
      VALUES ($1, $2, $3, TRUE)
      RETURNING block_id
    `;

    const result = await pool.query(query, [blockerId, userId, blockReason || null]);

    // Update existing chats
    await pool.query(`
      UPDATE chat_rooms 
      SET status = 'blocked', blocked_by = $1, blocked_at = CURRENT_TIMESTAMP
      WHERE (user_id_a = $1 AND user_id_b = $2) OR (user_id_a = $2 AND user_id_b = $1)
    `, [blockerId, userId]);

    res.status(201).json({
      success: true,
      blockId: result.rows[0].block_id,
      message: 'User blocked'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, error: 'BLOCK_USER_FAILED' });
  }
});

/**
 * POST /api/secure-chat/unblock/:userId
 * Unblock a user
 */
router.post('/unblock/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const blockerId = req.user.userId;

    await pool.query(`
      UPDATE user_blocks 
      SET is_active = FALSE, unblocked_at = CURRENT_TIMESTAMP
      WHERE blocker_id = $1 AND blocked_id = $2
    `, [blockerId, userId]);

    res.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ success: false, error: 'UNBLOCK_USER_FAILED' });
  }
});

/**
 * GET /api/secure-chat/blocks
 * Get user's block list
 */
router.get('/blocks/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user.userId;

    const query = `
      SELECT ub.block_id, ub.blocked_id, u.name, u.avatar_url, ub.block_reason, ub.created_at
      FROM user_blocks ub
      JOIN users u ON ub.blocked_id = u.user_id
      WHERE ub.blocker_id = $1 AND ub.is_active = TRUE
      ORDER BY ub.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      blockedUsers: result.rows,
      totalBlocked: result.rows.length
    });
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({ success: false, error: 'FETCH_BLOCK_LIST_FAILED' });
  }
});

// ============================================================================
// REPORTING
// ============================================================================

/**
 * POST /api/secure-chat/report
 * Report a chat or message
 */
router.post('/report', authenticateToken, validateRequest, async (req: Request, res: Response) => {
  try {
    const { chatId, messageId, reportedUserId, reportType, description, screenshotUrl } = req.body;
    const reportedBy = req.user.userId;

    if (!Object.values(ReportType).includes(reportType)) {
      return res.status(400).json({ success: false, error: 'INVALID_REPORT_TYPE' });
    }

    if (reportedBy === reportedUserId) {
      return res.status(400).json({ success: false, error: 'CANNOT_REPORT_SELF' });
    }

    // Check for recent similar reports
    const existingQuery = `
      SELECT * FROM chat_reports 
      WHERE reported_by = $1 AND chat_id = $2 
      AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      AND status != 'dismissed'
    `;
    const existing = await pool.query(existingQuery, [reportedBy, chatId]);

    if (existing.rows.length > 0) {
      return res.status(429).json({ success: false, error: 'ALREADY_REPORTED_RECENTLY' });
    }

    const query = `
      INSERT INTO chat_reports (
        chat_id, message_id, reported_by, reported_user, report_type, 
        description, screenshot_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING report_id
    `;

    const result = await pool.query(query, [
      chatId, messageId || null, reportedBy, reportedUserId,
      reportType, description, screenshotUrl || null
    ]);

    res.status(201).json({
      success: true,
      reportId: result.rows[0].report_id,
      message: 'Report submitted'
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, error: 'REPORT_FAILED' });
  }
});

/**
 * GET /api/secure-chat/report/:reportId
 * Get report details
 */
router.get('/report/:reportId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const query = `SELECT * FROM chat_reports WHERE report_id = $1`;
    const result = await pool.query(query, [reportId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND' });
    }

    res.json({
      success: true,
      report: result.rows[0]
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'FETCH_REPORT_FAILED' });
  }
});

export default router;
