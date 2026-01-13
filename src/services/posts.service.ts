import { PostgresDB } from '@config/database';
import {
  Post,
  PostFeedItem,
  Comment,
  Like,
  CreatePostRequest,
  PostFilterOptions,
  CreateCommentRequest,
  PostCategory,
  PostContentType,
} from '@types/index';
import { generateId } from '@utils/helpers';

/**
 * Post Service
 * Handles post creation, feed, interactions (likes, comments, shares)
 * Supports filtering by location circle and category
 */
export class PostService {
  /**
   * Initialize post tables
   */
  static async initializePostTables(): Promise<void> {
    const pool = PostgresDB.getPool();

    try {
      // Posts table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- Content
          content_type VARCHAR(50) NOT NULL,
          content_text TEXT,
          content_images TEXT[],
          content_videos JSONB,
          article_url VARCHAR(500),
          article_title VARCHAR(500),
          article_description TEXT,
          article_image VARCHAR(500),
          
          -- Metadata
          title VARCHAR(255),
          description TEXT,
          category VARCHAR(50) NOT NULL,
          location_circle_id VARCHAR(255),
          location_name VARCHAR(255),
          visibility VARCHAR(50) DEFAULT 'public',
          
          -- Interactions
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          shares_count INTEGER DEFAULT 0,
          
          -- Flags
          is_pinned BOOLEAN DEFAULT FALSE,
          is_sponsored BOOLEAN DEFAULT FALSE,
          
          -- Timestamps
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
        CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location_circle_id);
        CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);

        -- Likes table
        CREATE TABLE IF NOT EXISTS post_likes (
          id VARCHAR(255) PRIMARY KEY,
          post_id VARCHAR(255) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
        CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);

        -- Comments table
        CREATE TABLE IF NOT EXISTS post_comments (
          id VARCHAR(255) PRIMARY KEY,
          post_id VARCHAR(255) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          likes_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at);

