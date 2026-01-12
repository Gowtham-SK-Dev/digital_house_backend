/**
 * Authentication Service
 * Handles OTP generation, email sending, and user authentication
 */

import { config } from '@config/config';
import { JwtService, IdGenerator } from '@utils/helpers';
import { User, AuthToken, OTPRequest } from '@types/index';

interface OTPStore {
  [email: string]: {
    otp: string;
    expiresAt: number;
    attempts: number;
  };
}

class AuthService {
  private otpStore: OTPStore = {};
  private readonly OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 5;

  /**
   * Generate OTP for email verification
   */
  generateOTP(email: string): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    this.otpStore[email] = {
      otp,
      expiresAt: Date.now() + this.OTP_EXPIRY,
      attempts: 0,
    };

    return otp;
  }

  /**
   * Verify OTP for email
   */
  verifyOTP(email: string, otp: string): boolean {
    const record = this.otpStore[email];

    if (!record) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      delete this.otpStore[email];
      return false;
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      delete this.otpStore[email];
      return false;
    }

    record.attempts++;

    if (record.otp !== otp) {
      return false;
    }

    delete this.otpStore[email];
    return true;
  }

  /**
   * Generate authentication tokens
   */
  generateAuthTokens(userId: string, email: string): AuthToken {
    const accessToken = JwtService.generateToken({ userId, email });

    return {
      accessToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  /**
   * Create new user from OTP auth
   */
  createAuthUser(email: string): User {
    return {
      id: IdGenerator.userId(),
      email,
      firstName: '',
      lastName: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export const authService = new AuthService();
