// Chat System - TypeScript Interfaces & Types

// ============================================================================
// ENUMS
// ============================================================================

export enum ChatContextType {
  MARRIAGE = 'marriage',
  JOB = 'job',
  BUSINESS = 'business',
  HELP = 'help',
  GENERAL = 'general',
}

export enum ChatStatus {
  ACTIVE = 'active',
  MUTED = 'muted',
  BLOCKED = 'blocked',
  REPORTED = 'reported',
  CLOSED = 'closed',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VOICE = 'voice',
}

export enum ReportType {
  ABUSE = 'abuse',
  HARASSMENT = 'harassment',
  SCAM = 'scam',
  HATE_SPEECH = 'hate_speech',
  SEXUAL_CONTENT = 'sexual_content',
  SPAM = 'spam',
  FRAUD = 'fraud',
  IMPERSONATION = 'impersonation',
  OTHER = 'other',
}

export enum ModerationAction {
  CHAT_WARNING = 'chat_warning',
  CHAT_MUTE = 'chat_mute',
  CHAT_CLOSE = 'chat_close',
  MESSAGE_DELETE = 'message_delete',
  MESSAGE_HIDE = 'message_hide',
  USER_WARN = 'user_warn',
  USER_MUTE = 'user_mute',
  USER_BAN = 'user_ban',
  USER_UNBAN = 'user_unban',
  CONTENT_REMOVE = 'content_remove',
  REPORT_RESOLVE = 'report_resolve',
  REPORT_DISMISS = 'report_dismiss',
  REPORT_ESCALATE = 'report_escalate',
}

export enum VirusStatus {
  CLEAN = 'clean',
  INFECTED = 'infected',
  SUSPICIOUS = 'suspicious',
}

// ============================================================================
// CORE DATA INTERFACES
// ============================================================================

export interface ChatRoom {
  chatId: string;
  userIdA: string;
  userIdB: string;
  contextType: ChatContextType;
  contextId?: string;
  status: ChatStatus;
  mutedBy?: string;
  mutedAt?: Date;
  blockedBy?: string;
  blockedAt?: Date;
  blockReason?: string;
  reportedBy?: string;
  reportReason?: string;
  reportedAt?: Date;
  lastMessageId?: string;
  lastMessageAt?: Date;
  messageCount: number;
  unreadCountA: number;
  unreadCountB: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  isDeleted: boolean;
}

export interface ChatMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  messageType: MessageType;
  content: string;
  encrypted: boolean;
  replyToId?: string;
  isFlagged: boolean;
  flaggedReason?: string;
  flaggedBy?: string;
  containsPhone: boolean;
  containsEmail: boolean;
  containsUpi: boolean;
  containsExternalLink: boolean;
  containsSuspiciousKeyword: boolean;
  isDeleted: boolean;
  isHidden: boolean;
  isRetracted: boolean;
  reportCount: number;
  sentAt: Date;
  readAt?: Date;
  editedAt?: Date;
}

export interface ChatAttachment {
  attachmentId: string;
  messageId: string;
  chatId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  encryptedFilePath: string;
  fileHash: string;
  isEncrypted: boolean;
  isDownloaded: boolean;
  downloadCount: number;
  downloadAllowed: boolean;
  expiryAt?: Date;
  virusScanned: boolean;
  virusStatus: VirusStatus;
  isDeleted: boolean;
  createdAt: Date;
}

