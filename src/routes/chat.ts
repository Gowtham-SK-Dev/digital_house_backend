import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiResponseHandler, AppError } from '@utils/apiResponse';
import { AuthRequest, authMiddleware } from '@middleware/auth';
import { IdGenerator } from '@utils/helpers';

const router = Router();

/**
 * GET /api/chat/conversations
 * Get user's conversations (paginated)
 */
router.get(
  '/conversations',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Fetch conversations from MongoDB with pagination
      const conversations = [];
      const total = 0;

      ApiResponseHandler.paginated(res, conversations, page, limit, total, 200);
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
 * GET /api/chat/conversations/:conversationId/messages
 * Get messages in a conversation (paginated)
 */
router.get(
  '/conversations/:conversationId/messages',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // TODO: Fetch messages from MongoDB with pagination
      const messages = [];
      const total = 0;

      ApiResponseHandler.paginated(res, messages, page, limit, total, 200);
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
 * POST /api/chat/conversations
 * Create a new conversation
 */
router.post(
  '/conversations',
  authMiddleware,
  body('participantId').isString().notEmpty(),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponseHandler.error(
          res,
          'Validation failed',
          400,
          errors.array()
        );
      }

      const { participantId } = req.body;

      if (participantId === req.user.userId) {
        throw new AppError('Cannot create conversation with yourself', 400);
      }

      // TODO: Check if conversation already exists
      // TODO: Create new conversation in MongoDB

      const conversation = {
        id: IdGenerator.conversationId(),
        participants: [req.user.userId, participantId],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      ApiResponseHandler.success(
        res,
        conversation,
        'Conversation created successfully',
        201
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
 * DELETE /api/chat/conversations/:conversationId
 * Delete a conversation
 */
router.delete(
  '/conversations/:conversationId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { conversationId } = req.params;

      // TODO: Verify user is part of conversation
      // TODO: Delete conversation from MongoDB

      ApiResponseHandler.success(
        res,
        { deleted: true },
        'Conversation deleted successfully',
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
 * GET /api/chat/conversations/:conversationId/status
 * Get online status of conversation participant
 */
router.get(
  '/conversations/:conversationId/status',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;

      // TODO: Check if participant is online using Socket.io
      const status = {
        isOnline: false,
        lastSeen: new Date(),
      };

      ApiResponseHandler.success(res, status, 'Status retrieved', 200);
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
