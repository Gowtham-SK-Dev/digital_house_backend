// Chat Report Service - Reporting & Investigation
import { pool } from '../config/database';
import { ReportType } from '../types/chat';

export class ChatReportService {
  // ========== REPORTING ==========

  /**
   * Report a chat or message
   */
  async reportChatOrMessage(
    reportedBy: string,
    reportedUser: string,
    chatId: string,
    messageId: string | null,
    reportType: ReportType,
    description: string,
    screenshotUrl?: string,
    evidenceData?: Record<string, any>
  ): Promise<string> {
    try {
      // Check if user already reported (prevent spam reporting)
      const existingQuery = `
        SELECT * FROM chat_reports 
        WHERE reported_by = $1 AND chat_id = $2 
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND status != 'dismissed'
      `;
      const existing = await pool.query(existingQuery, [reportedBy, chatId]);
      
      if (existing.rows.length > 0) {
        throw new Error('ALREADY_REPORTED_RECENTLY');
      }

      // Insert report
      const query = `
        INSERT INTO chat_reports (
          chat_id, message_id, reported_by, reported_user, report_type, 
          description, screenshot_url, evidence_data, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING report_id
      `;

      const result = await pool.query(query, [
        chatId, messageId || null, reportedBy, reportedUser,
        reportType, description, screenshotUrl || null, evidenceData || null
      ]);

      const reportId = result.rows[0].report_id;

      // Update chat status if report count is high
      await this.updateChatStatusIfNeeded(chatId);

      return reportId;
    } catch (error) {
      throw new Error(`Failed to report: ${error.message}`);
    }
  }

  /**
   * Update chat status based on report count
   */
  private async updateChatStatusIfNeeded(chatId: string): Promise<void> {
    try {
      const countQuery = `SELECT COUNT(*) as count FROM chat_reports WHERE chat_id = $1 AND status = 'pending'`;
      const result = await pool.query(countQuery, [chatId]);
      const reportCount = parseInt(result.rows[0].count);

      if (reportCount >= 3) {
        await pool.query(`
          UPDATE chat_rooms 
          SET status = 'reported'
          WHERE chat_id = $1 AND status = 'active'
        `, [chatId]);
      }
    } catch (error) {
      console.error('Error updating chat status:', error);
    }
  }

