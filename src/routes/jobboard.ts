// Backend/src/routes/jobboard.ts
// Job board user routes (job seeker and employer)

import { Router, Request, Response } from 'express';
import { authenticateToken, checkRole } from '../middleware/auth';
import { jobBoardService } from '../services/jobboard.service';
import { jobSeekerService } from '../services/jobseeker.service';
import { employerService } from '../services/employer.service';
import { jobChatService } from '../services/jobchat.service';
import { apiResponse } from '../utils/apiResponse';

const router = Router();

// ============== JOB SEEKER ROUTES ==============

/**
 * Create/Update job seeker profile
 * POST /api/jobboard/seeker/profile
 */
router.post(
  '/seeker/profile',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      const profile = await jobSeekerService.createOrUpdateProfile(
        req.user.id,
        req.body
      );
      return apiResponse(res, 201, 'Profile created/updated successfully', profile);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get job seeker profile
 * GET /api/jobboard/seeker/profile
 */
router.get(
  '/seeker/profile',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      const profile = await jobSeekerService.getProfile(req.user.id);
      return apiResponse(res, 200, 'Profile retrieved', profile);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Upload resume
 * POST /api/jobboard/seeker/upload-resume
 */
router.post(
  '/seeker/upload-resume',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return apiResponse(res, 400, 'No file uploaded');
      }

      const profile = await jobSeekerService.getProfile(req.user.id);
      const resumeUrl = await jobSeekerService.uploadResume(
        profile.id,
        req.user.id,
        req.file.buffer,
        req.file.originalname
      );

      return apiResponse(res, 200, 'Resume uploaded successfully', { resumeUrl });
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Search jobs
 * POST /api/jobboard/search
 */
router.post(
  '/search',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const jobs = await jobBoardService.searchJobs(req.body);
      return apiResponse(res, 200, 'Jobs found', jobs);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get job details
 * GET /api/jobboard/jobs/:jobId
 */
router.get(
  '/jobs/:jobId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const job = await jobBoardService.getJobDetails(req.params.jobId);
      return apiResponse(res, 200, 'Job details retrieved', job);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Apply to job
 * POST /api/jobboard/jobs/:jobId/apply
 */
router.post(
  '/jobs/:jobId/apply',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      const profile = await jobSeekerService.getProfile(req.user.id);
      const application = await jobBoardService.applyToJob(
        req.params.jobId,
        profile.id,
        req.user.id,
        req.body.resumeUrl,
        req.body.resumeFileName,
        req.body.coverMessage
      );
      return apiResponse(res, 201, 'Application submitted', application);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get sent applications
 * GET /api/jobboard/seeker/applications
 */
router.get(
  '/seeker/applications',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      const profile = await jobSeekerService.getProfile(req.user.id);
      const applications = await jobSeekerService.getApplicationsSent(
        profile.id,
        req.query.status as string,
        parseInt(req.query.limit as string) || 20,
        parseInt(req.query.offset as string) || 0
      );
      return apiResponse(res, 200, 'Applications retrieved', applications);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get application details
 * GET /api/jobboard/applications/:applicationId
 */
router.get(
  '/applications/:applicationId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const application = await jobSeekerService.getApplicationDetail(
        req.params.applicationId,
        req.user.id
      );
      return apiResponse(res, 200, 'Application retrieved', application);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Withdraw application
 * POST /api/jobboard/applications/:applicationId/withdraw
 */
router.post(
  '/applications/:applicationId/withdraw',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      await jobSeekerService.withdrawApplication(req.params.applicationId, req.user.id);
      return apiResponse(res, 200, 'Application withdrawn');
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Save job
 * POST /api/jobboard/jobs/:jobId/save
 */
router.post(
  '/jobs/:jobId/save',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      const profile = await jobSeekerService.getProfile(req.user.id);
      const saved = await jobBoardService.saveJob(
        req.params.jobId,
        profile.id,
        req.user.id
      );
      return apiResponse(res, 201, 'Job saved', saved);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get saved jobs
 * GET /api/jobboard/seeker/saved-jobs
 */
router.get(
  '/seeker/saved-jobs',
  authenticateToken,
  checkRole('job_seeker'),
  async (req: Request, res: Response) => {
    try {
      const profile = await jobSeekerService.getProfile(req.user.id);
      const jobs = await jobBoardService.getSavedJobs(
        profile.id,
        parseInt(req.query.limit as string) || 20,
        parseInt(req.query.offset as string) || 0
      );
      return apiResponse(res, 200, 'Saved jobs retrieved', jobs);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

// ============== EMPLOYER ROUTES ==============

/**
 * Create employer profile
 * POST /api/jobboard/employer/profile
 */
router.post(
  '/employer/profile',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const profile = await employerService.createProfile(req.user.id, req.body);
      return apiResponse(res, 201, 'Employer profile created', profile);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get employer profile
 * GET /api/jobboard/employer/profile
 */
router.get(
  '/employer/profile',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const profile = await employerService.getProfile(req.user.id);
      return apiResponse(res, 200, 'Employer profile retrieved', profile);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Update employer profile
 * PUT /api/jobboard/employer/profile
 */
router.put(
  '/employer/profile',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const profile = await employerService.updateProfile(req.user.id, req.body);
      return apiResponse(res, 200, 'Profile updated', profile);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Create job post
 * POST /api/jobboard/employer/jobs
 */
router.post(
  '/employer/jobs',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const employer = await employerService.getProfile(req.user.id);
      const job = await jobBoardService.createJobPost(
        req.user.id,
        employer.id,
        req.body
      );
      return apiResponse(res, 201, 'Job posted successfully', job);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Update job post
 * PUT /api/jobboard/jobs/:jobId
 */
router.put(
  '/jobs/:jobId',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const job = await jobBoardService.updateJobPost(
        req.params.jobId,
        req.user.id,
        req.body
      );
      return apiResponse(res, 200, 'Job updated', job);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get employer's posted jobs
 * GET /api/jobboard/employer/jobs
 */
router.get(
  '/employer/jobs',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const jobs = await employerService.getPostedJobs(
        req.user.id,
        req.query.status as string,
        parseInt(req.query.limit as string) || 20,
        parseInt(req.query.offset as string) || 0
      );
      return apiResponse(res, 200, 'Jobs retrieved', jobs);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Close a job
 * POST /api/jobboard/jobs/:jobId/close
 */
router.post(
  '/jobs/:jobId/close',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      await employerService.closeJob(req.params.jobId, req.user.id);
      return apiResponse(res, 200, 'Job closed');
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Delete a job
 * DELETE /api/jobboard/jobs/:jobId
 */
router.delete(
  '/jobs/:jobId',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      await employerService.deleteJob(req.params.jobId, req.user.id);
      return apiResponse(res, 200, 'Job deleted');
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get job applicants (employer view)
 * GET /api/jobboard/jobs/:jobId/applicants
 */
router.get(
  '/jobs/:jobId/applicants',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const applicants = await employerService.getJobApplicants(
        req.params.jobId,
        req.user.id,
        req.query.status as string
      );
      return apiResponse(res, 200, 'Applicants retrieved', applicants);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Shortlist application
 * POST /api/jobboard/applications/:applicationId/shortlist
 */
router.post(
  '/applications/:applicationId/shortlist',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const app = await jobBoardService.shortlistApplication(
        req.params.applicationId,
        req.user.id
      );
      return apiResponse(res, 200, 'Application shortlisted', app);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Reject application
 * POST /api/jobboard/applications/:applicationId/reject
 */
router.post(
  '/applications/:applicationId/reject',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const app = await jobBoardService.rejectApplication(
        req.params.applicationId,
        req.user.id,
        req.body.reason
      );
      return apiResponse(res, 200, 'Application rejected', app);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get employer dashboard stats
 * GET /api/jobboard/employer/dashboard
 */
router.get(
  '/employer/dashboard',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const stats = await employerService.getDashboardStats(req.user.id);
      return apiResponse(res, 200, 'Dashboard stats retrieved', stats);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

// ============== MESSAGING ROUTES ==============

/**
 * Send message
 * POST /api/jobboard/chat/send
 */
router.post(
  '/chat/send',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const message = await jobChatService.sendMessage(
        req.body.employerId,
        req.body.jobSeekerId,
        req.user.id,
        req.body.messageText,
        req.body.jobPostId,
        req.body.jobApplicationId,
        req.body.attachmentUrls
      );
      return apiResponse(res, 201, 'Message sent', message);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get conversation
 * GET /api/jobboard/chat/:employerId/:jobSeekerId
 */
router.get(
  '/chat/:employerId/:jobSeekerId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const messages = await jobChatService.getConversation(
        req.params.employerId,
        req.params.jobSeekerId,
        req.user.id,
        parseInt(req.query.limit as string) || 50,
        parseInt(req.query.offset as string) || 0
      );
      return apiResponse(res, 200, 'Conversation retrieved', messages);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Get user conversations
 * GET /api/jobboard/chat/conversations
 */
router.get(
  '/chat/conversations',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const conversations = await jobChatService.getUserConversations(
        req.user.id,
        parseInt(req.query.limit as string) || 20
      );
      return apiResponse(res, 200, 'Conversations retrieved', conversations);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

/**
 * Send offer
 * POST /api/jobboard/chat/send-offer
 */
router.post(
  '/chat/send-offer',
  authenticateToken,
  checkRole('employer'),
  async (req: Request, res: Response) => {
    try {
      const message = await jobChatService.sendOfferMessage(
        req.user.id,
        req.body.jobSeekerId,
        req.body.jobApplicationId,
        req.body.offerDetails
      );
      return apiResponse(res, 201, 'Offer sent', message);
    } catch (error: any) {
      return apiResponse(res, 400, error.message);
    }
  }
);

export default router;
