import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@utils/helpers';
import { ApiResponseHandler, AppError } from '@utils/apiResponse';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = JwtService.verifyToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error: any) {
    ApiResponseHandler.error(
      res,
      error.message || 'Authentication failed',
      error.statusCode || 401,
      error
    );
  }
};

export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = JwtService.verifyToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    }

    next();
  } catch (error) {
    next();
  }
};

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  if (error instanceof AppError) {
    ApiResponseHandler.error(res, error.message, error.statusCode, error);
  } else {
    ApiResponseHandler.error(
      res,
      'Internal Server Error',
      500,
      error?.message || error
    );
  }
};
