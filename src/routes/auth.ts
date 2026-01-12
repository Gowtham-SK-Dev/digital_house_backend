import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '@services/auth.service';
import { emailService } from '@services/email.service';
import { ApiResponseHandler, AppError } from '@utils/apiResponse';
import { AuthRequest, authMiddleware } from '@middleware/auth';

const router = Router();

/**
 * POST /api/auth/send-otp
 * Send OTP to email for authentication
 */
router.post(
  '/send-otp',
  body('email').isEmail().normalizeEmail(),
  async (req: Request, res: Response) => {
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

      const { email } = req.body;

      // Generate OTP
      const otp = authService.generateOTP(email);

      // Send OTP email
      await emailService.sendOTPEmail(email, otp);

      ApiResponseHandler.success(
        res,
        { email, message: 'OTP sent to your email' },
        'OTP sent successfully',
        200
      );
    } catch (error: any) {
      ApiResponseHandler.error(res, error.message, 500, error);
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * Verify OTP and authenticate user
 */
router.post(
  '/verify-otp',
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('firstName').optional().isString().trim(),
  body('lastName').optional().isString().trim(),
  async (req: Request, res: Response) => {
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

      const { email, otp, firstName, lastName } = req.body;

      // Verify OTP
      const isValidOTP = authService.verifyOTP(email, otp);
      if (!isValidOTP) {
        throw new AppError('Invalid or expired OTP', 400);
      }

      // Create or get user
      let user = authService.createAuthUser(email);
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;

      // TODO: Save user to database (PostgreSQL)

      // Generate auth tokens
      const tokens = authService.generateAuthTokens(user.id, user.email);

      // Send welcome email
      await emailService.sendWelcomeEmail(
        email,
        `${firstName || ''} ${lastName || ''}`.trim()
      );

      ApiResponseHandler.success(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          tokens,
        },
        'Authentication successful',
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
 * POST /api/auth/logout
 * Logout user (optional - mainly for mobile)
 */
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    // TODO: Invalidate tokens in database if needed

    ApiResponseHandler.success(
      res,
      { message: 'Logged out successfully' },
      'Logout successful',
      200
    );
  } catch (error: any) {
    ApiResponseHandler.error(res, error.message, 500, error);
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      throw new AppError('User not found', 401);
    }

    // TODO: Fetch user from database
    const user = {
      id: req.user.userId,
      email: req.user.email,
      firstName: '',
      lastName: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    ApiResponseHandler.success(res, user, 'Profile retrieved', 200);
  } catch (error: any) {
    ApiResponseHandler.error(
      res,
      error.message,
      error.statusCode || 500,
      error
    );
  }
});

export default router;
