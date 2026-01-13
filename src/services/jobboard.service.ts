// Backend/src/services/jobboard.service.ts
// Core job board business logic

import { db } from '../config/database';
import {
  JobPost,
  CreateJobPostRequest,
  UpdateJobPostRequest,
  JobSearchFilters,
  JobApplication,
  SavedJob,
  JobNotification,
} from '../types/jobboard';

export class JobBoardService {
  /**
   * Create a new job post
   */
  async createJobPost(
    userId: string,
    employerProfileId: string,
    data: CreateJobPostRequest
  ): Promise<JobPost> {
    // Verify employer is verified
    const employer = await db.query(
      'SELECT verification_status FROM employer_profiles WHERE id = $1 AND user_id = $2',
      [employerProfileId, userId]
    );

    if (!employer.rows[0]) {
      throw new Error('Employer profile not found');
    }

    if (employer.rows[0].verification_status !== 'verified') {
      throw new Error('Employer must be verified to post jobs');
    }

    // Check for fraud indicators
    const hasExternalLinks = this.detectExternalLinks(
      data.jobDescription + data.responsibilities + data.qualifications
    );
    const hasPhoneNumbers = this.detectPhoneNumbers(
      data.jobDescription + data.responsibilities
    );
    const hasWhatsappNumbers = this.detectWhatsappNumbers(
      data.jobDescription + data.responsibilities
    );

    const result = await db.query(
      `INSERT INTO job_posts (
        posted_by_user_id,
        employer_profile_id,
        job_title,
        job_description,
        responsibilities,
        qualifications,
        company_name,
        company_website,
        job_type,
        work_mode,
        job_location,
        job_city,
        job_state,
        job_country,
        experience_min,
        experience_max,
        salary_min,
        salary_max,
        salary_currency,
        skills_required,
        key_responsibilities,
        nice_to_have_skills,
        contact_mode,
        contact_email,
        contact_phone,
        last_date_to_apply,
        has_external_links,
        has_phone_numbers,
        has_whatsapp_numbers
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *`,
      [
        userId,
        employerProfileId,
        data.jobTitle,
        data.jobDescription,
        data.responsibilities,
        data.qualifications,
        data.companyName,
        data.companyWebsite,
        data.jobType,
        data.workMode,
        data.jobLocation,
        data.jobCity,
        data.jobState,
        data.jobCountry,
        data.experienceMin,
        data.experienceMax,
        data.salaryMin,
        data.salaryMax,
        data.salaryCurrency || 'INR',
        data.skillsRequired,
        data.keyResponsibilities,
        data.niceToHaveSkills,
        data.contactMode,
        data.contactEmail,
        data.contactPhone,
        data.lastDateToApply,
        hasExternalLinks,
        hasPhoneNumbers,
        hasWhatsappNumbers,
      ]
    );

    // Auto-block if suspicious content detected
    if (hasWhatsappNumbers || (hasPhoneNumbers && hasExternalLinks)) {
      await db.query(
        'UPDATE job_posts SET status = $1, suspicious_content = $2 WHERE id = $3',
        ['rejected', true, result.rows[0].id]
      );
    }

    return result.rows[0];
  }