  /**
   * Get all pending reports for admin review
   */
  async getPendingReports(
    limit: number = 50,
    offset: number = 0,
    filterType?: ReportType
  ): Promise<any[]> {
    try {
      let query = `
        SELECT 
          cr.report_id, cr.chat_id, cr.message_id, 
          cr.reported_by, cr.reported_user, cr.report_type, 
          cr.description, cr.created_at,
          u_reporter.name as reporter_name,
          u_offender.name as offender_name,
          (SELECT COUNT(*) FROM chat_reports WHERE chat_id = cr.chat_id) as total_reports_on_chat
        FROM chat_reports cr
        JOIN users u_reporter ON cr.reported_by = u_reporter.user_id
        JOIN users u_offender ON cr.reported_user = u_offender.user_id
        WHERE cr.status = 'pending'
      `;

      const params: any[] = [];

      if (filterType) {
        query += ` AND cr.report_type = $${params.length + 1}`;
        params.push(filterType);
      }

      query += ` ORDER BY cr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get pending reports: ${error.message}`);
    }
  }

  /**
   * Get report details with message history
   */
  async getReportDetails(reportId: string): Promise<any> {
    try {
      const reportQuery = `
        SELECT * FROM chat_reports WHERE report_id = $1
      `;
      const reportResult = await pool.query(reportQuery, [reportId]);
      
      if (reportResult.rows.length === 0) {
        throw new Error('REPORT_NOT_FOUND');
      }

      const report = reportResult.rows[0];

      // Get chat messages for context
      let messages = [];
      if (report.message_id) {
        const msgQuery = `
          SELECT * FROM chat_messages 
          WHERE chat_id = $1 
          ORDER BY sent_at DESC LIMIT 10
        `;
        messages = (await pool.query(msgQuery, [report.chat_id])).rows;
      }

      // Get user info
      const userQuery = `SELECT user_id, name, avatar_url, email FROM users WHERE user_id = $1`;
      const reporter = (await pool.query(userQuery, [report.reported_by])).rows[0];
      const offender = (await pool.query(userQuery, [report.reported_user])).rows[0];

      return {
        report,
        reporter,
        offender,
        messages,
      };
    } catch (error) {
      throw new Error(`Failed to get report details: ${error.message}`);
    }
  }

  // ========== RESOLUTION ==========

  /**
   * Resolve a report with appropriate action
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    action: 'warning' | 'mute' | 'ban' | 'none',
    notes: string,
    escalateToLegal: boolean = false
  ): Promise<void> {
    try {
      const reportQuery = `SELECT * FROM chat_reports WHERE report_id = $1`;
      const reportResult = await pool.query(reportQuery, [reportId]);
      
      if (reportResult.rows.length === 0) {
        throw new Error('REPORT_NOT_FOUND');
      }

      const report = reportResult.rows[0];

      // Update report
      await pool.query(`
        UPDATE chat_reports 
        SET status = 'resolved', reviewed_by = $1, review_notes = $2, 
            action_taken = $3, escalated_to_legal = $4, resolved_at = CURRENT_TIMESTAMP
        WHERE report_id = $5
      `, [adminId, notes, action, escalateToLegal, reportId]);

      // Take appropriate action
      if (action === 'warning') {
        // Just log warning, add strike
        await this.logModeration(
          adminId, 'user', report.reported_user,
          'user_warn', `Report resolution: ${report.report_type}`
        );
      } else if (action === 'mute') {
        // Temporarily mute user
        await this.logModeration(
          adminId, 'user', report.reported_user,
          'chat_mute', `Muted for reported behavior: ${report.report_type}`
        );
      } else if (action === 'ban') {
        // Ban user
        await this.logModeration(
          adminId, 'user', report.reported_user,
          'user_ban', `Banned for reported behavior: ${report.report_type}`
        );
        
        // Close all active chats
        await pool.query(`
          UPDATE chat_rooms 
          SET status = 'closed', closed_at = CURRENT_TIMESTAMP
          WHERE (user_id_a = $1 OR user_id_b = $1) AND status != 'closed'
        `, [report.reported_user]);
      }

      // Update related chat if needed
      if (action !== 'none') {
        await pool.query(`
          UPDATE chat_rooms 
          SET status = 'reported'
          WHERE chat_id = $1
        `, [report.chat_id]);
      }
    } catch (error) {
      throw new Error(`Failed to resolve report: ${error.message}`);
    }
  }

  /**
   * Dismiss a report (insufficient evidence, false report)
   */
  async dismissReport(
    reportId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      await pool.query(`
        UPDATE chat_reports 
        SET status = 'dismissed', reviewed_by = $1, review_notes = $2, resolved_at = CURRENT_TIMESTAMP
        WHERE report_id = $3
      `, [adminId, reason, reportId]);
    } catch (error) {
      throw new Error(`Failed to dismiss report: ${error.message}`);
    }
  }

  /**
   * Move a report to investigation status
   */
  async investigateReport(
    reportId: string,
    adminId: string
  ): Promise<void> {
    try {
      await pool.query(`
        UPDATE chat_reports 
        SET status = 'investigating', reviewed_by = $1
        WHERE report_id = $2
      `, [adminId, reportId]);
    } catch (error) {
      throw new Error(`Failed to investigate report: ${error.message}`);
    }
  }

  // ========== PATTERN DETECTION ==========

  /**
   * Get all reports for a specific user
   */
  async getReportsAboutUser(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const query = `
        SELECT 
          report_id, chat_id, report_type, description, status, created_at,
          COUNT(*) OVER (PARTITION BY reported_user) as total_reports
        FROM chat_reports 
        WHERE reported_user = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get user reports: ${error.message}`);
    }
  }

  /**
   * Get users with multiple reports (potential serial offenders)
   */
  async getFrequentlyReportedUsers(minReports: number = 3): Promise<any[]> {
    try {
      const query = `
        SELECT 
          u.user_id, u.name, u.email,
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
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get frequently reported users: ${error.message}`);
    }
  }

  /**
   * Get reports by type for analytics
   */
  async getReportsByType(limit: number = 365): Promise<any[]> {
    try {
      const query = `
        SELECT 
          report_type,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
        FROM chat_reports 
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day' * $1
        GROUP BY report_type
        ORDER BY count DESC
      `;

      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get reports by type: ${error.message}`);
    }
  }

  /**
   * Get common abuse patterns
   */
  async getAbusePatterns(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          report_type,
          COUNT(*) as frequency,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM chat_reports), 2) as percentage,
          COUNT(DISTINCT reported_user) as affected_users
        FROM chat_reports
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY report_type
        ORDER BY frequency DESC
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get abuse patterns: ${error.message}`);
    }
  }

  /**
   * Get reports on a specific chat
   */
  async getChatReports(chatId: string): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM chat_reports 
        WHERE chat_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(query, [chatId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get chat reports: ${error.message}`);
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Log a moderation action
   */
  private async logModeration(
    adminId: string,
    targetType: string,
    targetId: string,
    action: string,
    reason: string
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO chat_moderation_logs (admin_id, target_type, target_id, action, reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [adminId, targetType, targetId, action, reason]);
    } catch (error) {
      console.error('Error logging moderation:', error);
    }
  }

  /**
   * Get report statistics for dashboard
   */
  async getReportStats(): Promise<any> {
    try {
      const stats: any = {};

      // Total reports
      const totalQuery = `SELECT COUNT(*) as count FROM chat_reports`;
      stats.total = (await pool.query(totalQuery)).rows[0].count;

      // Pending reports
      const pendingQuery = `SELECT COUNT(*) as count FROM chat_reports WHERE status = 'pending'`;
      stats.pending = (await pool.query(pendingQuery)).rows[0].count;

      // Resolved reports
      const resolvedQuery = `SELECT COUNT(*) as count FROM chat_reports WHERE status = 'resolved'`;
      stats.resolved = (await pool.query(resolvedQuery)).rows[0].count;

      // Average resolution time
      const timeQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as hours
        FROM chat_reports WHERE status = 'resolved'
      `;
      stats.avgResolutionHours = parseFloat((await pool.query(timeQuery)).rows[0].hours) || 0;

      // Reports this month
      const monthQuery = `
        SELECT COUNT(*) as count FROM chat_reports 
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
      `;
      stats.thisMonth = (await pool.query(monthQuery)).rows[0].count;

      return stats;
    } catch (error) {
      throw new Error(`Failed to get report stats: ${error.message}`);
    }
  }
}

export default new ChatReportService();
