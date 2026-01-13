// Admin Directory Routes - Verification, Moderation, and Management
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import directoryService from '../services/directory.service';
import verificationService from '../services/directory-verification.service';
import reviewService from '../services/directory-review.service';
import reportService from '../services/directory-report.service';
import { apiResponse } from '../utils/apiResponse';

const router = Router();

// Middleware to check admin role
const adminOnly = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(apiResponse(null, false, 'Admin access required'));
  }
  next();
};

// ============================================
// VERIFICATION ROUTES
// ============================================

/**
 * Get pending verifications
 * GET /admin/directory/pending
 */
router.get('/pending', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const businesses = await verificationService.getPendingVerifications(limit, offset);
    const stats = await verificationService.getVerificationStats();

    res.json(
      apiResponse(
        {
          businesses,
          stats,
          page,
          limit,
        },
        true,
        'Pending verifications retrieved'
      )
    );
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve pending verifications'));
  }
});

/**
 * Get verification details
 * GET /admin/directory/verify/:businessId
 */
router.get('/verify/:businessId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const business = await directoryService.getBusinessById(businessId);

    if (!business) {
      return res.status(404).json(apiResponse(null, false, 'Business not found'));
    }

    const documents = await verificationService.getDocuments(businessId);
    const status = await verificationService.getVerificationStatus(businessId);

    res.json(
      apiResponse(
        {
          business,
          documents,
          status,
        },
        true,
        'Verification details retrieved'
      )
    );
  } catch (error) {
    console.error('Get verification details error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve verification details'));
  }
});

/**
 * Approve business
 * POST /admin/directory/:businessId/approve
 */
router.post('/:businessId/approve', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const business = await verificationService.verifyBusiness(businessId, req.user.id, true);

    res.json(apiResponse(business, true, 'Business approved and verified'));
  } catch (error) {
    console.error('Approve business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to approve business'));
  }
});

/**
 * Reject business
 * POST /admin/directory/:businessId/reject
 */
router.post('/:businessId/reject', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json(apiResponse(null, false, 'Rejection reason required'));
    }

    const business = await verificationService.verifyBusiness(businessId, req.user.id, false, rejectionReason);

    res.json(apiResponse(business, true, 'Business rejected'));
  } catch (error) {
    console.error('Reject business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to reject business'));
  }
});

/**
 * Verify specific document
 * POST /admin/directory/document/:documentId/verify
 */
router.post('/document/:documentId/verify', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { verify, rejectionReason } = req.body;

    const document = await verificationService.verifyDocument(documentId, verify, req.user.id, rejectionReason);

    res.json(apiResponse(document, true, verify ? 'Document verified' : 'Document rejected'));
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to verify document'));
  }
});

/**
 * Request document re-upload
 * POST /admin/directory/document/:documentId/request-reupload
 */
router.post(
  '/document/:documentId/request-reupload',
  authenticateToken,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json(apiResponse(null, false, 'Reason required'));
      }

      await verificationService.requestReupload(documentId, reason);
      res.json(apiResponse(null, true, 'Re-upload requested'));
    } catch (error) {
      console.error('Request reupload error:', error);
      res.status(500).json(apiResponse(null, false, 'Failed to request re-upload'));
    }
  }
);

// ============================================
// BUSINESS BLOCKING
// ============================================

/**
 * Block business
 * POST /admin/directory/:businessId/block
 */
router.post('/:businessId/block', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json(apiResponse(null, false, 'Blocking reason required'));
    }

    const business = await verificationService.blockBusiness(businessId, reason);
    res.json(apiResponse(business, true, 'Business blocked'));
  } catch (error) {
    console.error('Block business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to block business'));
  }
});

/**
 * Unblock business
 * POST /admin/directory/:businessId/unblock
 */
router.post('/:businessId/unblock', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const business = await verificationService.unblockBusiness(businessId);
    res.json(apiResponse(business, true, 'Business unblocked'));
  } catch (error) {
    console.error('Unblock business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to unblock business'));
  }
});

// ============================================
// REVIEW MODERATION
// ============================================

/**
 * Get pending reviews
 * GET /admin/directory/reviews/pending
 */
router.get('/reviews/pending', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const reviews = await reviewService.getPendingReviews(limit, offset);
    res.json(apiResponse(reviews, true, 'Pending reviews retrieved'));
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve pending reviews'));
  }
});

