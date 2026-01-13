// Response types for standardized API responses
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: number;
}

// User types
export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  bio?: string;
  location?: string;
  community?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Profile Privacy Levels
export type PrivacyLevel = 'public' | 'friends' | 'private';

// User Profile Fields Privacy
export interface ProfilePrivacy {
  photo: PrivacyLevel;
  work: PrivacyLevel;
  maritalStatus: PrivacyLevel;
  interests: PrivacyLevel;
  businessInfo: PrivacyLevel;
  skills: PrivacyLevel;
  bio: PrivacyLevel;
  location: PrivacyLevel;
}

// Complete User Profile
export interface UserProfile extends User {
  // Profile fields
  work?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say';
  interests?: string[];
  businessInfo?: {
    businessName?: string;
    businessType?: string;
    businessDescription?: string;
    websiteUrl?: string;
    contactPhone?: string;
  };
  skills?: string[];
  
  // Profile metadata
  verified: boolean;
  verificationDate?: Date;
  verificationNotes?: string;
  
  // Privacy settings
  privacy: ProfilePrivacy;
  
  // Social stats
  posts?: number;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
  
  // Timestamps
  lastProfileUpdate?: Date;
}

// Profile Update Request DTO
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  photo?: string;
  location?: string;
  work?: string;
  maritalStatus?: string;
  interests?: string[];
  businessInfo?: {
    businessName?: string;
    businessType?: string;
    businessDescription?: string;
    websiteUrl?: string;
    contactPhone?: string;
  };
  skills?: string[];
  bio?: string;
  privacy?: Partial<ProfilePrivacy>;
}

// Admin Profile Verification Request
export interface AdminVerificationRequest {
  userId: string;
  verified: boolean;
  verificationNotes?: string;
}

// Profile View Response (respects privacy)
export interface ProfileViewResponse {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  location?: string;
  bio?: string;
  work?: string;
  maritalStatus?: string;
  interests?: string[];
  businessInfo?: UserProfile['businessInfo'];
  skills?: string[];
  verified: boolean;
  posts?: number;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
  lastProfileUpdate?: Date;
  // Indicates if full profile is visible or partially hidden
  hasFullAccess: boolean;
  hiddenFields?: string[];
}

// Post Content Types
export type PostContentType = 'text' | 'image' | 'article' | 'video';

// Post Category Types
export type PostCategory = 
  | 'business' 
  | 'job' 
  | 'marriage' 
  | 'education' 
  | 'health' 
  | 'event' 
  | 'story' 
  | 'article' 
  | 'support' 
  | 'community' 
  | 'other';

// Location Circle (City/Region)
export interface LocationCircle {
  id: string;
  name: string;        // 'Coimbatore', 'Erode', etc.
  latitude: number;
  longitude: number;
  radius: number;      // in km
}

// Post Content Details
export interface PostContent {
  type: PostContentType;
  text?: string;
  images?: string[];
  videos?: {
    url: string;
    thumbnail?: string;
    duration?: number;
  }[];
  articleUrl?: string;
  articleTitle?: string;
  articleDescription?: string;
  articleImage?: string;
}

// Main Post Interface
export interface Post {
  id: string;
  userId: string;
  user?: User;
  content: PostContent;
  category: PostCategory;
  locationCircle?: LocationCircle;
  title?: string;
  description?: string;
  
  // Interactions
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  
  // Metadata
  visibility: 'public' | 'friends' | 'circle';  // circle = location-based
  isPinned?: boolean;
  isSponsored?: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Post Creation Request
export interface CreatePostRequest {
  content: PostContent;
  category: PostCategory;
  locationCircleId?: string;
  title?: string;
  description?: string;
  visibility?: 'public' | 'friends' | 'circle';
}

// Post Feed Response (with interactions)
export interface PostFeedItem extends Post {
  userProfile?: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
    verified: boolean;
  };
  isLiked?: boolean;
  hasCommented?: boolean;
  comments?: Comment[];
}

// Comment types
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user?: User;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  repliesCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Like type
export interface Like {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  user?: User;
  createdAt: Date;
}

// Share type
export interface Share {
  id: string;
  originalPostId: string;
  userId: string;
  caption?: string;
  createdAt: Date;
}

// Post Filter Options
export interface PostFilterOptions {
  category?: PostCategory;
  locationCircleId?: string;
  userId?: string;
  searchQuery?: string;
  visibility?: 'public' | 'friends' | 'circle';
  startDate?: Date;
  endDate?: Date;
}

// Comment Request
export interface CreateCommentRequest {
  postId: string;
  content: string;
}

// Message types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  images?: string[];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails?: User[];
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: 'follow' | 'like' | 'comment' | 'message' | 'mention';
  title: string;
  body: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: Date;
}

// Community types
export interface Community {
  id: string;
  name: string;
  description?: string;
  image?: string;
  members: number;
  isMember?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Auth types
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface OTPRequest {
  email: string;
  phone?: string;
  otp?: string;
}
