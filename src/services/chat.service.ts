/**
 * Socket.io Service for Real-Time Chat and Notifications
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '@config/config';
import { JwtService } from '@utils/helpers';

interface SocketUser {
  userId: string;
  email: string;
  socketId: string;
}

export class ChatService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.socketIO.corsOrigin,
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = JwtService.verifyToken(token);
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      console.log(`User connected: ${user.userId}`);

      // Track connected user
      this.connectedUsers.set(user.userId, {
        userId: user.userId,
        email: user.email,
        socketId: socket.id,
      });

      // Emit user online status
      this.io.emit('user_online', {
        userId: user.userId,
        status: 'online',
      });

      // Join user's personal room
      socket.join(`user_${user.userId}`);

      // Handle private message
      socket.on('send_message', (data: any) => {
        this.handlePrivateMessage(socket, data);
      });

      // Handle typing indicator
      socket.on('user_typing', (data: any) => {
        this.handleUserTyping(socket, data);
      });

      // Handle message read
      socket.on('message_read', (data: any) => {
        this.handleMessageRead(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket, user.userId);
      });
    });
  }

  private handlePrivateMessage(socket: Socket, data: any): void {
    const { conversationId, recipientId, content, images } = data;
    const sender = socket.data.user;

    // TODO: Save message to database

    // Send to recipient
    this.io.to(`user_${recipientId}`).emit('new_message', {
      conversationId,
      senderId: sender.userId,
      senderEmail: sender.email,
      content,
      images: images || [],
      timestamp: new Date(),
    });

    // Confirm to sender
    socket.emit('message_sent', {
      conversationId,
      timestamp: new Date(),
    });

    // Create notification for recipient
    this.io.to(`user_${recipientId}`).emit('notification', {
      type: 'message',
      title: 'New message',
      body: `${sender.email} sent you a message`,
      senderId: sender.userId,
    });
  }

  private handleUserTyping(socket: Socket, data: any): void {
    const { conversationId, recipientId } = data;
    const sender = socket.data.user;

    this.io.to(`user_${recipientId}`).emit('user_typing', {
      conversationId,
      userId: sender.userId,
      isTyping: true,
    });
  }

  private handleMessageRead(socket: Socket, data: any): void {
    const { messageId, conversationId, senderId } = data;

    // TODO: Update message read status in database

    this.io.to(`user_${senderId}`).emit('message_read', {
      messageId,
      conversationId,
      readBy: socket.data.user.userId,
      readAt: new Date(),
    });
  }

  private handleDisconnect(socket: Socket, userId: string): void {
    this.connectedUsers.delete(userId);
    console.log(`User disconnected: ${userId}`);

    // Notify others
    this.io.emit('user_offline', {
      userId,
      status: 'offline',
    });
  }

  /**
   * Send notification to specific user
   */
  public sendNotification(
    userId: string,
    type: string,
    title: string,
    body: string
  ): void {
    this.io.to(`user_${userId}`).emit('notification', {
      type,
      title,
      body,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast notification to multiple users
   */
  public broadcastNotification(
    userIds: string[],
    type: string,
    title: string,
    body: string
  ): void {
    userIds.forEach((userId) => {
      this.sendNotification(userId, type, title, body);
    });
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get Socket.io server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}