  /**
   * Update an existing job post
   */
  async updateJobPost(
    jobPostId: string,
    userId: string,
    data: UpdateJobPostRequest
  ): Promise<JobPost> {
    // Verify ownership
    const post = await db.query(
      'SELECT * FROM job_posts WHERE id = $1 AND posted_by_user_id = $2',
      [jobPostId, userId]
    );

    if (!post.rows[0]) {
      throw new Error('Job post not found or unauthorized');
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.jobTitle) {
      updateFields.push(`job_title = $${paramIndex++}`);
      values.push(data.jobTitle);
    }
    if (data.jobDescription) {
      updateFields.push(`job_description = $${paramIndex++}`);
      values.push(data.jobDescription);
    }
    if (data.responsibilities) {
      updateFields.push(`responsibilities = $${paramIndex++}`);
      values.push(data.responsibilities);
    }
    if (data.qualifications) {
      updateFields.push(`qualifications = $${paramIndex++}`);
      values.push(data.qualifications);
    }
    if (data.salaryMin !== undefined) {
      updateFields.push(`salary_min = $${paramIndex++}`);
      values.push(data.salaryMin);
    }
    if (data.salaryMax !== undefined) {
      updateFields.push(`salary_max = $${paramIndex++}`);
      values.push(data.salaryMax);
    }
    if (data.skillsRequired) {
      updateFields.push(`skills_required = $${paramIndex++}`);
      values.push(data.skillsRequired);
    }
    if (data.lastDateToApply) {
      updateFields.push(`last_date_to_apply = $${paramIndex++}`);
      values.push(data.lastDateToApply);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(jobPostId);

    const result = await db.query(
      `UPDATE job_posts SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Search jobs with filters
   */
  async searchJobs(filters: JobSearchFilters): Promise<JobPost[]> {
    let query = `
      SELECT jp.* FROM job_posts jp
      WHERE jp.status = 'approved' AND jp.deleted_at IS NULL
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.searchQuery) {
      query += ` AND (
        jp.job_title ILIKE $${paramIndex}
        OR jp.job_description ILIKE $${paramIndex}
        OR jp.company_name ILIKE $${paramIndex}
      )`;
      params.push(`%${filters.searchQuery}%`);
      paramIndex++;
    }

    if (filters.jobTitle) {
      query += ` AND jp.job_title ILIKE $${paramIndex}`;
      params.push(`%${filters.jobTitle}%`);
      paramIndex++;
    }

    if (filters.skillsRequired && filters.skillsRequired.length > 0) {
      query += ` AND jp.skills_required && $${paramIndex}`;
      params.push(filters.skillsRequired);
      paramIndex++;
    }

    if (filters.companyName) {
      query += ` AND jp.company_name ILIKE $${paramIndex}`;
      params.push(`%${filters.companyName}%`);
      paramIndex++;
    }

    if (filters.jobType && filters.jobType.length > 0) {
      query += ` AND jp.job_type = ANY($${paramIndex})`;
      params.push(filters.jobType);
      paramIndex++;
    }

    if (filters.workMode && filters.workMode.length > 0) {
      query += ` AND jp.work_mode = ANY($${paramIndex})`;
      params.push(filters.workMode);
      paramIndex++;
    }

    if (filters.experienceLevel && filters.experienceLevel.length > 0) {
      query += ` AND jp.experience_level = ANY($${paramIndex})`;
      params.push(filters.experienceLevel);
      paramIndex++;
    }

    if (filters.location || filters.city) {
      const location = filters.location || filters.city;
      query += ` AND (jp.job_location ILIKE $${paramIndex} OR jp.job_city ILIKE $${paramIndex})`;
      params.push(`%${location}%`, `%${location}%`);
      paramIndex++;
    }

    if (filters.salaryMin) {
      query += ` AND jp.salary_max >= $${paramIndex}`;
      params.push(filters.salaryMin);
      paramIndex++;
    }

    if (filters.salaryMax) {
      query += ` AND jp.salary_min <= $${paramIndex}`;
      params.push(filters.salaryMax);
      paramIndex++;
    }

    // Sorting
    const sortBy = filters.sortBy || 'recent';
    if (sortBy === 'recent') {
      query += ` ORDER BY jp.created_at DESC`;
    } else if (sortBy === 'salary_high') {
      query += ` ORDER BY jp.salary_max DESC NULLS LAST`;
    } else if (sortBy === 'salary_low') {
      query += ` ORDER BY jp.salary_min ASC NULLS LAST`;
    } else if (sortBy === 'match_score') {
      query += ` ORDER BY jp.views DESC`;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(filters.limit || 20, filters.offset || 0);

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get job details
   */
  async getJobDetails(jobPostId: string): Promise<JobPost> {
    const result = await db.query(
      'SELECT * FROM job_posts WHERE id = $1 AND deleted_at IS NULL',
      [jobPostId]
    );

    if (!result.rows[0]) {
      throw new Error('Job post not found');
    }

    // Increment views
    await db.query('UPDATE job_posts SET views = views + 1 WHERE id = $1', [
      jobPostId,
    ]);

    return result.rows[0];
  }

  /**
   * Apply to a job
   */
  async applyToJob(
    jobPostId: string,
    jobSeekerId: string,
    userId: string,
    resumeUrl: string,
    resumeFileName: string,
    coverMessage?: string
  ): Promise<JobApplication> {
    // Check if already applied
    const existing = await db.query(
      'SELECT id FROM job_applications WHERE job_post_id = $1 AND job_seeker_id = $2',
      [jobPostId, jobSeekerId]
    );

    if (existing.rows[0]) {
      throw new Error('Already applied to this job');
    }

    // Get job and seeker profiles for match scoring
    const jobResult = await db.query(
      'SELECT skills_required FROM job_posts WHERE id = $1',
      [jobPostId]
    );

    const seekerResult = await db.query(
      'SELECT skills FROM job_seeker_profiles WHERE id = $1',
      [jobSeekerId]
    );

    const skillsRequired = jobResult.rows[0].skills_required || [];
    const seekerSkills = seekerResult.rows[0].skills || [];

    // Calculate match score
    const matchScore = this.calculateMatchScore(skillsRequired, seekerSkills);

    const result = await db.query(
      `INSERT INTO job_applications (
        job_post_id,
        job_seeker_id,
        user_id,
        resume_url,
        resume_file_name,
        cover_message,
        match_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [jobPostId, jobSeekerId, userId, resumeUrl, resumeFileName, coverMessage, matchScore]
    );

    // Update job applications count
    await db.query(
      'UPDATE job_posts SET total_applications = total_applications + 1 WHERE id = $1',
      [jobPostId]
    );

    // Create notification for employer
    await this.createNotification(
      jobResult.rows[0].posted_by_user_id,
      'new_application',
      `New application for ${jobResult.rows[0].job_title}`,
      `/jobs/applications/${jobPostId}`,
      jobPostId
    );

    return result.rows[0];
  }

  /**
   * Save a job
   */
  async saveJob(jobPostId: string, jobSeekerId: string, userId: string): Promise<SavedJob> {
    const result = await db.query(
      `INSERT INTO saved_jobs (job_post_id, job_seeker_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (job_seeker_id, job_post_id) 
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [jobPostId, jobSeekerId, userId]
    );

    return result.rows[0];
  }

  /**
   * Get saved jobs for a seeker
   */
  async getSavedJobs(jobSeekerId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    const result = await db.query(
      `SELECT sj.*, jp.job_title, jp.company_name, jp.job_location, jp.salary_min, jp.salary_max
       FROM saved_jobs sj
       JOIN job_posts jp ON sj.job_post_id = jp.id
       WHERE sj.job_seeker_id = $1 AND jp.deleted_at IS NULL
       ORDER BY sj.created_at DESC
       LIMIT $2 OFFSET $3`,
      [jobSeekerId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get applications for a job (employer view)
   */
  async getJobApplications(
    jobPostId: string,
    userId: string,
    status?: string
  ): Promise<JobApplication[]> {
    // Verify user owns this job
    const jobOwner = await db.query(
      'SELECT posted_by_user_id FROM job_posts WHERE id = $1',
      [jobPostId]
    );

    if (!jobOwner.rows[0] || jobOwner.rows[0].posted_by_user_id !== userId) {
      throw new Error('Unauthorized');
    }

    let query = 'SELECT * FROM job_applications WHERE job_post_id = $1';
    const params: any[] = [jobPostId];

    if (status) {
      query += ' AND application_status = $2';
      params.push(status);
    }

    query += ' ORDER BY match_score DESC, created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Shortlist an application
   */
  async shortlistApplication(
    applicationId: string,
    userId: string
  ): Promise<JobApplication> {
    // Verify user is employer
    const app = await db.query(
      `SELECT ja.* FROM job_applications ja
       JOIN job_posts jp ON ja.job_post_id = jp.id
       WHERE ja.id = $1 AND jp.posted_by_user_id = $2`,
      [applicationId, userId]
    );

    if (!app.rows[0]) {
      throw new Error('Application not found');
    }

    const result = await db.query(
      `UPDATE job_applications 
       SET application_status = 'shortlisted', shortlisted_at = NOW(), shortlisted_by = $2
       WHERE id = $1
       RETURNING *`,
      [applicationId, userId]
    );

    // Update job shortlist count
    const jobId = app.rows[0].job_post_id;
    await db.query(
      'UPDATE job_posts SET total_shortlisted = total_shortlisted + 1 WHERE id = $1',
      [jobId]
    );

    // Create notification for applicant
    await this.createNotification(
      app.rows[0].user_id,
      'application_shortlisted',
      'You have been shortlisted!',
      `/jobs/applications/${jobId}`,
      null,
      applicationId
    );

    return result.rows[0];
  }

  /**
   * Reject an application
   */
  async rejectApplication(
    applicationId: string,
    userId: string,
    reason?: string
  ): Promise<JobApplication> {
    const app = await db.query(
      `SELECT ja.* FROM job_applications ja
       JOIN job_posts jp ON ja.job_post_id = jp.id
       WHERE ja.id = $1 AND jp.posted_by_user_id = $2`,
      [applicationId, userId]
    );

    if (!app.rows[0]) {
      throw new Error('Application not found');
    }

    const result = await db.query(
      `UPDATE job_applications 
       SET application_status = 'rejected', rejected_at = NOW(), rejection_reason = $2
       WHERE id = $1
       RETURNING *`,
      [applicationId, reason]
    );

    // Create notification for applicant
    await this.createNotification(
      app.rows[0].user_id,
      'application_shortlisted', // Different message
      'Your application was not selected',
      null
    );

    return result.rows[0];
  }

  /**
   * Detect external links in text
   */
  private detectExternalLinks(text: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    return urlRegex.test(text);
  }

  /**
   * Detect phone numbers
   */
  private detectPhoneNumbers(text: string): boolean {
    const phoneRegex = /(\+?91[\s\-]?)?\d{10}|\+\d{1,3}\s?\d{1,14}/g;
    return phoneRegex.test(text);
  }

  /**
   * Detect WhatsApp numbers
   */
  private detectWhatsappNumbers(text: string): boolean {
    return /(whatsapp|wa\.me|watsapp)/gi.test(text);
  }

  /**
   * Calculate skill match score
   */
  private calculateMatchScore(required: string[], seekerSkills: string[]): number {
    if (required.length === 0) return 100;

    const matches = required.filter((skill) =>
      seekerSkills.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
    );

    return Math.round((matches.length / required.length) * 100);
  }

  /**
   * Create a notification
   */
  private async createNotification(
    userId: string,
    type: string,
    message: string,
    actionUrl?: string,
    jobPostId?: string,
    jobApplicationId?: string
  ): Promise<void> {
    await db.query(
      `INSERT INTO job_notifications (
        user_id,
        notification_type,
        title,
        message,
        action_url,
        job_post_id,
        job_application_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, type, message, message, actionUrl, jobPostId, jobApplicationId]
    );
  }
}

export const jobBoardService = new JobBoardService();
