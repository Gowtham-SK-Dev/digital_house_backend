// Business Directory Routes - User and Business Owner Endpoints
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import directoryService from '../services/directory.service';
import verificationService from '../services/directory-verification.service';
import inquiryService from '../services/directory-inquiry.service';
import reviewService from '../services/directory-review.service';
import reportService from '../services/directory-report.service';
import { apiResponse } from '../utils/apiResponse';

const router = Router();

// ============================================
// BUSINESS OWNER ROUTES
// ============================================

/**
 * Create new business profile
 * POST /directory/create-business
 */
router.post('/create-business', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessName, categoryId, city, district, state, pincode, phone, ...data } = req.body;

    if (!businessName || !categoryId || !city || !phone) {
      return res.status(400).json(apiResponse(null, false, 'Missing required fields'));
    }

    // Check fraud indicators
    const fraudFlags = directoryService.detectFraudIndicators(
      businessName,
      data.description || '',
      phone,
      data.email || ''
    );

    const business = await directoryService.createBusiness(req.user.id, {
      businessName,
      categoryId,
      city,
      district,
      state,
      pincode,
      phone,
      ...data,
    });

    if (fraudFlags.length > 0) {
      await Promise.all(fraudFlags.map((flag) => directoryService.addFraudFlag(business.id, flag)));
    }

    res.status(201).json(apiResponse(business, true, 'Business profile created. Awaiting verification.'));
  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to create business'));
  }
});

/**
 * Get owner's businesses
 * GET /directory/my-businesses
 */
router.get('/my-businesses', authenticateToken, async (req: Request, res: Response) => {
  try {
    const businesses = await directoryService.getBusinessesByOwner(req.user.id);
    res.json(apiResponse(businesses, true, 'Businesses retrieved'));
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve businesses'));
  }
});

/**
 * Get business details
 * GET /directory/business/:businessId
 */
router.get('/business/:businessId', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const business = await directoryService.getBusinessById(businessId);

    if (!business) {
      return res.status(404).json(apiResponse(null, false, 'Business not found'));
    }

    const services = await directoryService.getServices(businessId);
    const reviews = await reviewService.getBusinessReviews(businessId);

    res.json(
      apiResponse(
        {
          business,
          services,
          reviews,
          averageRating: business.average_rating,
          totalReviews: business.total_reviews,
        },
        true,
        'Business details retrieved'
      )
    );
  } catch (error) {
    console.error('Get business details error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve business'));
  }
});

/**
 * Update business profile
 * PUT /directory/business/:businessId
 */
router.put('/business/:businessId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const updated = await directoryService.updateBusiness(businessId, req.user.id, req.body);

    if (!updated) {
      return res.status(404).json(apiResponse(null, false, 'Business not found or unauthorized'));
    }

    res.json(apiResponse(updated, true, 'Business profile updated'));
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to update business'));
  }
});

/**
 * Delete business
 * DELETE /directory/business/:businessId
 */
router.delete('/business/:businessId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const deleted = await directoryService.deleteBusiness(businessId, req.user.id);

    if (!deleted) {
      return res.status(404).json(apiResponse(null, false, 'Business not found or unauthorized'));
    }

    res.json(apiResponse(null, true, 'Business deleted'));
  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to delete business'));
  }
});

// ============================================
// VERIFICATION ROUTES
// ============================================

/**
 * Get verification status
 * GET /directory/business/:businessId/verification-status
 */
router.get('/business/:businessId/verification-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const business = await directoryService.getBusinessById(businessId);

    if (!business || business.ownerId !== req.user.id) {
      return res.status(404).json(apiResponse(null, false, 'Business not found'));
    }

    const documents = await verificationService.getDocuments(businessId);
    const completion = await verificationService.checkDocumentCompletion(businessId);

    res.json(
      apiResponse(
        {
          status: business.verificationStatus,
          documents,
          completion,
          requiredDocuments: verificationService.getRequiredDocuments(),
        },
        true,
        'Verification status retrieved'
      )
    );
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve verification status'));
  }
});

/**
 * Upload verification document
 * POST /directory/business/:businessId/upload-document
 */
router.post('/business/:businessId/upload-document', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { documentType, fileUrl, fileName } = req.body;

    if (!documentType || !fileUrl) {
      return res.status(400).json(apiResponse(null, false, 'Missing required fields'));
    }

    const business = await directoryService.getBusinessById(businessId);
    if (!business || business.ownerId !== req.user.id) {
      return res.status(404).json(apiResponse(null, false, 'Business not found'));
    }

    const document = await verificationService.uploadDocument(
      businessId,
      documentType,
      fileUrl,
      fileName,
      req.user.id
    );

    res.status(201).json(apiResponse(document, true, 'Document uploaded successfully'));
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to upload document'));
  }
});

