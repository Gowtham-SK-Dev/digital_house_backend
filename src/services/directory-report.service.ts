// Business Report Service
import db from '../config/database';
import { ReportType } from '../types/directory';

export class DirectoryReportService {
  /**
   * Report business
   */
  async reportBusiness(
    businessId: string,
    reporterId: string,
    reportType: ReportType,
    reasonText: string,
    evidenceUrls?: string[]
  ): Promise<any> {
    // Check for duplicate recent reports
    const recentQuery = `
      SELECT id FROM business_reports
      WHERE business_id = $1 AND reporter_id = $2
      AND created_at > NOW() - INTERVAL '7 days'
      AND deleted_at IS NULL
    `;

    const recent = await db.query(recentQuery, [businessId, reporterId]);
    if (recent.rows.length > 0) {
      throw new Error('You have already reported this business. Our team will review your previous report.');
    }

    const query = `
      INSERT INTO business_reports (
        business_id, reporter_id, report_type, reason_text, evidence_urls, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [
      businessId,
      reporterId,
      reportType,
      reasonText,
      evidenceUrls ? JSON.stringify(evidenceUrls) : null,
      'pending',
    ]);

    // Create notification for admins
    await this.notifyAdmins(`New report: ${reportType}`, `Business: ${businessId}`);

    return result.rows[0];
  }

  /**
   * Get reports (admin)
   */
  async getReports(status?: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    let query = `
      SELECT br.*, bp.business_name, u.full_name, u.email
      FROM business_reports br
      LEFT JOIN business_profiles bp ON br.business_id = bp.id
      LEFT JOIN users u ON br.reporter_id = u.id
      WHERE br.deleted_at IS NULL
    `;

    const params: any[] = [];

    if (status) {
      query += ` AND br.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY br.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get report details
   */
  async getReportDetails(reportId: string): Promise<any> {
    const query = `
      SELECT br.*, bp.business_name, bp.phone, bp.email, u.full_name, u.email as reporter_email
      FROM business_reports br
      LEFT JOIN business_profiles bp ON br.business_id = bp.id
      LEFT JOIN users u ON br.reporter_id = u.id
      WHERE br.id = $1 AND br.deleted_at IS NULL
    `;

    const result = await db.query(query, [reportId]);
    return result.rows[0] || null;
  }

  /**
   * Resolve report (admin)
   */
  async resolveReport(
    reportId: string,
    resolution: string,
    actionTaken?: 'no_action' | 'warning' | 'suspend' | 'block'
  ): Promise<any> {
    const query = `
      UPDATE business_reports
      SET status = $1, resolution = $2, resolved_by = CURRENT_USER, resolved_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, ['resolved', resolution, reportId]);

    if (actionTaken === 'block') {
      const report = result.rows[0];
      await db.query(
        'UPDATE business_profiles SET is_blocked = true, blocked_reason = $1 WHERE id = $2',
        [resolution, report.business_id]
      );
    }

    return result.rows[0];
  }

  /**
   * Dismiss report (admin)
   */
  async dismissReport(reportId: string, reason: string): Promise<any> {
    const query = `
      UPDATE business_reports
      SET status = $1, resolution = $2, resolved_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, ['dismissed', reason, reportId]);
    return result.rows[0];
  }

  /**
   * Upvote report
   */
  async upvoteReport(reportId: string): Promise<void> {
    const query = `
      UPDATE business_reports
      SET upvote_count = upvote_count + 1
      WHERE id = $1
    `;

    await db.query(query, [reportId]);
  }

  /**
   * Get reports for business
   */
  async getBusinessReports(businessId: string): Promise<any[]> {
    const query = `
      SELECT br.*, u.full_name
      FROM business_reports br
      LEFT JOIN users u ON br.reporter_id = u.id
      WHERE br.business_id = $1 AND br.deleted_at IS NULL
      ORDER BY br.upvote_count DESC, br.created_at DESC
    `;

    const result = await db.query(query, [businessId]);
    return result.rows;
  }

  /**
   * Get report statistics (admin)
   */
  async getReportStats(): Promise<any> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed
      FROM business_reports
      WHERE deleted_at IS NULL
    `;

    const result = await db.query(query);
    return result.rows[0];
  }

  /**
   * Get reports by type
   */
  async getReportsByType(): Promise<any> {
    const query = `
      SELECT
        report_type,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM business_reports
      WHERE deleted_at IS NULL
      GROUP BY report_type
      ORDER BY count DESC
    `;

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Notify admins about report
   */
  private async notifyAdmins(title: string, message: string): Promise<void> {
    const query = `
      INSERT INTO business_notifications (
        recipient_id, notification_type, title, message
      )
      SELECT id, 'report', $1, $2
      FROM users
      WHERE role = 'admin'
    `;

    await db.query(query, [title, message]);
  }

  /**
   * Flag report for investigation
   */
  async flagForInvestigation(reportId: string): Promise<any> {
    const query = `
      UPDATE business_reports
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, ['investigating', reportId]);
    return result.rows[0];
  }

  /**
   * Get multiple reported businesses
   */
  async getMultipleReportedBusinesses(minReports: number = 3): Promise<any[]> {
    const query = `
      SELECT bp.*, COUNT(br.id) as report_count
      FROM business_profiles bp
      LEFT JOIN business_reports br ON bp.id = br.business_id AND br.status != 'dismissed'
      WHERE bp.deleted_at IS NULL
      GROUP BY bp.id
      HAVING COUNT(br.id) >= $1
      ORDER BY COUNT(br.id) DESC
    `;

    const result = await db.query(query, [minReports]);
    return result.rows;
  }
}

export default new DirectoryReportService();
