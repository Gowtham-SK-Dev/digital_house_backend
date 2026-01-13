import { Router, Request, Response } from 'express';
import { ProfileService } from '@services/profile.service';
import { createApiResponse } from '@utils/apiResponse';
import { authMiddleware } from '@middleware/auth';

const router = Router();

/**
 * Initialize profile table (run once)
 * POST /api/profiles/init
 */
router.post('/init', async (req: Request, res: Response) => {
  try {
    await ProfileService.initializeProfileTable();
    res.json(createApiResponse(true, 'Profile table initialized', null));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Initialization failed', null, error.message));
  }
});

/**
 * Get current user's full profile
 * GET /api/profiles/me
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const profile = await ProfileService.getProfileByUserId(userId);
    
    if (!profile) {
      return res.status(404).json(createApiResponse(false, 'Profile not found', null));
    }

    res.json(createApiResponse(true, 'Profile retrieved', profile));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Failed to get profile', null, error.message));
  }
});

/**
 * Get public profile view (with privacy filters)
 * GET /api/profiles/:userId
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const viewerUserId = (req as any).userId; // Optional if not authenticated

    const profileView = await ProfileService.getProfileView(userId, viewerUserId);
    res.json(createApiResponse(true, 'Profile retrieved', profileView));
  } catch (error: any) {
    res.status(404).json(createApiResponse(false, 'Profile not found', null, error.message));
  }
});

/**
 * Update user's profile
 * PATCH /api/profiles/me
 */
router.patch('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const updates = req.body;

    const updatedProfile = await ProfileService.updateProfile(userId, updates);
    res.json(createApiResponse(true, 'Profile updated successfully', updatedProfile));
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to update profile', null, error.message));
  }
});

/**
 * Search profiles
 * GET /api/profiles/search?q=query&location=location
 */
router.get('/search/profiles', async (req: Request, res: Response) => {
  try {
    const { q, location, interests, verified } = req.query;
    const viewerUserId = (req as any).userId;

    if (!q) {
      return res.status(400).json(createApiResponse(false, 'Search query required', null));
    }

    const results = await ProfileService.searchProfiles(
      q as string,
      {
        location: location as string,
        interests: interests ? (interests as string).split(',') : undefined,
        verified: verified ? verified === 'true' : undefined
      },
      viewerUserId
    );

    res.json(createApiResponse(true, 'Profiles found', { profiles: results, total: results.length }));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Search failed', null, error.message));
  }
});

/**
 * Admin: Get pending verifications
 * GET /api/profiles/admin/pending
 */
router.get('/admin/pending-verifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Check admin role (implement based on your auth system)
    const userId = (req as any).userId;
    const isAdmin = (req as any).isAdmin; // Assuming this is set by auth middleware

    if (!isAdmin) {
      return res.status(403).json(createApiResponse(false, 'Unauthorized', null));
    }

    const { limit = 50, offset = 0 } = req.query;
    const result = await ProfileService.getPendingVerifications(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json(createApiResponse(true, 'Pending profiles retrieved', result));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Failed to get pending verifications', null, error.message));
  }
});

/**
 * Admin: Verify profile
 * POST /api/profiles/admin/verify
 */
router.post('/admin/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const isAdmin = (req as any).isAdmin;

    if (!isAdmin) {
      return res.status(403).json(createApiResponse(false, 'Unauthorized', null));
    }

    const { userId, verified, verificationNotes } = req.body;

    if (!userId || verified === undefined) {
      return res.status(400).json(createApiResponse(false, 'Missing required fields', null));
    }

    const profile = await ProfileService.verifyProfile(adminId, {
      userId,
      verified,
      verificationNotes
    });

    res.json(createApiResponse(true, `Profile ${verified ? 'verified' : 'unverified'}`, profile));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Verification failed', null, error.message));
  }
});

/**
 * Update privacy settings
 * PATCH /api/profiles/me/privacy
 */
router.patch('/me/privacy', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { privacy } = req.body;

    const updatedProfile = await ProfileService.updateProfile(userId, { privacy });
    res.json(createApiResponse(true, 'Privacy settings updated', updatedProfile));
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to update privacy settings', null, error.message));
  }
});

export default router;
