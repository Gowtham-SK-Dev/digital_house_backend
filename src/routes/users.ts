import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiResponseHandler, AppError } from '@utils/apiResponse';
import { AuthRequest, authMiddleware } from '@middleware/auth';
import { IdGenerator } from '@utils/helpers';

const router = Router();

/**
 * GET /api/users/:userId
 * Get user profile by ID
 */
router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // TODO: Fetch from database
    const user = {
      id: userId,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Member of Digital House',
      profilePicture: '',
      location: '',
      posts: 5,
      followers: 100,
      following: 50,
      isFollowing: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    ApiResponseHandler.success(res, user, 'User profile retrieved', 200);
  } catch (error: any) {
    ApiResponseHandler.error(
      res,
      error.message,
      error.statusCode || 500,
      error
    );
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  '/profile',
  authMiddleware,
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('bio').optional().isString(),
  body('location').optional().isString(),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponseHandler.error(
          res,
          'Validation failed',
          400,
          errors.array()
        );
      }

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { firstName, lastName, bio, location } = req.body;

      // TODO: Update user in database
      const updatedUser = {
        id: req.user.userId,
        email: req.user.email,
        firstName,
        lastName,
        bio,
        location,
        updatedAt: new Date(),
      };

      ApiResponseHandler.success(
        res,
        updatedUser,
        'Profile updated successfully',
        200
      );
    } catch (error: any) {
      ApiResponseHandler.error(
        res,
        error.message,
        error.statusCode || 500,
        error
      );
    }
  }
);

/**
 * POST /api/users/:userId/follow
 * Follow a user
 */
router.post(
  '/:userId/follow',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      if (userId === req.user.userId) {
        throw new AppError('Cannot follow yourself', 400);
      }

      // TODO: Add follow relationship in database
      // TODO: Create notification for followed user

      ApiResponseHandler.success(
        res,
        { followed: true },
        'User followed successfully',
        200
      );
    } catch (error: any) {
      ApiResponseHandler.error(
        res,
        error.message,
        error.statusCode || 500,
        error
      );
    }
  }
);

/**
 * DELETE /api/users/:userId/follow
 * Unfollow a user
 */
router.delete(
  '/:userId/follow',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // TODO: Remove follow relationship from database

      ApiResponseHandler.success(
        res,
        { unfollowed: true },
        'User unfollowed successfully',
        200
      );
    } catch (error: any) {
      ApiResponseHandler.error(
        res,
        error.message,
        error.statusCode || 500,
        error
      );
    }
  }
);

/**
 * GET /api/users/:userId/followers
 * Get user followers (paginated)
 */
router.get(
  '/:userId/followers',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Fetch followers from database with pagination
      const followers = [];
      const total = 0;

      ApiResponseHandler.paginated(res, followers, page, limit, total, 200);
    } catch (error: any) {
      ApiResponseHandler.error(
        res,
        error.message,
        error.statusCode || 500,
        error
      );
    }
  }
);

/**
 * GET /api/users/:userId/following
 * Get users that this user is following (paginated)
 */
router.get(
  '/:userId/following',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Fetch following from database with pagination
      const following = [];
      const total = 0;

      ApiResponseHandler.paginated(res, following, page, limit, total, 200);
    } catch (error: any) {
      ApiResponseHandler.error(
        res,
        error.message,
        error.statusCode || 500,
        error
      );
    }
  }
);

export default router;
