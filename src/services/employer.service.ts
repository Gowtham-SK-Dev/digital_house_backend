// Backend/src/services/employer.service.ts
// Employer profile and verification management

import { db } from '../config/database';
import { EmployerProfile, EmployerVerificationRequest } from '../types/jobboard';

export class EmployerService {
  /**
   * Create employer profile
   */
  async createProfile(
    userId: string,
    data: EmployerVerificationRequest
  ): Promise<EmployerProfile> {
    // Check if profile already exists
    const existing = await db.query(
      'SELECT id FROM employer_profiles WHERE user_id = $1',
      [userId]
    );

    if (existing.rows[0]) {
      throw new Error('Employer profile already exists');
    }

    const result = await db.query(
      `INSERT INTO employer_profiles (
        user_id,
        company_name,
        company_email,
        company_website,
        office_location,
        office_city,
        office_country,
        company_registration_doc_url,
        id_proof_url,
        id_proof_type,
        id_proof_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        data.companyName,
        data.companyEmail,
        data.companyWebsite,
        data.officeLocation,
        data.officeCity,
        data.officeCountry,
        data.companyRegistrationDocUrl,
        data.idProofUrl,
        data.idProofType,
        data.idProofName,
      ]
    );

    return result.rows[0];
  }

  /**
   * Get employer profile
   */
  async getProfile(userId: string): Promise<EmployerProfile> {
    const result = await db.query(
      'SELECT * FROM employer_profiles WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    );

    if (!result.rows[0]) {
      throw new Error('Employer profile not found');
    }

    return result.rows[0];
  }

  /**
   * Update employer profile
   */
  async updateProfile(
    userId: string,
    data: Partial<EmployerVerificationRequest>
  ): Promise<EmployerProfile> {
    const setFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.companyName) {
      setFields.push(`company_name = $${paramIndex++}`);
      values.push(data.companyName);
    }
    if (data.companyEmail) {
      setFields.push(`company_email = $${paramIndex++}`);
      values.push(data.companyEmail);
    }
    if (data.companyWebsite) {
      setFields.push(`company_website = $${paramIndex++}`);
      values.push(data.companyWebsite);
    }
    if (data.officeLocation) {
      setFields.push(`office_location = $${paramIndex++}`);
      values.push(data.officeLocation);
    }
    if (data.officeCity) {
      setFields.push(`office_city = $${paramIndex++}`);
      values.push(data.officeCity);
    }
    if (data.officeCountry) {
      setFields.push(`office_country = $${paramIndex++}`);
      values.push(data.officeCountry);
    }

    setFields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await db.query(
      `UPDATE employer_profiles 
       SET ${setFields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Get posted jobs by employer
   */
  async getPostedJobs(
    userId: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    let query = `
      SELECT * FROM job_posts
      WHERE posted_by_user_id = $1 AND deleted_at IS NULL
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get job applicants for employer
   */
  async getJobApplicants(
    jobPostId: string,
    userId: string,
    status?: string
  ): Promise<any[]> {
    // Verify ownership
    const job = await db.query(
      'SELECT posted_by_user_id FROM job_posts WHERE id = $1',
      [jobPostId]
    );

    if (!job.rows[0] || job.rows[0].posted_by_user_id !== userId) {
      throw new Error('Unauthorized');
    }

    let query = `
      SELECT 
        ja.*,
        jsp.full_name,
        jsp.email,
        jsp.phone,
        jsp.skills,
        jsp.experience_level
      FROM job_applications ja
      JOIN job_seeker_profiles jsp ON ja.job_seeker_id = jsp.id
      WHERE ja.job_post_id = $1
    `;
    const params: any[] = [jobPostId];
    let paramIndex = 2;

    if (status) {
      query += ` AND ja.application_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY ja.match_score DESC, ja.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(userId: string): Promise<any> {
    const profile = await db.query(
      `SELECT * FROM employer_profiles WHERE user_id = $1`,
      [userId]
    );

    if (!profile.rows[0]) {
      throw new Error('Employer profile not found');
    }

    const stats = await db.query(
      `SELECT
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'approved' THEN views ELSE 0 END) as total_views,
        SUM(CASE WHEN status = 'approved' THEN total_applications ELSE 0 END) as total_applications
      FROM job_posts
      WHERE posted_by_user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const recentApplications = await db.query(
      `SELECT COUNT(*) as count FROM job_applications
       WHERE job_post_id IN (
         SELECT id FROM job_posts WHERE posted_by_user_id = $1
       )
       AND created_at > NOW() - INTERVAL '7 days'`,
      [userId]
    );

    return {
      ...profile.rows[0],
      ...stats.rows[0],
      recentApplicationsLastWeek: recentApplications.rows[0].count,
    };
  }

  /**
   * Close a job
   */
  async closeJob(jobPostId: string, userId: string): Promise<void> {
    const job = await db.query(
      'SELECT * FROM job_posts WHERE id = $1 AND posted_by_user_id = $2',
      [jobPostId, userId]
    );

    if (!job.rows[0]) {
      throw new Error('Job not found or unauthorized');
    }

    await db.query(
      'UPDATE job_posts SET status = $1, closed_at = NOW() WHERE id = $2',
      ['closed', jobPostId]
    );
  }

  /**
   * Delete a job
   */
  async deleteJob(jobPostId: string, userId: string): Promise<void> {
    const job = await db.query(
      'SELECT * FROM job_posts WHERE id = $1 AND posted_by_user_id = $2',
      [jobPostId, userId]
    );

    if (!job.rows[0]) {
      throw new Error('Job not found or unauthorized');
    }

    await db.query(
      'UPDATE job_posts SET deleted_at = NOW() WHERE id = $1',
      [jobPostId]
    );
  }
}

export const employerService = new EmployerService();