// ============================================
// SERVICES ROUTES
// ============================================

/**
 * Add service to business
 * POST /directory/business/:businessId/add-service
 */
router.post('/business/:businessId/add-service', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { serviceName, description, price } = req.body;

    const business = await directoryService.getBusinessById(businessId);
    if (!business || business.ownerId !== req.user.id) {
      return res.status(404).json(apiResponse(null, false, 'Business not found'));
    }

    const service = await directoryService.addService(businessId, serviceName, description, price);
    res.status(201).json(apiResponse(service, true, 'Service added'));
  } catch (error) {
    console.error('Add service error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to add service'));
  }
});

/**
 * Get business services
 * GET /directory/business/:businessId/services
 */
router.get('/business/:businessId/services', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const services = await directoryService.getServices(businessId);
    res.json(apiResponse(services, true, 'Services retrieved'));
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve services'));
  }
});

// ============================================
// SEARCH & FILTER ROUTES
// ============================================

/**
 * Search businesses
 * POST /directory/search
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const filters = {
      searchQuery: req.body.searchQuery,
      categoryId: req.body.categoryId,
      city: req.body.city,
      district: req.body.district,
      state: req.body.state,
      priceRange: req.body.priceRange,
      homeDelivery: req.body.homeDelivery,
      rating: req.body.rating,
      verifiedOnly: true,
      sortBy: req.body.sortBy || 'recent',
      page: parseInt(req.body.page) || 1,
      limit: Math.min(parseInt(req.body.limit) || 20, 100),
    };

    const results = await directoryService.searchBusinesses(filters);
    res.json(apiResponse(results, true, 'Search results'));
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json(apiResponse(null, false, 'Search failed'));
  }
});

/**
 * Get nearby businesses
 * POST /directory/nearby
 */
router.post('/nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radiusKm } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json(apiResponse(null, false, 'Latitude and longitude required'));
    }

    const businesses = await directoryService.getNearbyBusinesses(
      parseFloat(latitude),
      parseFloat(longitude),
      radiusKm || 10
    );

    res.json(apiResponse(businesses, true, 'Nearby businesses retrieved'));
  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve nearby businesses'));
  }
});

/**
 * Get categories
 * GET /directory/categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await directoryService.getCategories();
    res.json(apiResponse(categories, true, 'Categories retrieved'));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve categories'));
  }
});

// ============================================
// INQUIRY ROUTES
// ============================================

/**
 * Create inquiry
 * POST /directory/business/:businessId/inquire
 */
router.post('/business/:businessId/inquire', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { serviceId, inquiryType, message } = req.body;

    if (!inquiryType || !message) {
      return res.status(400).json(apiResponse(null, false, 'Missing required fields'));
    }

    const inquiry = await inquiryService.createInquiry(businessId, req.user.id, {
      serviceId,
      inquiryType,
      message,
    });

    res.status(201).json(apiResponse(inquiry, true, 'Inquiry sent'));
  } catch (error: any) {
    console.error('Create inquiry error:', error);
    res.status(500).json(apiResponse(null, false, error.message || 'Failed to create inquiry'));
  }
});

/**
 * Get user inquiries
 * GET /directory/my-inquiries
 */
router.get('/my-inquiries', authenticateToken, async (req: Request, res: Response) => {
  try {
    const inquiries = await inquiryService.getUserInquiries(req.user.id);
    res.json(apiResponse(inquiries, true, 'Inquiries retrieved'));
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve inquiries'));
  }
});

/**
 * Get business inquiries received
 * GET /directory/business/:businessId/inquiries
 */
router.get(
  '/business/:businessId/inquiries',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      const business = await directoryService.getBusinessById(businessId);

      if (!business || business.ownerId !== req.user.id) {
        return res.status(404).json(apiResponse(null, false, 'Business not found'));
      }

      const inquiries = await inquiryService.getBusinessInquiries(businessId);
      res.json(apiResponse(inquiries, true, 'Inquiries retrieved'));
    } catch (error) {
      console.error('Get business inquiries error:', error);
      res.status(500).json(apiResponse(null, false, 'Failed to retrieve inquiries'));
    }
  }
);

/**
 * Respond to inquiry
 * POST /directory/inquiry/:inquiryId/respond
 */
