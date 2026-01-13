import { Router, Request, Response } from 'express';
import { PostService } from '@services/posts.service';
import { createApiResponse } from '@utils/apiResponse';
import { authMiddleware } from '@middleware/auth';

const router = Router();

/**
 * Initialize post tables (run once)
 * POST /api/posts/init
 */
router.post('/init', async (req: Request, res: Response) => {
  try {
    await PostService.initializePostTables();
    res.json(createApiResponse(true, 'Post tables initialized', null));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Initialization failed', null, error.message));
  }
});

/**
 * Get location circles for filtering
 * GET /api/posts/location-circles
 */
router.get('/location-circles', async (req: Request, res: Response) => {
  try {
    const circles = await PostService.getLocationCircles();
    res.json(createApiResponse(true, 'Location circles retrieved', circles));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Failed to get locations', null, error.message));
  }
});

/**
 * Get home feed with filtering
 * GET /api/posts/feed?page=1&limit=20&category=business&locationCircleId=circle123
 */
router.get('/feed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { page = 1, limit = 20, category, locationCircleId, searchQuery } = req.query;

    const result = await PostService.getFeed(
      userId,
      {
        category: category as string,
        locationCircleId: locationCircleId as string,
        searchQuery: searchQuery as string,
      },
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(
      createApiResponse(true, 'Feed retrieved', {
        posts: result.posts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: result.pages,
        },
      })
    );
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Failed to get feed', null, error.message));
  }
});

/**
 * Create a new post
 * POST /api/posts
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const postRequest = req.body;

    // Validate required fields
    if (!postRequest.content || !postRequest.category) {
      return res
        .status(400)
        .json(createApiResponse(false, 'Content and category are required', null));
    }

    const post = await PostService.createPost(userId, postRequest);
    res.status(201).json(createApiResponse(true, 'Post created successfully', post));
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to create post', null, error.message));
  }
});

/**
 * Get post by ID
 * GET /api/posts/:postId
 */
router.get('/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const viewerId = (req as any).userId;

    const post = await PostService.getPostById(postId, viewerId);

    if (!post) {
      return res.status(404).json(createApiResponse(false, 'Post not found', null));
    }

    res.json(createApiResponse(true, 'Post retrieved', post));
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Failed to get post', null, error.message));
  }
});

/**
 * Update post
 * PATCH /api/posts/:postId
 */
router.patch('/:postId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const updates = req.body;

    const updatedPost = await PostService.updatePost(postId, userId, updates);
    res.json(createApiResponse(true, 'Post updated successfully', updatedPost));
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to update post', null, error.message));
  }
});

/**
 * Delete post
 * DELETE /api/posts/:postId
 */
router.delete('/:postId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;

    const deleted = await PostService.deletePost(postId, userId);

    if (!deleted) {
      return res.status(404).json(createApiResponse(false, 'Post not found or unauthorized', null));
    }

    res.json(createApiResponse(true, 'Post deleted successfully', null));
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to delete post', null, error.message));
  }
});

/**
 * Like/Unlike a post
 * POST /api/posts/:postId/like
 */
router.post('/:postId/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;

    const result = await PostService.likePost(postId, userId);
    res.json(
      createApiResponse(true, result.liked ? 'Post liked' : 'Post unliked', {
        postId,
        liked: result.liked,
      })
    );
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to like post', null, error.message));
  }
});

/**
 * Share a post
 * POST /api/posts/:postId/share
 */
router.post('/:postId/share', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const { caption } = req.body;

    const result = await PostService.sharePost(postId, userId, caption);
    res.json(createApiResponse(true, 'Post shared successfully', result));
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to share post', null, error.message));
  }
});

/**
 * Add comment to post
 * POST /api/posts/:postId/comments
 */
router.post('/:postId/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json(createApiResponse(false, 'Comment content is required', null));
    }

    const comment = await PostService.addComment(userId, { postId, content });
    res.status(201).json(createApiResponse(true, 'Comment added successfully', comment));
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to add comment', null, error.message));
  }
});

/**
 * Get comments for a post
 * GET /api/posts/:postId/comments?page=1&limit=20
 */
router.get('/:postId/comments', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const viewerId = (req as any).userId;

    const result = await PostService.getPostComments(
      postId,
      viewerId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(
      createApiResponse(true, 'Comments retrieved', {
        comments: result.comments,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      })
    );
  } catch (error: any) {
    res.status(500).json(createApiResponse(false, 'Failed to get comments', null, error.message));
  }
});

/**
 * Like/Unlike a comment
 * POST /api/posts/comments/:commentId/like
 */
router.post('/comments/:commentId/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { commentId } = req.params;

    const result = await PostService.likeComment(commentId, userId);
    res.json(
      createApiResponse(true, result.liked ? 'Comment liked' : 'Comment unliked', {
        commentId,
        liked: result.liked,
      })
    );
  } catch (error: any) {
    res.status(400).json(createApiResponse(false, 'Failed to like comment', null, error.message));
  }
});

export default router;
