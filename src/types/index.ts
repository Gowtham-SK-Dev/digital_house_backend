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

export interface UserProfile extends User {
  posts?: number;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
}

// Post types
export interface Post {
  id: string;
  userId: string;
  user?: User;
  title?: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Comment types
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user?: User;
  content: string;
  likes: number;
  isLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
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
