// Backend/src/types/jobboard.ts
// Type definitions for Job Board module

export interface JobSeekerProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  currentLocation: string;
  currentCity: string;
  currentState?: string;
  currentCountry: string;
  education: string;
  skills: string[];
  experienceYears: number;
  experienceLevel: 'fresher' | '1-3' | '3-5' | '5+';
  preferredLocation: string;
  preferredCities: string[];
  jobTypePreference: 'full-time' | 'part-time' | 'internship' | 'contract';
  workModePreference: 'onsite' | 'hybrid' | 'remote';
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  resumeUrl: string;
  resumeOriginalName: string;
  watermarked: boolean;
  visibility: 'public' | 'community-only';
  profileCompleteness: number; // 0-100
  views: number;
  applicationsSent: number;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  companyName: string;
  companyEmail: string;
  companyPhone?: string;
  companyWebsite?: string;
  linkedinProfile?: string;
  companyDescription?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
  officeLocation: string;
  officeCity: string;
  officeState?: string;
  officeCountry: string;
  companyRegistrationDocUrl: string;
  idProofUrl: string;
  idProofType: 'aadhar' | 'pan' | 'driving_license' | 'passport';
  idProofName: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  totalJobsPosted: number;
  totalApplications: number;
  totalHires: number;
  rating: number; // 0-5
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: Date;
  blockedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface JobPost {
  id: string;
  postedByUserId: string;
  employerProfileId: string;
  jobTitle: string;
  jobDescription: string;
  responsibilities: string;
  qualifications: string;
  companyName: string;
  companyWebsite?: string;
  jobType: 'full-time' | 'part-time' | 'internship' | 'contract';
  workMode: 'onsite' | 'hybrid' | 'remote';
  jobLocation: string;
  jobCity: string;
  jobState?: string;
  jobCountry: string;
  experienceMin: number; // years
  experienceMax: number; // years
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryPeriod: 'hourly' | 'monthly' | 'annually';
  skillsRequired: string[];
  keyResponsibilities: string[];
  niceToHaveSkills?: string[];
  contactMode: 'chat' | 'email' | 'phone';
  contactEmail?: string;
  contactPhone?: string;
  lastDateToApply: Date;
  status: 'pending' | 'approved' | 'rejected' | 'closed' | 'expired';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  hasExternalLinks: boolean;
  hasPhoneNumbers: boolean;
  hasWhatsappNumbers: boolean;
  suspiciousContent: boolean;
  totalApplications: number;
  totalShortlisted: number;
  totalHired: number;
  views: number;
  isFeatured: boolean;
  featuredUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  deletedAt?: Date;
}

export interface JobApplication {
  id: string;
  jobPostId: string;
  jobSeekerId: string;
  userId: string;
  resumeUrl: string;
  resumeFileName: string;
  coverMessage?: string;
  applicationStatus: 'applied' | 'shortlisted' | 'rejected' | 'offered' | 'hired' | 'withdrawn';
  shortlistedAt?: Date;
  shortlistedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  viewedAt?: Date;
  viewedBy?: string;
  ratingByEmployer?: number; // 0-5
  feedbackByEmployer?: string;
  isWithdrawn: boolean;
  withdrawnAt?: Date;
  matchScore: number; // 0-100
  daysSinceApplied: number;
  createdAt: Date;
  appliedAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface SavedJob {
  id: string;
  jobPostId: string;
  jobSeekerId: string;
  userId: string;
  notes?: string;
  isInterested: boolean;
  isApplied: boolean;
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobReport {
  id: string;
  reportType: 'job_post' | 'employer_profile';
  jobPostId?: string;
  employerProfileId?: string;
  reportedByUserId: string;
  reason: 'fake_job' | 'spam' | 'inappropriate' | 'scam' | 'harassment' | 'external_links' | 'other';
  description: string;
  evidenceUrls?: string[];
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: Date;
  actionTaken?: 'job_removed' | 'employer_verified' | 'employer_blocked' | 'no_action';
  resolutionNotes?: string;
  isSpamReport: boolean;
  upvotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobChat {
  id: string;
  conversationId: string;
  employerId: string;
  jobSeekerId: string;
  jobPostId?: string;
  jobApplicationId?: string;
  senderId: string;
  senderType: 'employer' | 'seeker';
  messageText: string;
  messageType: 'text' | 'offer' | 'status_update';
  attachmentUrls?: string[];
  hasExternalLinks: boolean;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  isFlagged: boolean;
  flaggedReason?: 'spam' | 'inappropriate' | 'suspicious_link' | 'harassment';
  flaggedAt?: Date;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobNotification {
  id: string;
  userId: string;
  jobPostId?: string;
  jobApplicationId?: string;
  triggeredByUserId?: string;
  notificationType: 
    | 'job_approved'
    | 'new_application'
    | 'application_shortlisted'
    | 'message_received'
    | 'job_match'
    | 'job_expiring'
    | 'saved_job_updated';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
}

export interface JobSearchFilters {
  searchQuery?: string;
  jobTitle?: string;
  skillsRequired?: string[];
  companyName?: string;
  jobType?: string[];
  workMode?: string[];
  experienceLevel?: string[];
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  salaryMin?: number;
  salaryMax?: number;
  sortBy?: 'recent' | 'salary_high' | 'salary_low' | 'match_score';
  limit?: number;
  offset?: number;
}

export interface JobApplicationRequest {
  jobPostId: string;
  resumeUrl: string;
  resumeFileName: string;
  coverMessage?: string;
}

export interface CreateJobPostRequest {
  jobTitle: string;
  jobDescription: string;
  responsibilities: string;
  qualifications: string;
  companyName: string;
  companyWebsite?: string;
  jobType: 'full-time' | 'part-time' | 'internship' | 'contract';
  workMode: 'onsite' | 'hybrid' | 'remote';
  jobLocation: string;
  jobCity: string;
  jobState?: string;
  jobCountry: string;
  experienceMin: number;
  experienceMax: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  skillsRequired: string[];
  keyResponsibilities?: string[];
  niceToHaveSkills?: string[];
  contactMode: 'chat' | 'email' | 'phone';
  contactEmail?: string;
  contactPhone?: string;
  lastDateToApply: Date;
}

export interface UpdateJobPostRequest {
  jobTitle?: string;
  jobDescription?: string;
  responsibilities?: string;
  qualifications?: string;
  salaryMin?: number;
  salaryMax?: number;
  skillsRequired?: string[];
  lastDateToApply?: Date;
}

export interface EmployerVerificationRequest {
  companyName: string;
  companyEmail: string;
  companyWebsite?: string;
  officeLocation: string;
  officeCity: string;
  officeCountry: string;
  companyRegistrationDocUrl: string;
  idProofUrl: string;
  idProofType: 'aadhar' | 'pan' | 'driving_license' | 'passport';
  idProofName: string;
}

export interface JobRequirement {
  id: string;
  requirementName: string;
  requirementType: 'skill' | 'qualification' | 'experience';
  category?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminJobAction {
  jobPostId: string;
  action: 'approve' | 'reject';
  reason?: string;
  notes?: string;
}

export interface AdminEmployerAction {
  employerProfileId: string;
  action: 'verify' | 'reject' | 'block';
  reason?: string;
  notes?: string;
}