/**
 * Approve review
 * POST /admin/directory/review/:reviewId/approve
 */
router.post('/review/:reviewId/approve', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const review = await reviewService.moderateReview(reviewId, true);
    res.json(apiResponse(review, true, 'Review approved'));
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to approve review'));
  }
});

/**
 * Reject review
 * POST /admin/directory/review/:reviewId/reject
 */
router.post('/review/:reviewId/reject', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await reviewService.moderateReview(reviewId, false, reason);
    res.json(apiResponse(review, true, 'Review rejected'));
  } catch (error) {
    console.error('Reject review error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to reject review'));
  }
});

/**
 * Hide review
 * POST /admin/directory/review/:reviewId/hide
 */
router.post('/review/:reviewId/hide', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await reviewService.hideReview(reviewId, reason);
    res.json(apiResponse(review, true, 'Review hidden'));
  } catch (error) {
    console.error('Hide review error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to hide review'));
  }
});

// ============================================
// REPORT MANAGEMENT
// ============================================

/**
 * Get reported businesses
 * GET /admin/directory/reports
 */
router.get('/reports', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const reports = await reportService.getReports(status, limit, offset);
    const stats = await reportService.getReportStats();
    const byType = await reportService.getReportsByType();

    res.json(
      apiResponse(
        {
          reports,
          stats,
          byType,
          page,
          limit,
        },
        true,
        'Reports retrieved'
      )
    );
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve reports'));
  }
});

/**
 * Get report details
 * GET /admin/directory/report/:reportId
 */
router.get('/report/:reportId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const report = await reportService.getReportDetails(reportId);

    if (!report) {
      return res.status(404).json(apiResponse(null, false, 'Report not found'));
    }

    res.json(apiResponse(report, true, 'Report details retrieved'));
  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve report'));
  }
});

/**
 * Resolve report
 * POST /admin/directory/report/:reportId/resolve
 */
router.post('/report/:reportId/resolve', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { resolution, actionTaken } = req.body;

    if (!resolution) {
      return res.status(400).json(apiResponse(null, false, 'Resolution required'));
    }

    const report = await reportService.resolveReport(reportId, resolution, actionTaken);
    res.json(apiResponse(report, true, 'Report resolved'));
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to resolve report'));
  }
});

/**
 * Dismiss report
 * POST /admin/directory/report/:reportId/dismiss
 */
router.post('/report/:reportId/dismiss', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json(apiResponse(null, false, 'Reason required'));
    }

    const report = await reportService.dismissReport(reportId, reason);
    res.json(apiResponse(report, true, 'Report dismissed'));
  } catch (error) {
    console.error('Dismiss report error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to dismiss report'));
  }
});

/**
 * Flag report for investigation
 * POST /admin/directory/report/:reportId/investigate
 */
router.post(
  '/report/:reportId/investigate',
  authenticateToken,
  adminOnly,
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const report = await reportService.flagForInvestigation(reportId);
      res.json(apiResponse(report, true, 'Report flagged for investigation'));
    } catch (error) {
      console.error('Flag for investigation error:', error);
      res.status(500).json(apiResponse(null, false, 'Failed to flag for investigation'));
    }
  }
);

/**
 * Get multiple reported businesses
 * GET /admin/directory/frequently-reported
 */
router.get('/frequently-reported', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const minReports = parseInt(req.query.minReports as string) || 3;
    const businesses = await reportService.getMultipleReportedBusinesses(minReports);
    res.json(apiResponse(businesses, true, 'Frequently reported businesses retrieved'));
  } catch (error) {
    console.error('Get frequently reported error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve frequently reported businesses'));
  }
});

// ============================================
// ADMIN DASHBOARD
// ============================================

/**
 * Get admin dashboard
 * GET /admin/directory/dashboard
 */
router.get('/dashboard', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const verificationStats = await verificationService.getVerificationStats();
    const reportStats = await reportService.getReportStats();
    const frequentlyReported = await reportService.getMultipleReportedBusinesses(2);

    res.json(
      apiResponse(
        {
          verificationStats,
          reportStats,
          frequentlyReported: frequentlyReported.slice(0, 5),
        },
        true,
        'Dashboard data retrieved'
      )
    );
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve dashboard'));
  }
});

export default router;
