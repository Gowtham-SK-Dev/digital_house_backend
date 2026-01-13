// Backend/src/routes/admin-jobboard.ts
// Admin routes for job board management

import { Router, Request, Response } from 'express';
import { authenticateToken, checkRole } from '../middleware/auth';
import { db } from '../config/database';
import { apiResponse } from '../utils/apiResponse';

const router = Router();

// ============== ADMIN JOB VERIFICATION ==============

/**
 * Get pending job approvals
 * GET /api/admin/jobboard/pending-jobs
 */
router.get(
  '/pending-jobs',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `SELECT jp.*, ep.company_name, ep.verification_status
         FROM job_posts jp
         JOIN employer_profiles ep ON jp.employer_profile_id = ep.id
         WHERE jp.status = 'pending'
         ORDER BY jp.created_at ASC
         LIMIT $1 OFFSET $2`,
        [parseInt(req.query.limit as string) || 20, parseInt(req.query.offset as string) || 0]
      );

      return apiResponse(res, 200, 'Pending jobs retrieved', result.rows);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get job details for review
 * GET /api/admin/jobboard/jobs/:jobId
 */
router.get(
  '/jobs/:jobId',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `SELECT jp.*, ep.company_name, ep.verification_status, u.email as posted_by_email
         FROM job_posts jp
         JOIN employer_profiles ep ON jp.employer_profile_id = ep.id
         JOIN users u ON jp.posted_by_user_id = u.id
         WHERE jp.id = $1`,
        [req.params.jobId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Job not found');
      }

      return apiResponse(res, 200, 'Job details retrieved', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Approve job post
 * POST /api/admin/jobboard/jobs/:jobId/approve
 */
router.post(
  '/jobs/:jobId/approve',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `UPDATE job_posts 
         SET status = 'approved', approved_by = $1, approved_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, req.params.jobId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Job not found');
      }

      // Create notification
      await db.query(
        `INSERT INTO job_notifications (user_id, notification_type, title, message, job_post_id)
         VALUES ($1, 'job_approved', 'Your job post has been approved!', 'Your job post is now visible to seekers', $2)`,
        [result.rows[0].posted_by_user_id, req.params.jobId]
      );

      return apiResponse(res, 200, 'Job approved', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Reject job post
 * POST /api/admin/jobboard/jobs/:jobId/reject
 */
router.post(
  '/jobs/:jobId/reject',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `UPDATE job_posts 
         SET status = 'rejected', rejection_reason = $1
         WHERE id = $2
         RETURNING *`,
        [req.body.reason, req.params.jobId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Job not found');
      }

      return apiResponse(res, 200, 'Job rejected', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get reported jobs
 * GET /api/admin/jobboard/reported-jobs
 */
router.get(
  '/reported-jobs',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `SELECT jr.*, jp.job_title, ep.company_name
         FROM job_reports jr
         LEFT JOIN job_posts jp ON jr.job_post_id = jp.id
         LEFT JOIN employer_profiles ep ON jr.employer_profile_id = ep.id
         WHERE jr.status IN ('pending', 'under_review')
         ORDER BY jr.created_at ASC
         LIMIT $1 OFFSET $2`,
        [parseInt(req.query.limit as string) || 20, parseInt(req.query.offset as string) || 0]
      );

      return apiResponse(res, 200, 'Reported jobs retrieved', result.rows);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Resolve job report
 * POST /api/admin/jobboard/reports/:reportId/resolve
 */
router.post(
  '/reports/:reportId/resolve',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `UPDATE job_reports 
         SET status = 'resolved', action_taken = $1, resolution_notes = $2, reviewed_by = $3, reviewed_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [req.body.actionTaken, req.body.notes, req.user.id, req.params.reportId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Report not found');
      }

      // If job should be removed
      if (req.body.actionTaken === 'job_removed') {
        await db.query(
          'UPDATE job_posts SET status = $1, deleted_at = NOW() WHERE id = $2',
          ['rejected', result.rows[0].job_post_id]
        );
      }

      return apiResponse(res, 200, 'Report resolved', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

// ============== ADMIN EMPLOYER VERIFICATION ==============

/**
 * Get pending employer verifications
 * GET /api/admin/jobboard/pending-employers
 */
router.get(
  '/pending-employers',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `SELECT ep.*, u.email as user_email
         FROM employer_profiles ep
         JOIN users u ON ep.user_id = u.id
         WHERE ep.verification_status = 'pending'
         ORDER BY ep.created_at ASC
         LIMIT $1 OFFSET $2`,
        [parseInt(req.query.limit as string) || 20, parseInt(req.query.offset as string) || 0]
      );

      return apiResponse(res, 200, 'Pending employers retrieved', result.rows);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Verify employer
 * POST /api/admin/jobboard/employers/:employerId/verify
 */
router.post(
  '/employers/:employerId/verify',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `UPDATE employer_profiles 
         SET verification_status = 'verified', verified_by = $1, verified_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, req.params.employerId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Employer not found');
      }

      // Create notification
      await db.query(
        `INSERT INTO job_notifications (user_id, notification_type, title, message)
         VALUES ($1, 'job_approved', 'Your employer profile is verified!', 'You can now post jobs')`,
        [result.rows[0].user_id]
      );

      return apiResponse(res, 200, 'Employer verified', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Reject employer verification
 * POST /api/admin/jobboard/employers/:employerId/reject
 */
router.post(
  '/employers/:employerId/reject',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `UPDATE employer_profiles 
         SET verification_status = 'rejected', rejection_reason = $1
         WHERE id = $2
         RETURNING *`,
        [req.body.reason, req.params.employerId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Employer not found');
      }

      return apiResponse(res, 200, 'Employer rejected', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Block employer
 * POST /api/admin/jobboard/employers/:employerId/block
 */
router.post(
  '/employers/:employerId/block',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `UPDATE employer_profiles 
         SET is_blocked = true, block_reason = $1, blocked_by = $2, blocked_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [req.body.reason, req.user.id, req.params.employerId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Employer not found');
      }

      // Close all active jobs
      await db.query(
        'UPDATE job_posts SET status = $1 WHERE employer_profile_id = $2',
        ['closed', req.params.employerId]
      );

      return apiResponse(res, 200, 'Employer blocked', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

// ============== ADMIN CHAT MODERATION ==============

/**
 * Get flagged messages
 * GET /api/admin/jobboard/flagged-messages
 */
router.get(
  '/flagged-messages',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        `SELECT jc.* FROM job_chats jc
         WHERE jc.is_flagged = true AND jc.is_hidden = false
         ORDER BY jc.flagged_at DESC
         LIMIT $1 OFFSET $2`,
        [parseInt(req.query.limit as string) || 20, parseInt(req.query.offset as string) || 0]
      );

      return apiResponse(res, 200, 'Flagged messages retrieved', result.rows);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Hide flagged message
 * POST /api/admin/jobboard/messages/:messageId/hide
 */
router.post(
  '/messages/:messageId/hide',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const result = await db.query(
        'UPDATE job_chats SET is_hidden = true WHERE id = $1 RETURNING *',
        [req.params.messageId]
      );

      if (!result.rows[0]) {
        return apiResponse(res, 404, 'Message not found');
      }

      return apiResponse(res, 200, 'Message hidden', result.rows[0]);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

// ============== ADMIN DASHBOARD ==============

/**
 * Get admin dashboard stats
 * GET /api/admin/jobboard/dashboard
 */
router.get(
  '/dashboard',
  authenticateToken,
  checkRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const stats = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM job_posts WHERE status = $1', ['pending']),
        db.query('SELECT COUNT(*) as count FROM employer_profiles WHERE verification_status = $1', [
          'pending',
        ]),
        db.query('SELECT COUNT(*) as count FROM job_reports WHERE status = $1', ['pending']),
        db.query('SELECT COUNT(*) as count FROM job_chats WHERE is_flagged = true AND is_hidden = false'),
        db.query('SELECT COUNT(*) as count FROM job_posts WHERE status = $1', ['approved']),
        db.query('SELECT COUNT(*) as count FROM employer_profiles WHERE verification_status = $1', [
          'verified',
        ]),
      ]);

      return apiResponse(res, 200, 'Dashboard stats retrieved', {
        pendingJobApprovals: stats[0].rows[0].count,
        pendingEmployerVerifications: stats[1].rows[0].count,
        reportedJobs: stats[2].rows[0].count,
        flaggedMessages: stats[3].rows[0].count,
        approvedJobs: stats[4].rows[0].count,
        verifiedEmployers: stats[5].rows[0].count,
      });
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

export default router;
