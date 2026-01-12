import { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types/index';

export class ApiResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: Date.now(),
    };
    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500,
    error?: any
  ): Response {
    const response: ApiResponse<null> = {
      success: false,
      message,
      error: error?.message || error,
      timestamp: Date.now(),
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    statusCode: number = 200
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: Date.now(),
    };
    return res.status(statusCode).json(response);
  }
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}
