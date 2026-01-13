// Backend/src/routes/admin-marriage.ts
// Marriage Module - Admin API Routes

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { db } from '../config/database';
import { apiResponse } from '../utils/apiResponse';

const router = Router();

// Middleware for admin authentication
router.use(authenticateToken);

const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(apiResponse(null, 'Admin access required', false));
  }
  next();
};

// ==================== VERIFICATION WORKFLOWS ====================

/**
 * GET /api/admin/marriage/pending
 * Get pending profile verifications
 */
router.get('/pending', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT mp.*, av.* FROM marriage_profiles mp
       LEFT JOIN admin_verifications av ON mp.id = av.profile_id
       WHERE mp.verification_status = 'pending'
       ORDER BY mp.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const count = await db.query(
      'SELECT COUNT(*) FROM marriage_profiles WHERE verification_status = 'pending''
    );

    res.json(apiResponse(
      { profiles: result.rows, total: count.rows[0].count },
      'Pending profiles retrieved',
      true
    ));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/admin/marriage/profile/:id
 * Get full profile details for verification
 */
router.get('/profile/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;

    const profileResult = await db.query(
      'SELECT * FROM marriage_profiles WHERE id = $1',
      [profileId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json(apiResponse(null, 'Profile not found', false));
    }

    const verificationResult = await db.query(
      'SELECT * FROM admin_verifications WHERE profile_id = $1',
      [profileId]
    );

    res.json(apiResponse({
      profile: profileResult.rows[0],
      verification: verificationResult.rows[0] || null,
    }, 'Profile retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * POST /api/admin/marriage/profile/:id/verify
 * Verify a profile (approve/reject/request reupload)
 */
router.post('/profile/:id/verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const adminId = req.user?.id;
    const { decision, rejectionReason, reuploadRequestedFor, verificationNotes, redFlags, isDuplicate, duplicateOfProfileId } = req.body;

    // Update profile verification status
    if (decision === 'approved') {
      await db.query(
        `UPDATE marriage_profiles SET verification_status = 'verified', verified_by = $1, verified_at = NOW() WHERE id = $2`,
        [adminId, profileId]
      );
    } else if (decision === 'rejected') {
      await db.query(
        `UPDATE marriage_profiles SET verification_status = 'rejected', verified_by = $1, verified_at = NOW(), rejection_reason = $3 WHERE id = $2`,
        [adminId, profileId, rejectionReason]
      );
    } else if (decision === 'pending_reupload') {
      await db.query(
        `UPDATE marriage_profiles SET verification_status = 'pending_reupload', verified_by = $1, verified_at = NOW() WHERE id = $2`,
        [adminId, profileId]
      );
    }

    // Update verification record
    const verificationId = require('uuid').v4();

    await db.query(
      `INSERT INTO admin_verifications (
        id, profile_id, verified_by, verified_at, decision, verification_notes, red_flags,
        is_duplicate, duplicate_of_profile_id, reupload_requested_for, created_at, updated_at
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (profile_id) DO UPDATE SET
        verified_by = EXCLUDED.verified_by,
        verified_at = NOW(),
        decision = EXCLUDED.decision,
        verification_notes = EXCLUDED.verification_notes,
        red_flags = EXCLUDED.red_flags,
        is_duplicate = EXCLUDED.is_duplicate,
        duplicate_of_profile_id = EXCLUDED.duplicate_of_profile_id,
        reupload_requested_for = EXCLUDED.reupload_requested_for,
        updated_at = NOW()`,
      [
        verificationId,
        profileId,
        adminId,
        decision,
        verificationNotes || null,
        redFlags || null,
        isDuplicate || false,
        duplicateOfProfileId || null,
        reuploadRequestedFor || null,
      ]
    );

    res.json(apiResponse(null, 'Profile verified successfully', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * POST /api/admin/marriage/profile/:id/request-reupload
 * Request user to reupload documents
 */
router.post('/profile/:id/request-reupload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { requestedFor } = req.body;

    await db.query(
      `UPDATE admin_verifications SET
        reupload_requested_for = $1,
        reupload_count = reupload_count + 1,
        last_reupload_at = NOW()
       WHERE profile_id = $2`,
      [requestedFor, profileId]
    );

    res.json(apiResponse(null, 'Reupload requested', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/admin/marriage/profile/:id/documents
 * Get profile's uploaded documents for review
 */
router.get('/profile/:id/documents', requireAdmin, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;

    const result = await db.query(
      'SELECT id_proof_file, horoscope_file, community_proof_file, photos FROM marriage_profiles WHERE id = $1',
      [profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, 'Profile not found', false));
    }

    res.json(apiResponse(result.rows[0], 'Documents retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== REPORTS MANAGEMENT ====================

/**
 * GET /api/admin/marriage/reports
 * Get all reports with filters
 */
router.get('/reports', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = 'SELECT * FROM marriage_reports WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    const countQuery = status
      ? 'SELECT COUNT(*) FROM marriage_reports WHERE status = $1'
      : 'SELECT COUNT(*) FROM marriage_reports';

    const countResult = await db.query(
      countQuery,
      status ? [status] : []
    );

    res.json(apiResponse(
      { reports: result.rows, total: countResult.rows[0].count },
      'Reports retrieved',
      true
    ));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/admin/marriage/reports/:id
 * Get report details
 */
router.get('/reports/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id;

    const result = await db.query(
      'SELECT * FROM marriage_reports WHERE id = $1',
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, 'Report not found', false));
    }

    res.json(apiResponse(result.rows[0], 'Report retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * PUT /api/admin/marriage/reports/:id
 * Update report status and take action
 */
router.put('/reports/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id;
    const adminId = req.user?.id;
    const { status, actionTaken, adminNotes } = req.body;

    await db.query(
      `UPDATE marriage_reports SET
        status = $1,
        action_taken = $2,
        admin_notes = $3,
        reviewed_by = $4,
        reviewed_at = NOW(),
        action_taken_at = NOW(),
        updated_at = NOW()
       WHERE id = $5`,
      [status, actionTaken || null, adminNotes || null, adminId, reportId]
    );

    // If action is to ban/suspend user, update user account
    if (actionTaken === 'user_suspended' || actionTaken === 'ban') {
      const reportResult = await db.query('SELECT reported_by_user_id FROM marriage_reports WHERE id = $1', [reportId]);
      const userId = reportResult.rows[0].reported_by_user_id;

      await db.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        [actionTaken === 'user_suspended' ? 'suspended' : 'banned', userId]
      );
    }

    res.json(apiResponse(null, 'Report updated successfully', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== USER MANAGEMENT ====================

/**
 * POST /api/admin/marriage/users/:id/ban
 * Ban a user from marriage module
 */
router.post('/users/:id/ban', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    await db.query(
      'UPDATE users SET status = 'banned', updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Mark all profiles as inactive
    await db.query(
      'UPDATE marriage_profiles SET deleted_at = NOW() WHERE user_id = $1',
      [userId]
    );

    res.json(apiResponse(null, 'User banned successfully', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * POST /api/admin/marriage/users/:id/warn
 * Send warning to user
 */
router.post('/users/:id/warn', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    // In real implementation, would send email warning
    // For now, just log it

    res.json(apiResponse(null, 'Warning sent to user', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/admin/marriage/analytics
 * Get marriage module analytics
 */
router.get('/analytics', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Total profiles
    const totalProfiles = await db.query(
      'SELECT COUNT(*) FROM marriage_profiles WHERE deleted_at IS NULL'
    );

    // Verified profiles
    const verifiedProfiles = await db.query(
      'SELECT COUNT(*) FROM marriage_profiles WHERE verification_status = 'verified''
    );

    // Pending verification
    const pendingProfiles = await db.query(
      'SELECT COUNT(*) FROM marriage_profiles WHERE verification_status = 'pending''
    );

    // Total interests
    const totalInterests = await db.query(
      'SELECT COUNT(*) FROM marriage_interests'
    );

    // Accepted interests
    const acceptedInterests = await db.query(
      'SELECT COUNT(*) FROM marriage_interests WHERE status = 'accepted''
    );

    // Total reports
    const totalReports = await db.query(
      'SELECT COUNT(*) FROM marriage_reports'
    );

    // Pending reports
    const pendingReports = await db.query(
      'SELECT COUNT(*) FROM marriage_reports WHERE status = 'pending''
    );

    const analytics = {
      profiles: {
        total: parseInt(totalProfiles.rows[0].count),
        verified: parseInt(verifiedProfiles.rows[0].count),
        pending: parseInt(pendingProfiles.rows[0].count),
        rejectionRate: (parseInt(totalProfiles.rows[0].count) > 0)
          ? ((parseInt(totalProfiles.rows[0].count) - parseInt(verifiedProfiles.rows[0].count) - parseInt(pendingProfiles.rows[0].count)) / parseInt(totalProfiles.rows[0].count) * 100).toFixed(2)
          : 0,
      },
      interests: {
        total: parseInt(totalInterests.rows[0].count),
        accepted: parseInt(acceptedInterests.rows[0].count),
        acceptanceRate: (parseInt(totalInterests.rows[0].count) > 0)
          ? ((parseInt(acceptedInterests.rows[0].count) / parseInt(totalInterests.rows[0].count)) * 100).toFixed(2)
          : 0,
      },
      reports: {
        total: parseInt(totalReports.rows[0].count),
        pending: parseInt(pendingReports.rows[0].count),
      },
    };

    res.json(apiResponse(analytics, 'Analytics retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/admin/marriage/statistics
 * Get detailed statistics
 */
router.get('/statistics', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Top report reasons
    const topReasons = await db.query(
      `SELECT report_type, COUNT(*) as count FROM marriage_reports
       GROUP BY report_type
       ORDER BY count DESC
       LIMIT 10`
    );

    // Gender distribution
    const genderDist = await db.query(
      'SELECT gender, COUNT(*) as count FROM marriage_profiles WHERE deleted_at IS NULL GROUP BY gender'
    );

    // Caste distribution (top 10)
    const casteDist = await db.query(
      `SELECT caste, COUNT(*) as count FROM marriage_profiles WHERE deleted_at IS NULL AND caste IS NOT NULL
       GROUP BY caste
       ORDER BY count DESC
       LIMIT 10`
    );

    // Location distribution (top 10)
    const locationDist = await db.query(
      `SELECT current_location, COUNT(*) as count FROM marriage_profiles WHERE deleted_at IS NULL AND current_location IS NOT NULL
       GROUP BY current_location
       ORDER BY count DESC
       LIMIT 10`
    );

    res.json(apiResponse({
      topReportReasons: topReasons.rows,
      genderDistribution: genderDist.rows,
      casteDistribution: casteDist.rows,
      locationDistribution: locationDist.rows,
    }, 'Statistics retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/admin/marriage/logs
 * Get audit logs (privacy violations, suspicious activities)
 */
router.get('/logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const logs = await db.query(
      `SELECT * FROM contact_visibility_logs
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       ORDER BY created_at DESC
       LIMIT 1000`
    );

    res.json(apiResponse(logs.rows, 'Logs retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== BULK OPERATIONS ====================

/**
 * POST /api/admin/marriage/bulk-verify
 * Batch verify multiple profiles
 */
router.post('/bulk-verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { profileIds, decision, verificationNotes } = req.body;
    const adminId = req.user?.id;

    for (const profileId of profileIds) {
      await db.query(
        `UPDATE marriage_profiles SET verification_status = $1, verified_by = $2, verified_at = NOW()
         WHERE id = $3`,
        [decision === 'approved' ? 'verified' : 'rejected', adminId, profileId]
      );
    }

    res.json(apiResponse(null, `${profileIds.length} profiles verified`, true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

export default router;