router.post('/inquiry/:inquiryId/respond', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { inquiryId } = req.params;
    const { message } = req.body;

    const inquiry = await inquiryService.getInquiry(inquiryId);
    if (!inquiry || inquiry.business_id !== (await directoryService.getBusinessById(inquiry.business_id))?.ownerId) {
      return res.status(404).json(apiResponse(null, false, 'Inquiry not found'));
    }

    const updated = await inquiryService.respondToInquiry(inquiryId, inquiry.business_id, message);
    res.json(apiResponse(updated, true, 'Response sent'));
  } catch (error) {
    console.error('Respond to inquiry error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to respond'));
  }
});

/**
 * Mark inquiry complete
 * POST /directory/inquiry/:inquiryId/complete
 */
router.post('/inquiry/:inquiryId/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { inquiryId } = req.params;
    const inquiry = await inquiryService.getInquiry(inquiryId);

    if (!inquiry) {
      return res.status(404).json(apiResponse(null, false, 'Inquiry not found'));
    }

    const updated = await inquiryService.markCompleted(inquiryId, inquiry.business_id);
    res.json(apiResponse(updated, true, 'Inquiry marked as completed'));
  } catch (error) {
    console.error('Mark complete error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to mark as completed'));
  }
});

// ============================================
// REVIEW ROUTES
// ============================================

/**
 * Create review
 * POST /directory/business/:businessId/review
 */
router.post('/business/:businessId/review', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { inquiryId, rating, comment, photoUrls } = req.body;

    if (!inquiryId || !rating) {
      return res.status(400).json(apiResponse(null, false, 'Missing required fields'));
    }

    const review = await reviewService.createReview(businessId, req.user.id, {
      inquiryId,
      rating,
      comment,
      photoUrls,
    });

    res.status(201).json(apiResponse(review, true, 'Review created'));
  } catch (error: any) {
    console.error('Create review error:', error);
    res.status(500).json(apiResponse(null, false, error.message || 'Failed to create review'));
  }
});

/**
 * Get business reviews
 * GET /directory/business/:businessId/reviews
 */
router.get('/business/:businessId/reviews', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const reviews = await reviewService.getBusinessReviews(businessId);
    const stats = await reviewService.getReviewStats(businessId);

    res.json(apiResponse({ reviews, stats }, true, 'Reviews retrieved'));
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve reviews'));
  }
});

/**
 * Mark review helpful
 * POST /directory/review/:reviewId/helpful
 */
router.post('/review/:reviewId/helpful', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    await reviewService.markHelpful(reviewId, true);
    res.json(apiResponse(null, true, 'Marked as helpful'));
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to mark helpful'));
  }
});

// ============================================
// FAVORITE/SAVE ROUTES
// ============================================

/**
 * Save business
 * POST /directory/business/:businessId/save
 */
router.post('/business/:businessId/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    // Implementation with saved_businesses table
    res.status(201).json(apiResponse(null, true, 'Business saved'));
  } catch (error) {
    console.error('Save business error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to save business'));
  }
});

/**
 * Get saved businesses
 * GET /directory/saved
 */
router.get('/saved', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Implementation with saved_businesses table
    res.json(apiResponse([], true, 'Saved businesses retrieved'));
  } catch (error) {
    console.error('Get saved businesses error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve saved businesses'));
  }
});

// ============================================
// REPORT ROUTES
// ============================================

/**
 * Report business
 * POST /directory/business/:businessId/report
 */
router.post('/business/:businessId/report', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { reportType, reasonText, evidenceUrls } = req.body;

    if (!reportType || !reasonText) {
      return res.status(400).json(apiResponse(null, false, 'Missing required fields'));
    }

    const report = await reportService.reportBusiness(
      businessId,
      req.user.id,
      reportType,
      reasonText,
      evidenceUrls
    );

    res.status(201).json(apiResponse(report, true, 'Report submitted'));
  } catch (error: any) {
    console.error('Report business error:', error);
    res.status(500).json(apiResponse(null, false, error.message || 'Failed to report business'));
  }
});

// ============================================
// BUSINESS OWNER DASHBOARD
// ============================================

/**
 * Get business analytics
 * GET /directory/business/:businessId/analytics
 */
router.get('/business/:businessId/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const business = await directoryService.getBusinessById(businessId);

    if (!business || business.ownerId !== req.user.id) {
      return res.status(404).json(apiResponse(null, false, 'Business not found'));
    }

    const stats = await directoryService.getBusinessStats(businessId);
    const inquiryStats = await inquiryService.getInquiryStats(businessId);
    const reviewStats = await reviewService.getReviewStats(businessId);

    res.json(
      apiResponse(
        {
          stats,
          inquiryStats,
          reviewStats,
        },
        true,
        'Analytics retrieved'
      )
    );
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve analytics'));
  }
});

export default router;