        -- Comment likes table
        CREATE TABLE IF NOT EXISTS comment_likes (
          id VARCHAR(255) PRIMARY KEY,
          comment_id VARCHAR(255) NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(comment_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

        -- Shares table
        CREATE TABLE IF NOT EXISTS post_shares (
          id VARCHAR(255) PRIMARY KEY,
          original_post_id VARCHAR(255) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          caption TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_post_shares_original_post_id ON post_shares(original_post_id);
        CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON post_shares(user_id);

        -- Location circles table
        CREATE TABLE IF NOT EXISTS location_circles (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          latitude NUMERIC(10, 8),
          longitude NUMERIC(11, 8),
          radius_km NUMERIC(10, 2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✓ Post tables initialized');
    } catch (error) {
      console.error('Error initializing post tables:', error);
      throw error;
    }
  }

  /**
   * Create a new post
   */
  static async createPost(userId: string, request: CreatePostRequest): Promise<Post> {
    const pool = PostgresDB.getPool();
    const postId = generateId();

    try {
      const result = await pool.query(
        `INSERT INTO posts (
          id, user_id, content_type, content_text, content_images,
          content_videos, article_url, article_title, article_description,
          article_image, title, description, category, location_circle_id,
          location_name, visibility, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          postId,
          userId,
          request.content.type,
          request.content.text || null,
          request.content.images ? JSON.stringify(request.content.images) : null,
          request.content.videos ? JSON.stringify(request.content.videos) : null,
          request.content.articleUrl || null,
          request.content.articleTitle || null,
          request.content.articleDescription || null,
          request.content.articleImage || null,
          request.title || null,
          request.description || null,
          request.category,
          request.locationCircleId || null,
          null, // location_name will be fetched later
          request.visibility || 'public',
        ]
      );

      return this.mapDbToPost(result.rows[0]);
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get post by ID with user details
   */
  static async getPostById(postId: string, viewerId?: string): Promise<PostFeedItem | null> {
    const pool = PostgresDB.getPool();

    try {
      const result = await pool.query(
        `SELECT p.*, u.first_name, u.last_name, u.profile_picture,
                up.verified
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN user_profiles up ON p.user_id = up.user_id
         WHERE p.id = $1`,
        [postId]
      );

      if (result.rows.length === 0) return null;

      const post = this.mapDbToPost(result.rows[0]);
      return this.enrichPostWithUserData(post, result.rows[0], viewerId);
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
  }

  /**
   * Get feed with filtering and pagination
   */
  static async getFeed(
    userId: string,
    filters?: PostFilterOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: PostFeedItem[]; total: number; pages: number }> {
    const pool = PostgresDB.getPool();
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let paramCount = 1;

    try {
      let query = `
        SELECT p.*, u.first_name, u.last_name, u.profile_picture,
               up.verified,
               (SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $${paramCount})) as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN user_profiles up ON p.user_id = up.user_id
        WHERE p.visibility IN ('public', 'friends')
      `;
      params.push(userId);
      paramCount++;

      // Apply filters
      if (filters?.category) {
        query += ` AND p.category = $${paramCount}`;
        params.push(filters.category);
        paramCount++;
      }

      if (filters?.locationCircleId) {
        query += ` AND p.location_circle_id = $${paramCount}`;
        params.push(filters.locationCircleId);
        paramCount++;
      }

      if (filters?.searchQuery) {
        query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.content_text ILIKE $${paramCount})`;
        params.push(`%${filters.searchQuery}%`);
        paramCount++;
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT p\.\*, u\..+?, \(SELECT EXISTS.*?\) as is_liked/,
        'SELECT COUNT(*) as total'
      );
      const countResult = await pool.query(countQuery, params.slice(0, paramCount - 1));
      const total = parseInt(countResult.rows[0].total);
      const pages = Math.ceil(total / limit);

      // Get paginated results
      query += ` ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      const posts = result.rows.map((row) =>
        this.enrichPostWithUserData(this.mapDbToPost(row), row, userId)
      );

      return { posts, total, pages };
    } catch (error) {
      console.error('Error getting feed:', error);
      throw error;
    }
  }

  /**
   * Like a post
   */
  static async likePost(postId: string, userId: string): Promise<{ liked: boolean }> {
    const pool = PostgresDB.getPool();
    const likeId = generateId();

    try {
      // Check if already liked
      const existing = await pool.query(
        'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );

      if (existing.rows.length > 0) {
        // Already liked, unlike it
        await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [
          postId,
          userId,
        ]);

        // Decrement count
        await pool.query('UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1', [
          postId,
        ]);

        return { liked: false };
      }

      // Add like
      await pool.query(
        'INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [likeId, postId, userId]
      );

      // Increment count
      await pool.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1', [postId]);

      return { liked: true };
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  /**
   * Add comment to post
   */
  static async addComment(userId: string, request: CreateCommentRequest): Promise<Comment> {
    const pool = PostgresDB.getPool();
    const commentId = generateId();

    try {
      const result = await pool.query(
        `INSERT INTO post_comments (id, post_id, user_id, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [commentId, request.postId, userId, request.content]
      );

      // Increment post comments count
      await pool.query('UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1', [
        request.postId,
      ]);

      return this.mapDbToComment(result.rows[0]);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Get comments for a post
   */
  static async getPostComments(
    postId: string,
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: Comment[]; total: number }> {
    const pool = PostgresDB.getPool();
    const offset = (page - 1) * limit;

    try {
      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM post_comments WHERE post_id = $1',
        [postId]
      );

      const result = await pool.query(
        `SELECT pc.*, u.first_name, u.last_name, u.profile_picture,
                (SELECT EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = pc.id AND user_id = $2)) as is_liked
         FROM post_comments pc
         JOIN users u ON pc.user_id = u.id
         WHERE pc.post_id = $1
         ORDER BY pc.created_at DESC
         LIMIT $3 OFFSET $4`,
        [postId, userId || null, limit, offset]
      );

      return {
        comments: result.rows.map((row) => this.mapDbToComment(row)),
        total: parseInt(countResult.rows[0].total),
      };
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Like a comment
   */
  static async likeComment(commentId: string, userId: string): Promise<{ liked: boolean }> {
    const pool = PostgresDB.getPool();
    const likeId = generateId();

    try {
      const existing = await pool.query(
        'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      );

      if (existing.rows.length > 0) {
        await pool.query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [
          commentId,
          userId,
        ]);

        await pool.query('UPDATE post_comments SET likes_count = likes_count - 1 WHERE id = $1', [
          commentId,
        ]);

        return { liked: false };
      }

      await pool.query(
        'INSERT INTO comment_likes (id, comment_id, user_id, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [likeId, commentId, userId]
      );

      await pool.query('UPDATE post_comments SET likes_count = likes_count + 1 WHERE id = $1', [
        commentId,
      ]);

      return { liked: true };
    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  }

  /**
   * Share a post
   */
  static async sharePost(
    originalPostId: string,
    userId: string,
    caption?: string
  ): Promise<{ shareId: string; sharesCount: number }> {
    const pool = PostgresDB.getPool();
    const shareId = generateId();

    try {
      // Create share record
      await pool.query(
        `INSERT INTO post_shares (id, original_post_id, user_id, caption, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [shareId, originalPostId, userId, caption || null]
      );

      // Increment shares count on original post
      const result = await pool.query(
        'UPDATE posts SET shares_count = shares_count + 1 WHERE id = $1 RETURNING shares_count',
        [originalPostId]
      );

      return { shareId, sharesCount: result.rows[0].shares_count };
    } catch (error) {
      console.error('Error sharing post:', error);
      throw error;
    }
  }

  /**
   * Get location circles for filtering
   */
  static async getLocationCircles(): Promise<any[]> {
    const pool = PostgresDB.getPool();

    try {
      const result = await pool.query('SELECT * FROM location_circles ORDER BY name ASC');
      return result.rows;
    } catch (error) {
      console.error('Error getting location circles:', error);
      throw error;
    }
  }

  /**
   * Create or get location circle
   */
  static async ensureLocationCircle(name: string): Promise<string> {
    const pool = PostgresDB.getPool();
    const circleId = generateId();

    try {
      // Check if exists
      const existing = await pool.query('SELECT id FROM location_circles WHERE name = $1', [name]);

      if (existing.rows.length > 0) {
        return existing.rows[0].id;
      }

      // Create new
      await pool.query(
        `INSERT INTO location_circles (id, name, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [circleId, name]
      );

      return circleId;
    } catch (error) {
      console.error('Error ensuring location circle:', error);
      throw error;
    }
  }

  /**
   * Delete post
   */
  static async deletePost(postId: string, userId: string): Promise<boolean> {
    const pool = PostgresDB.getPool();

    try {
      const result = await pool.query(
        'DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id',
        [postId, userId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Update post
   */
  static async updatePost(postId: string, userId: string, updates: Partial<CreatePostRequest>): Promise<Post> {
    const pool = PostgresDB.getPool();

    try {
      const post = await this.getPostById(postId, userId);
      if (!post || post.userId !== userId) {
        throw new Error('Post not found or unauthorized');
      }

      const result = await pool.query(
        `UPDATE posts 
         SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          content_text = COALESCE($3, content_text),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [updates.title, updates.description, updates.content?.text, postId, userId]
      );

      return this.mapDbToPost(result.rows[0]);
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  // =============== Helper Methods ===============

  private static mapDbToPost(dbRow: any): Post {
    return {
      id: dbRow.id,
      userId: dbRow.user_id,
      content: {
        type: dbRow.content_type,
        text: dbRow.content_text,
        images: dbRow.content_images ? JSON.parse(dbRow.content_images) : [],
        videos: dbRow.content_videos ? JSON.parse(dbRow.content_videos) : [],
        articleUrl: dbRow.article_url,
        articleTitle: dbRow.article_title,
        articleDescription: dbRow.article_description,
        articleImage: dbRow.article_image,
      },
      category: dbRow.category,
      title: dbRow.title,
      description: dbRow.description,
      likesCount: dbRow.likes_count || 0,
      commentsCount: dbRow.comments_count || 0,
      sharesCount: dbRow.shares_count || 0,
      visibility: dbRow.visibility || 'public',
      isPinned: dbRow.is_pinned || false,
      isSponsored: dbRow.is_sponsored || false,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  private static mapDbToComment(dbRow: any): Comment {
    return {
      id: dbRow.id,
      postId: dbRow.post_id,
      userId: dbRow.user_id,
      content: dbRow.content,
      likesCount: dbRow.likes_count || 0,
      isLiked: dbRow.is_liked || false,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
    };
  }

  private static enrichPostWithUserData(post: Post, dbRow: any, viewerId?: string): PostFeedItem {
    return {
      ...post,
      userProfile: {
        firstName: dbRow.first_name,
        lastName: dbRow.last_name,
        profilePicture: dbRow.profile_picture,
        verified: dbRow.verified || false,
      },
      isLiked: dbRow.is_liked || false,
    };
  }
}
