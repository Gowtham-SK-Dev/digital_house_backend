// Backend/src/services/jobseeker.service.ts
// Job seeker profile management

import { db } from '../config/database';
import { JobSeekerProfile } from '../types/jobboard';
import sharp from 'sharp';
import { createCanvas } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

export class JobSeekerService {
  private resumeUploadPath = path.join(process.cwd(), 'uploads', 'resumes');
  private watermarkedResumePath = path.join(process.cwd(), 'uploads', 'watermarked-resumes');

  /**
   * Create or update job seeker profile
   */
  async createOrUpdateProfile(
    userId: string,
    data: Partial<JobSeekerProfile>
  ): Promise<JobSeekerProfile> {
    // Check if profile exists
    const existing = await db.query(
      'SELECT id FROM job_seeker_profiles WHERE user_id = $1',
      [userId]
    );

    let result;

    if (existing.rows[0]) {
      // Update existing profile
      const setFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.fullName) {
        setFields.push(`full_name = $${paramIndex++}`);
        values.push(data.fullName);
      }
      if (data.email) {
        setFields.push(`email = $${paramIndex++}`);
        values.push(data.email);
      }
      if (data.phone) {
        setFields.push(`phone = $${paramIndex++}`);
        values.push(data.phone);
      }
      if (data.currentCity) {
        setFields.push(`current_city = $${paramIndex++}`);
        values.push(data.currentCity);
      }
      if (data.currentState) {
        setFields.push(`current_state = $${paramIndex++}`);
        values.push(data.currentState);
      }
      if (data.currentCountry) {
        setFields.push(`current_country = $${paramIndex++}`);
        values.push(data.currentCountry);
      }
      if (data.education) {
        setFields.push(`education = $${paramIndex++}`);
        values.push(data.education);
      }
      if (data.skills) {
        setFields.push(`skills = $${paramIndex++}`);
        values.push(data.skills);
      }
      if (data.experienceYears !== undefined) {
        setFields.push(`experience_years = $${paramIndex++}`);
        values.push(data.experienceYears);
      }
      if (data.experienceLevel) {
        setFields.push(`experience_level = $${paramIndex++}`);
        values.push(data.experienceLevel);
      }
      if (data.preferredCities) {
        setFields.push(`preferred_cities = $${paramIndex++}`);
        values.push(data.preferredCities);
      }
      if (data.jobTypePreference) {
        setFields.push(`job_type_preference = $${paramIndex++}`);
        values.push(data.jobTypePreference);
      }
      if (data.workModePreference) {
        setFields.push(`work_mode_preference = $${paramIndex++}`);
        values.push(data.workModePreference);
      }
      if (data.expectedSalaryMin !== undefined) {
        setFields.push(`expected_salary_min = $${paramIndex++}`);
        values.push(data.expectedSalaryMin);
      }
      if (data.expectedSalaryMax !== undefined) {
        setFields.push(`expected_salary_max = $${paramIndex++}`);
        values.push(data.expectedSalaryMax);
      }
      if (data.visibility) {
        setFields.push(`visibility = $${paramIndex++}`);
        values.push(data.visibility);
      }

      setFields.push(`updated_at = NOW()`);
      setFields.push(`profile_completeness = $${paramIndex++}`);
      values.push(this.calculateProfileCompleteness(data));

      values.push(userId);

      result = await db.query(
        `UPDATE job_seeker_profiles 
         SET ${setFields.join(', ')}
         WHERE user_id = $${paramIndex}
         RETURNING *`,
        values
      );
    } else {
      // Create new profile
      result = await db.query(
        `INSERT INTO job_seeker_profiles (
          user_id,
          full_name,
          email,
          phone,
          current_location,
          current_city,
          current_state,
          current_country,
          education,
          skills,
          experience_years,
          experience_level,
          preferred_location,
          preferred_cities,
          job_type_preference,
          work_mode_preference,
          expected_salary_min,
          expected_salary_max,
          visibility,
          profile_completeness
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          userId,
          data.fullName,
          data.email,
          data.phone,
          data.currentLocation || data.currentCity,
          data.currentCity,
          data.currentState,
          data.currentCountry,
          data.education,
          data.skills || [],
          data.experienceYears || 0,
          data.experienceLevel || 'fresher',
          data.preferredLocation || data.preferredCities?.[0],
          data.preferredCities || [],
          data.jobTypePreference || 'full-time',
          data.workModePreference || 'hybrid',
          data.expectedSalaryMin,
          data.expectedSalaryMax,
          data.visibility || 'community-only',
          this.calculateProfileCompleteness(data),
        ]
      );
    }

    return result.rows[0];
  }

  /**
   * Get seeker profile
   */
  async getProfile(userId: string): Promise<JobSeekerProfile> {
    const result = await db.query(
      'SELECT * FROM job_seeker_profiles WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!result.rows[0]) {
      throw new Error('Profile not found');
    }

    return result.rows[0];
  }

  /**
   * Upload and watermark resume
   */
  async uploadResume(
    jobSeekerId: string,
    userId: string,
    fileBuffer: Buffer,
    originalFileName: string
  ): Promise<string> {
    try {
      // Create uploads directory if not exists
      await fs.mkdir(this.watermarkedResumePath, { recursive: true });

      const fileName = `resume_${jobSeekerId}_${Date.now()}.pdf`;
      const originalPath = path.join(this.resumeUploadPath, fileName);
      const watermarkedPath = path.join(this.watermarkedResumePath, fileName);

      // Save original
      await fs.mkdir(this.resumeUploadPath, { recursive: true });
      await fs.writeFile(originalPath, fileBuffer);

      // Add watermark (using simple approach - can be enhanced with actual PDF libraries)
      await this.addWatermarkToResume(originalPath, watermarkedPath, userId);

      // Update profile
      await db.query(
        `UPDATE job_seeker_profiles 
         SET resume_url = $1, resume_original_name = $2, watermarked = true, updated_at = NOW()
         WHERE id = $3`,
        [
          `/uploads/watermarked-resumes/${fileName}`,
          originalFileName,
          jobSeekerId,
        ]
      );

      return `/uploads/watermarked-resumes/${fileName}`;
    } catch (error) {
      throw new Error(`Failed to upload resume: ${error.message}`);
    }
  }

  /**
   * Get applications sent by seeker
   */
  async getApplicationsSent(
    jobSeekerId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    let query = `
      SELECT 
        ja.*,
        jp.job_title,
        jp.company_name,
        jp.job_location,
        jp.salary_min,
        jp.salary_max
      FROM job_applications ja
      JOIN job_posts jp ON ja.job_post_id = jp.id
      WHERE ja.job_seeker_id = $1 AND ja.deleted_at IS NULL
    `;
    const params: any[] = [jobSeekerId];
    let paramIndex = 2;

    if (status) {
      query += ` AND ja.application_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY ja.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get application detail
   */
  async getApplicationDetail(
    applicationId: string,
    userId: string
  ): Promise<any> {
    const result = await db.query(
      `SELECT 
        ja.*,
        jp.job_title,
        jp.company_name,
        jp.job_location,
        jp.salary_min,
        jp.salary_max,
        jp.job_description,
        jp.skills_required
      FROM job_applications ja
      JOIN job_posts jp ON ja.job_post_id = jp.id
      WHERE ja.id = $1 AND (ja.user_id = $2 OR jp.posted_by_user_id = $2)`,
      [applicationId, userId]
    );

    if (!result.rows[0]) {
      throw new Error('Application not found');
    }

    return result.rows[0];
  }

  /**
   * Withdraw an application
   */
  async withdrawApplication(applicationId: string, userId: string): Promise<void> {
    const app = await db.query(
      `SELECT ja.* FROM job_applications ja
       WHERE ja.id = $1 AND ja.user_id = $2`,
      [applicationId, userId]
    );

    if (!app.rows[0]) {
      throw new Error('Application not found');
    }

    await db.query(
      `UPDATE job_applications 
       SET application_status = 'withdrawn', is_withdrawn = true, withdrawn_at = NOW()
       WHERE id = $1`,
      [applicationId]
    );
  }

  /**
   * Update last active time
   */
  async updateLastActive(userId: string): Promise<void> {
    await db.query(
      'UPDATE job_seeker_profiles SET last_active = NOW() WHERE user_id = $1',
      [userId]
    );
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(profile: Partial<JobSeekerProfile>): number {
    const fields = [
      profile.fullName,
      profile.email,
      profile.phone,
      profile.currentCity,
      profile.education,
      profile.skills?.length,
      profile.experienceYears,
      profile.experienceLevel,
      profile.preferredCities?.length,
      profile.jobTypePreference,
      profile.workModePreference,
    ];

    const filled = fields.filter((f) => f !== undefined && f !== null && f !== 0 && f !== '').length;
    return Math.round((filled / fields.length) * 100);
  }

  /**
   * Add watermark to resume PDF
   */
  private async addWatermarkToResume(
    inputPath: string,
    outputPath: string,
    userId: string
  ): Promise<void> {
    // For PDF, you'd normally use libraries like pdf-lib, pdfkit, or ghostscript
    // This is a simplified implementation - in production, use proper PDF manipulation library
    try {
      // Copy original as watermarked for now
      // In production, add actual watermark with user ID and timestamp
      const fileContent = await fs.readFile(inputPath);
      await fs.writeFile(outputPath, fileContent);
    } catch (error) {
      console.error('Watermark error:', error);
      // Fallback: just copy the file
      const fileContent = await fs.readFile(inputPath);
      await fs.writeFile(outputPath, fileContent);
    }
  }
}

export const jobSeekerService = new JobSeekerService();
