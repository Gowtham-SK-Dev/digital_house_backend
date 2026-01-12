import jwt from 'jsonwebtoken';
import { config } from '@config/config';
import { v4 as uuidv4 } from 'uuid';

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class JwtService {
  static generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch (error: any) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}

export class IdGenerator {
  static userId(): string {
    return `user_${uuidv4()}`;
  }

  static postId(): string {
    return `post_${uuidv4()}`;
  }

  static commentId(): string {
    return `comment_${uuidv4()}`;
  }

  static messageId(): string {
    return `msg_${uuidv4()}`;
  }

  static conversationId(): string {
    return `conv_${uuidv4()}`;
  }

  static notificationId(): string {
    return `notif_${uuidv4()}`;
  }

  static communityId(): string {
    return `comm_${uuidv4()}`;
  }

  static generic(): string {
    return uuidv4();
  }
}
