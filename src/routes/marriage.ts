// Backend/src/routes/marriage.ts
// Marriage Module - User API Routes

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { MarriageService } from '../services/marriage.service';
import { HoroscopeMatchingService } from '../services/horoscope-matching.service';
import { apiResponse } from '../utils/apiResponse';

const router = Router();
const marriageService = new MarriageService();
const horoscopeService = new HoroscopeMatchingService();

// Middleware to require authentication
router.use(authenticateToken);

// ==================== PROFILE OPERATIONS ====================

/**
 * POST /api/marriage/profile
 * Create marriage profile
 */
router.post('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Check if user already has a profile
    const existing = await marriageService.getProfile(userId);
    if (existing) {
      return res.status(400).json(apiResponse(null, 'User already has a marriage profile', false));
    }

    const profile = await marriageService.createProfile(userId, req.body);

    res.status(201).json(apiResponse(profile, 'Marriage profile created successfully', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/marriage/profile/me
 * Get user's own profile
 */
router.get('/profile/me', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get profile by user ID
    const result = await (require('pg')).query(
      'SELECT * FROM marriage_profiles WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, 'Profile not found', false));
    }

    const profile = await marriageService.getProfile(result.rows[0].id, userId);

    res.json(apiResponse(profile, 'Profile retrieved successfully', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/marriage/profile/:id
 * Get profile by ID (with privacy enforcement)
 */
router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;

    const profile = await marriageService.getProfile(profileId, userId);

    if (!profile) {
      return res.status(404).json(apiResponse(null, 'Profile not found', false));
    }

    res.json(apiResponse(profile, 'Profile retrieved successfully', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * PUT /api/marriage/profile/:id
 * Update profile
 */
router.put('/profile/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;

    const profile = await marriageService.updateProfile(profileId, userId, req.body);

    res.json(apiResponse(profile, 'Profile updated successfully', true));
  } catch (error: any) {
    res.status(400).json(apiResponse(null, error.message, false));
  }
});

/**
 * DELETE /api/marriage/profile/:id
 * Delete profile (soft delete)
 */
router.delete('/profile/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;

    await marriageService.deleteProfile(profileId, userId);

    res.json(apiResponse(null, 'Profile deleted successfully', true));
  } catch (error: any) {
    res.status(400).json(apiResponse(null, error.message, false));
  }
});

// ==================== DOCUMENT OPERATIONS ====================

/**
 * POST /api/marriage/profile/:id/documents
 * Upload documents (horoscope, ID proof, community proof)
 */
router.post('/profile/:id/documents', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;

    const profile = await marriageService.uploadDocuments(profileId, userId, req.body);

    res.json(apiResponse(profile, 'Documents uploaded successfully', true));
  } catch (error: any) {
    res.status(400).json(apiResponse(null, error.message, false));
  }
});

/**
 * POST /api/marriage/profile/:id/photos
 * Upload photos
 */
router.post('/profile/:id/photos', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;

    const profile = await marriageService.uploadPhotos(profileId, userId, req.body);

    res.json(apiResponse(profile, 'Photos uploaded successfully', true));
  } catch (error: any) {
    res.status(400).json(apiResponse(null, error.message, false));
  }
});

/**
 * DELETE /api/marriage/profile/:id/photos/:photoId
 * Delete specific photo
 */
router.delete('/profile/:id/photos/:photoId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;
    const photoId = req.params.photoId;

    const profile = await marriageService.deletePhoto(profileId, userId, photoId);

    res.json(apiResponse(profile, 'Photo deleted successfully', true));
  } catch (error: any) {
    res.status(400).json(apiResponse(null, error.message, false));
  }
});

// ==================== SEARCH & DISCOVERY ====================

/**
 * POST /api/marriage/search
 * Search profiles with filters
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const profiles = await marriageService.searchProfiles(req.body, userId);

    res.json(apiResponse(profiles, 'Profiles found', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/marriage/discover
 * Get recommended profiles
 */
router.get('/discover', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Build filter from gender and age preference
    const filters: any = {
      page,
      limit,
    };

    const profiles = await marriageService.searchProfiles(filters, userId);

    res.json(apiResponse(profiles, 'Recommended profiles', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== HOROSCOPE MATCHING ====================

/**
 * GET /api/marriage/profile/:id/horoscope-match
 * Get horoscope match with another profile
 */
router.get('/profile/:id/horoscope-match', async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const otherProfileId = req.query.withProfile as string;

    if (!otherProfileId) {
      return res.status(400).json(apiResponse(null, 'otherProfileId required', false));
    }

    const match = await horoscopeService.getMatch(profileId, otherProfileId);

    if (!match) {
      // Calculate new match
      const newMatch = await horoscopeService.calculateMatch(profileId, otherProfileId);
      return res.json(apiResponse(newMatch, 'Horoscope match calculated', true));
    }

    res.json(apiResponse(match, 'Horoscope match retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== INTEREST OPERATIONS ====================

/**
 * POST /api/marriage/interest
 * Send interest to another profile
 */
router.post('/interest', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get user's profile
    const db = require('../config/database').db;
    const userProfile = await db.query(
      'SELECT id FROM marriage_profiles WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (userProfile.rows.length === 0) {
      return res.status(400).json(apiResponse(null, 'User does not have a marriage profile', false));
    }

    const senderProfileId = userProfile.rows[0].id;

    const interest = await marriageService.sendInterest(senderProfileId, userId, req.body);

    res.status(201).json(apiResponse(interest, 'Interest sent successfully', true));
  } catch (error: any) {
    res.status(400).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/marriage/interests/received
 * Get interests received
 */
router.get('/interests/received', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const interests = await marriageService.getInterestsReceived(userId, page, limit);

    res.json(apiResponse(interests, 'Interests retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/marriage/interests/sent
 * Get interests sent
 */
router.get('/interests/sent', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const interests = await marriageService.getInterestsSent(userId, page, limit);

    res.json(apiResponse(interests, 'Interests retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * PUT /api/marriage/interest/:id
 * Respond to interest (accept/reject)
 */
router.put('/interest/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const interestId = req.params.id;

    const interest = await marriageService.respondToInterest(interestId, userId, req.body);

    res.json(apiResponse(interest, 'Interest response recorded', true));
  } catch (error: any) {
    res.status(400).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/marriage/interest/:id
 * Get interest details
 */
router.get('/interest/:id', async (req: Request, res: Response) => {
  try {
    const db = require('../config/database').db;
    const interestId = req.params.id;

    const result = await db.query(
      'SELECT * FROM marriage_interests WHERE id = $1',
      [interestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, 'Interest not found', false));
    }

    res.json(apiResponse(result.rows[0], 'Interest retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== REPORTING ====================

/**
 * POST /api/marriage/report
 * Report a profile for abuse/fraud
 */
router.post('/report', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { reportedProfileId, ...reportData } = req.body;

    const report = await marriageService.reportProfile(reportedProfileId, userId, reportData);

    res.status(201).json(apiResponse(report, 'Profile reported successfully', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

/**
 * GET /api/marriage/my-reports
 * Get user's sent reports
 */
router.get('/my-reports', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const reports = await marriageService.getUserReports(userId);

    res.json(apiResponse(reports, 'Reports retrieved', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/marriage/profile/:id/views
 * Log and track profile views
 */
router.get('/profile/:id/views', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;

    // The view is already logged when getProfile is called
    const profile = await marriageService.getProfile(profileId, userId);

    res.json(apiResponse({ views: profile?.views || 0 }, 'View logged', true));
  } catch (error: any) {
    res.status(500).json(apiResponse(null, error.message, false));
  }
});

export default router;
