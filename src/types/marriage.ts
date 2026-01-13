// Backend/src/types/marriage.ts
// Complete TypeScript types for Marriage Module

export interface MarriageProfile {
  // System Fields
  id: string;
  userId: string;
  createdBy: 'self' | 'parent' | 'guardian';
  createdByUserId: string;

  // Verification
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'pending_reupload';
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;

  // Personal Details
  name: string;
  gender: 'male' | 'female';
  dateOfBirth: Date;
  age: number;

  // Physical Details
  height?: string;
  weight?: string;
  complexion?: 'fair' | 'wheatish' | 'dark';

  // Education & Career
  education?: string;
  profession?: string;
  income?: string;

  // Location
  nativePlace?: string;
  currentLocation?: string;

  // Astrological Details
  caste?: string;
  subCaste?: string;
  gothram?: string;
  raasi?: string;
  natchathiram?: string;
  doshamDetails?: DoshamDetails;
  timeOfBirth?: Date;
  placeOfBirth?: string;

  // Marital Status
  maritalStatus?: string;

  // Family & Expectations
  familyDetails?: FamilyDetails;
  expectations?: Expectations;

  // Media
  photos?: PhotoData[];
  horoscopeFile?: FileData;
  idProofFile?: FileData;
  communityProofFile?: FileData;

  // Privacy & Contact
  contactVisibility: 'hidden' | 'after_accept';