export interface ChatReport {
  reportId: string;
  chatId: string;
  messageId?: string;
  reportedBy: string;
  reportedUser: string;
  reportType: ReportType;
  description: string;
  screenshotUrl?: string;
  evidenceData?: Record<string, any>;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewNotes?: string;
  actionTaken?: string;
  resolvedAt?: Date;
  escalatedToLegal: boolean;
  legalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBlock {
  blockId: string;
  blockerId: string;
  blockedId: string;
  blockReason?: string;
  blockType: 'manual' | 'admin' | 'automatic';
  isPermanent: boolean;
  expiresAt?: Date;
  blockedByAdmin?: string;
  adminReason?: string;
  isActive: boolean;
  unblockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatContextLink {
  contextLinkId: string;
  chatId: string;
  contextType: ChatContextType;
  contextId: string;
  initiatedFrom?: string;
  requiresApproval: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationLog {
  logId: string;
  adminId: string;
  targetType: 'chat_room' | 'message' | 'user';
  targetId: string;
  action: ModerationAction;
  reason: string;
  durationMinutes?: number;
  notes?: string;
  relatedReportId?: string;
  relatedChatId?: string;
  relatedMessageId?: string;
  userStrikeCount: number;
  appealAllowed: boolean;
  appealDeadline?: Date;
  appealedAt?: Date;
  appealDecision?: 'upheld' | 'overturned';
  appealReviewedBy?: string;
  createdAt: Date;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface InitiateChatRequest {
  otherUserId: string;
  contextType: ChatContextType;
  contextId?: string;
  message?: string;
}

export interface SendMessageRequest {
  chatId: string;
  messageType: MessageType;
  content: string;
  replyToId?: string;
  attachmentIds?: string[];
}

export interface CreateChatReportRequest {
  chatId: string;
  messageId?: string;
  reportedUserId: string;
  reportType: ReportType;
  description: string;
  screenshotUrl?: string;
  evidence?: Record<string, any>;
}

export interface BlockUserRequest {
  blockedUserId: string;
  blockReason?: string;
  isPermanent: boolean;
  expiresAt?: Date;
}

export interface MuteUserRequest {
  durationMinutes: number;
}

export interface ChatListResponse {
  chatId: string;
  otherUser: {
    userId: string;
    name: string;
    avatar: string;
    isVerified: boolean;
  };
  contextType: ChatContextType;
  status: ChatStatus;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  isMuted: boolean;
  isBlocked: boolean;
}

export interface ChatDetailResponse {
  chatId: string;
  participants: Array<{
    userId: string;
    name: string;
    avatar: string;
  }>;
  contextType: ChatContextType;
  contextId?: string;
  status: ChatStatus;
  messages: ChatMessage[];
  totalMessages: number;
  isMuted: boolean;
  isBlocked: boolean;
  blockedBy?: string;
  canSendMessages: boolean;
}

export interface MessageResponse {
  messageId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  isFlagged: boolean;
  sentAt: Date;
  readAt?: Date;
}

export interface ChatReportResponse {
  reportId: string;
  reportType: ReportType;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
}

export interface UserStrikeData {
  userId: string;
  totalStrikes: number;
  recentStrikes: ModerationLog[];
  isBanned: boolean;
  banExpires?: Date;
  warningCount: number;
  lastActionDate?: Date;
}

export interface AdminDashboardStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  flaggedMessages: number;
  reportsByType: Record<ReportType, number>;
  topReporters: Array<{ userId: string; count: number }>;
  topOffenders: Array<{ userId: string; strikes: number }>;
  abusePatterns: Array<{ pattern: string; frequency: number }>;
  averageResolutionTime: number;
}

// ============================================================================
// SAFETY DETECTION TYPES
// ============================================================================

export interface SafetyFlags {
  hasPhoneNumber: boolean;
  phoneNumbers?: string[];
  hasEmail: boolean;
  emails?: string[];
  hasUpi: boolean;
  upiAddresses?: string[];
  hasExternalLink: boolean;
  externalLinks?: string[];
  hasSuspiciousKeyword: boolean;
  suspiciousKeywords?: string[];
  overallRisk: 'safe' | 'warning' | 'danger';
}

export interface ConversationContext {
  contextType: ChatContextType;
  contextId: string;
  displayName: string;
  status: 'active' | 'expired' | 'pending_approval';
  approvedAt?: Date;
  expiresAt?: Date;
}
