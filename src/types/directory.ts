// Business Directory Types and Interfaces

// ============================================
// ENUMS
// ============================================

export enum BusinessCategory {
  CATERING = 'Catering',
  GROCERY = 'Grocery',
  FARMING = 'Farming',
  TAILORING = 'Tailoring',
  TUITION = 'Tuition',
  BEAUTY_SALON = 'Beauty & Salon',
  CONSTRUCTION = 'Construction',
  TRANSPORT = 'Transport',
  EVENT_MANAGEMENT = 'Event Management',
  PRINTING = 'Printing',
  IT_SERVICES = 'IT Services',
  INTERIOR_DESIGN = 'Interior Design',
  ELECTRICAL = 'Electrical',
  PLUMBING = 'Plumbing',
  MEDICAL = 'Medical'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

export enum ContactMode {
  CALL = 'call',
  CHAT = 'chat',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp'
}

export enum PriceRange {
  AFFORDABLE = 'affordable',
  MID_RANGE = 'mid-range',
  PREMIUM = 'premium',
  LUXURY = 'luxury'
}

export enum InquiryType {
  CALL = 'call',
  CHAT = 'chat',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp'
}

export enum InquiryStatus {
  PENDING = 'pending',
  RESPONDED = 'responded',
  COMPLETED = 'completed',
  CLOSED = 'closed'
}

export enum ReportType {
  FAKE_BUSINESS = 'fake_business',
  SCAM = 'scam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FALSE_CLAIMS = 'false_claims',
  HARASSMENT = 'harassment',
  OTHER = 'other'
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  HIDDEN = 'hidden'
}

export enum DocumentType {
  ID_PROOF = 'id_proof',
  BUSINESS_PROOF = 'business_proof',
  LOCATION_PROOF = 'location_proof',
  COMMUNITY_PROOF = 'community_proof'
}

// ============================================
// CORE INTERFACES
// ============================================

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface WorkingHours {
  [day: string]: {
    open: string; // HH:MM format
    close: string;
    isClosed?: boolean;
  };
}

export interface BusinessProfile {
  id: string;
  ownerId: string;
  businessName: string;
  categoryId: string;
  description?: string;
  experienceYears: number;
  address?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  locationCoordinates?: LocationCoordinates;
  workingHours: WorkingHours;
  contactMode: ContactMode;
  phone: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  priceRange?: PriceRange;
  serviceArea?: string;
  homeDelivery: boolean;
  verificationStatus: VerificationStatus;
  verificationDate?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  totalInquiries: number;
  totalReviews: number;
  averageRating: number;
  fraudFlags: string[];
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: Date;
  lastActive?: Date;
  visibility: 'public' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessCategory {
  id: string;
  categoryName: string;
  description?: string;
  iconUrl?: string;
  slug: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessService {
  id: string;
  businessId: string;
  serviceName: string;
  description?: string;
  price?: number;
  priceRange?: string;
  estimatedDuration?: string;
  availability: 'available' | 'seasonal' | 'custom';
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessPhoto {
  id: string;
  businessId: string;
  photoUrl: string;
  watermarkedUrl?: string;
  photoType: 'profile' | 'gallery' | 'document' | 'verification';
  caption?: string;
  uploadedBy: string;
  isPrimary: boolean;
  isWatermarked: boolean;
  verificationFlag?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationDocument {
  id: string;
  businessId: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName?: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  rejectionReason?: string;
  verifiedAt?: Date;
  fraudFlags: string[];
  isWatermarked: boolean;
  watermarkedUrl?: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessInquiry {
  id: string;
  businessId: string;
  inquirerId: string;
  serviceId?: string;
  inquiryType: InquiryType;
  message: string;
  status: InquiryStatus;
  responseMessage?: string;
  respondedAt?: Date;
  conversationData: Record<string, any>;
  contactShared: boolean;
  canReview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessReview {
  id: string;
  businessId: string;
  reviewerId: string;
  inquiryId: string;
  rating: number; // 1-5
  comment?: string;
  isAnonymous: boolean;
  moderationStatus: ModerationStatus;
  moderatedBy?: string;
  moderationReason?: string;
  moderatedAt?: Date;
  helpfulCount: number;
  unhelpfulCount: number;
  photoUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessReport {
  id: string;
  businessId: string;
  reporterId: string;
  reportType: ReportType;
  reasonText: string;
  evidenceUrls: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  upvoteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedBusiness {
  id: string;
  userId: string;
  businessId: string;
  savedAt: Date;
}

export interface BusinessNotification {
  id: string;
  recipientId: string;
  businessId?: string;
  notificationType: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateBusinessRequest {
  businessName: string;
  categoryId: string;
  description?: string;
  experienceYears: number;
  address?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  locationCoordinates?: LocationCoordinates;
  workingHours: WorkingHours;
  contactMode: ContactMode;
  phone: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  priceRange?: PriceRange;
  serviceArea?: string;
  homeDelivery?: boolean;
}

export interface UpdateBusinessRequest {
  businessName?: string;
  description?: string;
  experienceYears?: number;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  locationCoordinates?: LocationCoordinates;
  workingHours?: WorkingHours;
  contactMode?: ContactMode;
  phone?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  priceRange?: PriceRange;
  serviceArea?: string;
  homeDelivery?: boolean;
  visibility?: 'public' | 'private';
}

export interface BusinessSearchFilters {
  searchQuery?: string;
  categoryId?: string;
  city?: string;
  district?: string;
  state?: string;
  priceRange?: PriceRange;
  homeDelivery?: boolean;
  rating?: number;
  verifiedOnly?: boolean;
  topRated?: boolean;
  sortBy?: 'recent' | 'rating' | 'inquiries' | 'name';
  page?: number;
  limit?: number;
}

export interface CreateInquiryRequest {
  serviceId?: string;
  inquiryType: InquiryType;
  message: string;
}

export interface CreateReviewRequest {
  inquiryId: string;
  rating: number;
  comment?: string;
  photoUrls?: string[];
}

export interface CreateReportRequest {
  reportType: ReportType;
  reasonText: string;
  evidenceUrls?: string[];
}

export interface AdminVerifyBusinessRequest {
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
}

export interface AdminBlockBusinessRequest {
  blockedReason: string;
}

export interface AddCategoryRequest {
  categoryName: string;
  description?: string;
  iconUrl?: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface BusinessSearchResponse {
  businesses: BusinessProfile[];
  total: number;
  page: number;
  limit: number;
}

export interface BusinessDetailResponse {
  business: BusinessProfile;
  services: BusinessService[];
  photos: BusinessPhoto[];
  reviews: BusinessReview[];
  averageRating: number;
  totalReviews: number;
  isSaved: boolean;
  hasInquired: boolean;
}

export interface BusinessAnalyticsResponse {
  totalInquiries: number;
  totalReviews: number;
  averageRating: number;
  inquiriesByMonth: Array<{ month: string; count: number }>;
  reviewsByRating: Record<number, number>;
  topServices: Array<{ id: string; name: string; count: number }>;
}

export interface VerificationDocumentResponse {
  requiredDocuments: DocumentType[];
  uploadedDocuments: VerificationDocument[];
  completionPercentage: number;
  status: VerificationStatus;
}

export interface AdminDashboardResponse {
  pendingVerifications: number;
  reportedBusinesses: number;
  blockedBusinesses: number;
  totalBusinesses: number;
  recentReports: BusinessReport[];
  pendingReviews: BusinessReview[];
}
