// Admin Chat Moderation Routes
import { Router, Request, Response } from 'express';
import { authenticateToken, isAdmin, validateRequest } from '../middleware/auth';
import { pool } from '../config/database';

const router = Router();

// Middleware to ensure admin
router.use(authenticateToken);
router.use(isAdmin);

// ============================================================================
// CHAT OVERSIGHT
// ============================================================================

/**
 * GET /api/admin/chat/reported
 * Get all reported chats
 */
router.get('/reported', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT cr.*, u_a.name as user_a_name, u_b.name as user_b_name,
        COUNT(cr2.report_id) as report_count
      FROM chat_rooms cr
      LEFT JOIN chat_reports cr2 ON cr.chat_id = cr2.chat_id
      JOIN users u_a ON cr.user_id_a = u_a.user_id
      JOIN users u_b ON cr.user_id_b = u_b.user_id
      WHERE cr.status = 'reported' OR cr2.report_id IS NOT NULL
      GROUP BY cr.chat_id, u_a.name, u_b.name
      ORDER BY report_count DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      reportedChats: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Reported chats error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

/**
 * GET /api/admin/chat/flagged-messages
 * Get all flagged messages
 */
router.get('/flagged-messages', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT cm.*, cr.user_id_a, cr.user_id_b, u.name as sender_name
      FROM chat_messages cm
      JOIN chat_rooms cr ON cm.chat_id = cr.chat_id
      JOIN users u ON cm.sender_id = u.user_id
      WHERE cm.is_flagged = TRUE
      ORDER BY cm.sent_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    res.json({
      success: true,
      flaggedMessages: result.rows,
      limit,
      offset
    });
  } catch (error) {
    console.error('Flagged messages error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

// ============================================================================
// REPORT MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/chat/reports/pending
 * Get pending reports for review
 */
router.get('/reports/pending', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT cr.*, u_reporter.name as reporter_name, u_offender.name as offender_name
      FROM chat_reports cr
      JOIN users u_reporter ON cr.reported_by = u_reporter.user_id
      JOIN users u_offender ON cr.reported_user = u_offender.user_id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    res.json({
      success: true,
      reports: result.rows,
      limit,
      offset
    });
  } catch (error) {
    console.error('Pending reports error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

/**
 * GET /api/admin/chat/reports/:reportId
 * Get report details
 */
router.get('/reports/:reportId', async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const query = `
      SELECT cr.*, u_reporter.name as reporter_name, u_reporter.email as reporter_email,
        u_offender.name as offender_name, u_offender.email as offender_email
      FROM chat_reports cr
      JOIN users u_reporter ON cr.reported_by = u_reporter.user_id
      JOIN users u_offender ON cr.reported_user = u_offender.user_id
      WHERE cr.report_id = $1
    `;

    const result = await pool.query(query, [reportId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND' });
    }

    // Get related messages
    const report = result.rows[0];
    let messages = [];
    if (report.message_id) {
      const msgQuery = `SELECT * FROM chat_messages WHERE chat_id = $1 ORDER BY sent_at DESC LIMIT 20`;
      const msgResult = await pool.query(msgQuery, [report.chat_id]);
      messages = msgResult.rows;
    }

    res.json({
      success: true,
      report,
      contextMessages: messages
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

/**
 * POST /api/admin/chat/reports/:reportId/resolve
 * Resolve a report
 */
router.post('/reports/:reportId/resolve', validateRequest, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body;
    const adminId = req.user.userId;

    // Get report
    const reportQuery = `SELECT * FROM chat_reports WHERE report_id = $1`;
    const reportResult = await pool.query(reportQuery, [reportId]);

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND' });
    }

    const report = reportResult.rows[0];

    // Update report
    await pool.query(`
      UPDATE chat_reports 
      SET status = 'resolved', reviewed_by = $1, action_taken = $2, 
          review_notes = $3, resolved_at = CURRENT_TIMESTAMP
      WHERE report_id = $4
    `, [adminId, action, notes, reportId]);

    // Log moderation action
    await pool.query(`
      INSERT INTO chat_moderation_logs (admin_id, target_type, target_id, action, reason, related_report_id)
      VALUES ($1, 'user', $2, $3, $4, $5)
    `, [adminId, report.reported_user, 'user_warn', `Report: ${report.report_type}`, reportId]);

    res.json({
      success: true,
      message: 'Report resolved',
      action: action
    });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ success: false, error: 'RESOLUTION_FAILED' });
  }
});

/**
 * POST /api/admin/chat/reports/:reportId/dismiss
 * Dismiss a report
 */
router.post('/reports/:reportId/dismiss', validateRequest, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    await pool.query(`
      UPDATE chat_reports 
      SET status = 'dismissed', reviewed_by = $1, review_notes = $2, resolved_at = CURRENT_TIMESTAMP
      WHERE report_id = $3
    `, [adminId, reason, reportId]);

    res.json({ success: true, message: 'Report dismissed' });
  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json({ success: false, error: 'DISMISS_FAILED' });
  }
});

// ============================================================================
// MESSAGE MANAGEMENT
// ============================================================================

/**
 * POST /api/admin/chat/message/:messageId/hide
 * Hide a message
 */
router.post('/message/:messageId/hide', validateRequest, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    const msgQuery = `SELECT chat_id, sender_id FROM chat_messages WHERE message_id = $1`;
    const msgResult = await pool.query(msgQuery, [messageId]);

    if (msgResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'MESSAGE_NOT_FOUND' });
    }

    const { chat_id, sender_id } = msgResult.rows[0];

    // Hide message
    await pool.query(`
      UPDATE chat_messages SET is_deleted = TRUE WHERE message_id = $1
    `, [messageId]);

    // Log action
    await pool.query(`
      INSERT INTO chat_moderation_logs (admin_id, target_type, target_id, action, reason, related_message_id, related_chat_id)
      VALUES ($1, 'message', $2, 'message_hide', $3, $4, $5)
    `, [adminId, messageId, reason, messageId, chat_id]);

    res.json({ success: true, message: 'Message hidden' });
  } catch (error) {
    console.error('Hide message error:', error);
    res.status(500).json({ success: false, error: 'HIDE_FAILED' });
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/chat/users/strikes/:userId
 * Get user's strike history
 */
router.get('/users/strikes/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT * FROM chat_moderation_logs
      WHERE target_id = $1 AND target_type = 'user'
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      strikes: result.rows,
      totalStrikes: result.rows.length
    });
  } catch (error) {
    console.error('User strikes error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

/**
 * GET /api/admin/chat/frequently-reported
 * Get users with multiple reports
 */
router.get('/frequently-reported', async (req: Request, res: Response) => {
  try {
    const minReports = parseInt(req.query.minReports as string) || 3;

    const query = `
      SELECT u.user_id, u.name, u.email,
        COUNT(cr.report_id) as report_count,
        COUNT(DISTINCT cr.report_type) as report_types,
        MAX(cr.created_at) as latest_report,
        array_agg(DISTINCT cr.report_type) as types_reported
      FROM chat_reports cr
      JOIN users u ON cr.reported_user = u.user_id
      WHERE cr.status IN ('pending', 'investigating')
      GROUP BY u.user_id, u.name, u.email
      HAVING COUNT(cr.report_id) >= $1
      ORDER BY report_count DESC
    `;

    const result = await pool.query(query, [minReports]);

    res.json({
      success: true,
      frequentOffenders: result.rows
    });
  } catch (error) {
    console.error('Frequent offenders error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================

/**
 * GET /api/admin/chat/dashboard/stats
 * Get moderation dashboard statistics
 */
router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const stats: any = {};

    // Total chats
    stats.totalChats = (await pool.query(`SELECT COUNT(*) as count FROM chat_rooms WHERE is_deleted = FALSE`)).rows[0].count;

    // Active chats
    stats.activeChats = (await pool.query(`SELECT COUNT(*) as count FROM chat_rooms WHERE status = 'active' AND is_deleted = FALSE`)).rows[0].count;

    // Reported chats
    stats.reportedChats = (await pool.query(`SELECT COUNT(*) as count FROM chat_rooms WHERE status = 'reported'`)).rows[0].count;

    // Total messages
    stats.totalMessages = (await pool.query(`SELECT COUNT(*) as count FROM chat_messages WHERE is_deleted = FALSE`)).rows[0].count;

    // Flagged messages
    stats.flaggedMessages = (await pool.query(`SELECT COUNT(*) as count FROM chat_messages WHERE is_flagged = TRUE`)).rows[0].count;

    // Reports stats
    stats.totalReports = (await pool.query(`SELECT COUNT(*) as count FROM chat_reports`)).rows[0].count;
    stats.pendingReports = (await pool.query(`SELECT COUNT(*) as count FROM chat_reports WHERE status = 'pending'`)).rows[0].count;
    stats.resolvedReports = (await pool.query(`SELECT COUNT(*) as count FROM chat_reports WHERE status = 'resolved'`)).rows[0].count;

    // Reports by type
    const typeResult = await pool.query(`
      SELECT report_type, COUNT(*) as count FROM chat_reports GROUP BY report_type ORDER BY count DESC
    `);
    stats.reportsByType = typeResult.rows;

    // Top offenders
    const offendersResult = await pool.query(`
      SELECT target_id, COUNT(*) as strikes FROM chat_moderation_logs 
      WHERE target_type = 'user' GROUP BY target_id ORDER BY strikes DESC LIMIT 10
    `);
    stats.topOffenders = offendersResult.rows;

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

export default router;