  // Metadata
  profileCompleteness: number;
  matchScore: number;
  views: number;
  interestsReceived: number;
  lastActive: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface MarriageInterest {
  id: string;

  // Who sent interest
  senderProfileId: string;
  senderUserId: string;

  // Who received interest
  receiverProfileId: string;
  receiverUserId: string;

  // Status & Details
  status: 'sent' | 'accepted' | 'rejected' | 'pending_admin_review';
  message?: string;

  // Response Details
  respondedAt?: Date;
  respondedBy?: string;

  // Admin Review
  adminReviewRequested: boolean;
  adminReviewedAt?: Date;
  reviewedBy?: string;
  adminReviewNotes?: string;

  // Contact Details
  contactDetailsSharedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface HoroscopeMatch {
  id: string;

  // Profiles being matched
  profile1Id: string;
  profile2Id: string;

  // 10 Poruthams
  dinaPorutham: number;
  ganaPorutham: number;
  yoniPorutham: number;
  rasiPorutham: number;
  rajjuPorutham: number;
  vasyaPorutham: number;
  mahendraPouthram: number;
  striDirghaPorutham: number;
  vedhaPorutham: number;
  bhakutPorutham: number;

  // Total Score
  totalScore: number;
  percentage: number;
  rating: 'excellent' | 'good' | 'average' | 'poor';

  // Timestamps
  calculatedAt: Date;
  createdAt: Date;
}

export interface AdminVerification {
  id: string;

  // Profile being verified
  profileId: string;

  // Verification Checklist
  idProofVerified: boolean;
  horoscopeVerified: boolean;
  photosVerified: boolean;
  personalDetailsVerified: boolean;
  communityProofVerified: boolean;

  // Duplicate Detection
  isDuplicate: boolean;
  duplicateOfProfileId?: string;

  // Verification Details
  verificationNotes?: string;
  redFlags?: string;

  // Admin Action
  verifiedBy?: string;
  verifiedAt?: Date;
  decision?: 'approved' | 'rejected' | 'pending_reupload';

  // Reupload Tracking
  reuploadRequestedFor?: string;
  reuploadCount: number;
  lastReuploadAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface MarriageReport {
  id: string;

  // Report Details
  reportedProfileId: string;
  reportedByUserId: string;

  // Report Type
  reportType: 'fake_profile' | 'inappropriate_behavior' | 'spam' | 'fraud' | 'wrong_info' | 'scam';
  details?: string;
  screenshots?: ScreenshotData[];

  // Report Status
  status: 'pending' | 'investigating' | 'resolved' | 'false_report';
  adminNotes?: string;

  // Admin Response
  reviewedBy?: string;
  reviewedAt?: Date;

  // Action Taken
  actionTaken?: 'none' | 'warn' | 'ban' | 'profile_deleted' | 'user_suspended';
  actionTakenAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactVisibilityLog {
  id: string;

  // Who viewed what
  viewerUserId: string;
  viewedUserId: string;
  interestId?: string;

  // What was revealed
  infoRevealed: 'phone' | 'email' | 'address' | 'full_photo' | 'horoscope' | 'family_details';
  revealedAt: Date;

  // Context
  context?: 'interest_accepted' | 'mutual_approval' | 'admin_request' | 'direct_contact';

  // Timestamp
  createdAt: Date;
}

export interface DoshamDetails {
  type: 'mangal' | 'rajju' | 'none' | 'other';
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface FamilyDetails {
  fatherName?: string;
  fatherProfession?: string;
  motherName?: string;
  motherProfession?: string;
  siblingsCount?: number;
  siblingDetails?: any[];
  familyBackground?: string;
  familyValues?: string[];
  propertyDetails?: string;
  caste?: string;
  religion?: string;
}

export interface Expectations {
  ageRange?: {
    min: number;
    max: number;
  };
  heightRange?: {
    min: string;
    max: string;
  };
  education?: string[];
  profession?: string[];
  incomeRange?: {
    min: string;
    max: string;
  };
  caste?: string;
  location?: string[];
  otherPreferences?: string;
}

export interface PhotoData {
  id: string;
  url: string;
  uploadedAt: Date;
  isBlurred: boolean;
  watermarked: boolean;
}

export interface FileData {
  id: string;
  documentUrl: string;
  fileType: 'pdf' | 'image';
  uploadedAt: Date;
  verified?: boolean;
  documentType?: 'aadhaar' | 'passport' | 'driving_license' | 'other';
}

export interface ScreenshotData {
  url: string;
  uploadedAt: Date;
}

// Request/Response Types

export interface CreateMarriageProfileRequest {
  createdBy: 'self' | 'parent' | 'guardian';
  name: string;
  gender: 'male' | 'female';
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  height?: string;
  weight?: string;
  complexion?: string;
  education?: string;
  profession?: string;
  income?: string;
  nativePlace?: string;
  currentLocation?: string;
  caste?: string;
  subCaste?: string;
  gothram?: string;
  raasi?: string;
  natchathiram?: string;
  doshamDetails?: DoshamDetails;
  timeOfBirth?: string; // HH:MM:SS
  placeOfBirth?: string;
  maritalStatus?: string;
  familyDetails?: FamilyDetails;
  expectations?: Expectations;
  contactVisibility?: 'hidden' | 'after_accept';
}

export interface UpdateMarriageProfileRequest {
  name?: string;
  height?: string;
  weight?: string;
  complexion?: string;
  education?: string;
  profession?: string;
  income?: string;
  nativePlace?: string;
  currentLocation?: string;
  caste?: string;
  subCaste?: string;
  gothram?: string;
  raasi?: string;
  natchathiram?: string;
  doshamDetails?: DoshamDetails;
  maritalStatus?: string;
  familyDetails?: FamilyDetails;
  expectations?: Expectations;
  contactVisibility?: 'hidden' | 'after_accept';
}

export interface SearchMarriageProfilesRequest {
  gender: 'male' | 'female';
  ageRange?: {
    min: number;
    max: number;
  };
  heightRange?: {
    min: string;
    max: string;
  };
  education?: string[];
  profession?: string[];
  location?: string[];
  incomeRange?: {
    min: string;
    max: string;
  };
  caste?: string;
  subCaste?: string;
  gothram?: string;
  raasi?: string[];
  natchathiram?: string[];
  dosham?: 'with' | 'without' | 'mild';
  maritalStatus?: string[];
  verifiedOnly?: boolean;
  withHoroscope?: boolean;
  withPhotos?: boolean;
  minProfileCompletion?: number;
  sortBy?: 'recent' | 'match_score' | 'age' | 'location';
  page?: number;
  limit?: number;
}

export interface SendInterestRequest {
  receiverProfileId: string;
  message?: string;
}

export interface RespondToInterestRequest {
  status: 'accepted' | 'rejected';
}

export interface ReportProfileRequest {
  reportType: 'fake_profile' | 'inappropriate_behavior' | 'spam' | 'fraud' | 'wrong_info' | 'scam';
  details: string;
  screenshotUrls?: string[];
}

export interface VerifyProfileRequest {
  decision: 'approved' | 'rejected' | 'pending_reupload';
  rejectionReason?: string;
  reuploadRequestedFor?: string;
  verificationNotes?: string;
  redFlags?: string;
  isDuplicate?: boolean;
  duplicateOfProfileId?: string;
}

export interface RespondToReportRequest {
  status: 'investigating' | 'resolved' | 'false_report';
  actionTaken?: 'none' | 'warn' | 'ban' | 'profile_deleted' | 'user_suspended';
  adminNotes?: string;
}

export interface UploadDocumentsRequest {
  horoscopeUrl?: string;
  idProofUrl?: string;
  communityProofUrl?: string;
}

export interface UploadPhotosRequest {
  photoUrls: string[]; // URLs of uploaded photos
}
