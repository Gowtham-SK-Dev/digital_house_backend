// Category Management Routes
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import db from '../config/database';
import { apiResponse } from '../utils/apiResponse';

const router = Router();

// Middleware to check admin role
const adminOnly = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(apiResponse(null, false, 'Admin access required'));
  }
  next();
};

/**
 * Get all categories
 * GET /admin/categories
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT * FROM business_categories
      WHERE deleted_at IS NULL
      ORDER BY category_name ASC
    `;

    const result = await db.query(query);
    res.json(apiResponse(result.rows, true, 'Categories retrieved'));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve categories'));
  }
});

/**
 * Get active categories
 * GET /admin/categories/active
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT * FROM business_categories
      WHERE is_active = true AND deleted_at IS NULL
      ORDER BY category_name ASC
    `;

    const result = await db.query(query);
    res.json(apiResponse(result.rows, true, 'Active categories retrieved'));
  } catch (error) {
    console.error('Get active categories error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve active categories'));
  }
});

/**
 * Create category
 * POST /admin/categories
 */
router.post('/', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { categoryName, description, iconUrl } = req.body;

    if (!categoryName) {
      return res.status(400).json(apiResponse(null, false, 'Category name required'));
    }

    // Generate slug
    const slug = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const query = `
      INSERT INTO business_categories (category_name, description, icon_url, slug, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [categoryName, description || null, iconUrl || null, slug, req.user.id]);

    res.status(201).json(apiResponse(result.rows[0], true, 'Category created'));
  } catch (error: any) {
    console.error('Create category error:', error);

    if (error.code === '23505') {
      return res.status(400).json(apiResponse(null, false, 'Category name already exists'));
    }

    res.status(500).json(apiResponse(null, false, 'Failed to create category'));
  }
});

/**
 * Update category
 * PUT /admin/categories/:categoryId
 */
router.put('/:categoryId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { categoryName, description, iconUrl, isActive } = req.body;

    let query = `UPDATE business_categories SET `;
    const values: any[] = [categoryId];
    let paramCount = 2;

    if (categoryName !== undefined) {
      query += `category_name = $${paramCount++}, `;
      values.push(categoryName);
    }
    if (description !== undefined) {
      query += `description = $${paramCount++}, `;
      values.push(description);
    }
    if (iconUrl !== undefined) {
      query += `icon_url = $${paramCount++}, `;
      values.push(iconUrl);
    }
    if (isActive !== undefined) {
      query += `is_active = $${paramCount++}, `;
      values.push(isActive);
    }

    query += `updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, false, 'Category not found'));
    }

    res.json(apiResponse(result.rows[0], true, 'Category updated'));
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to update category'));
  }
});

/**
 * Delete category (soft delete)
 * DELETE /admin/categories/:categoryId
 */
router.delete('/:categoryId', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    const query = `
      UPDATE business_categories
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    const result = await db.query(query, [categoryId]);

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, false, 'Category not found'));
    }

    res.json(apiResponse(null, true, 'Category deleted'));
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to delete category'));
  }
});

/**
 * Get category statistics
 * GET /admin/categories/:categoryId/stats
 */
router.get('/:categoryId/stats', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    const query = `
      SELECT
        bc.*, 
        COUNT(DISTINCT bp.id) as total_businesses,
        COUNT(DISTINCT CASE WHEN bp.verification_status = 'verified' THEN bp.id END) as verified_businesses,
        AVG(bp.average_rating) as avg_rating
      FROM business_categories bc
      LEFT JOIN business_profiles bp ON bc.id = bp.category_id
      WHERE bc.id = $1 AND bc.deleted_at IS NULL
      GROUP BY bc.id
    `;

    const result = await db.query(query, [categoryId]);

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, false, 'Category not found'));
    }

    res.json(apiResponse(result.rows[0], true, 'Category statistics retrieved'));
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve category statistics'));
  }
});

/**
 * Get category with businesses
 * GET /admin/categories/:categoryId/businesses
 */
router.get('/:categoryId/businesses', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    const query = `
      SELECT bp.*
      FROM business_profiles bp
      WHERE bp.category_id = $1 AND bp.deleted_at IS NULL
      ORDER BY bp.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [categoryId, limit, offset]);

    res.json(
      apiResponse(
        {
          businesses: result.rows,
          page,
          limit,
          total: result.rows.length,
        },
        true,
        'Businesses retrieved'
      )
    );
  } catch (error) {
    console.error('Get category businesses error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to retrieve businesses'));
  }
});

/**
 * Toggle category active status
 * POST /admin/categories/:categoryId/toggle
 */
router.post('/:categoryId/toggle', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    const query = `
      UPDATE business_categories
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [categoryId]);

    if (result.rows.length === 0) {
      return res.status(404).json(apiResponse(null, false, 'Category not found'));
    }

    res.json(apiResponse(result.rows[0], true, 'Category status updated'));
  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to toggle category status'));
  }
});

/**
 * Bulk create default categories
 * POST /admin/categories/bulk/create-defaults
 */
router.post('/bulk/create-defaults', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const defaultCategories = [
      { name: 'Catering', slug: 'catering' },
      { name: 'Grocery', slug: 'grocery' },
      { name: 'Farming', slug: 'farming' },
      { name: 'Tailoring', slug: 'tailoring' },
      { name: 'Tuition', slug: 'tuition' },
      { name: 'Beauty & Salon', slug: 'beauty-salon' },
      { name: 'Construction', slug: 'construction' },
      { name: 'Transport', slug: 'transport' },
      { name: 'Event Management', slug: 'event-management' },
      { name: 'Printing', slug: 'printing' },
      { name: 'IT Services', slug: 'it-services' },
      { name: 'Interior Design', slug: 'interior-design' },
      { name: 'Electrical', slug: 'electrical' },
      { name: 'Plumbing', slug: 'plumbing' },
      { name: 'Medical', slug: 'medical' },
    ];

    const created = [];

    for (const cat of defaultCategories) {
      try {
        const result = await db.query(
          `INSERT INTO business_categories (category_name, slug, created_by) 
           VALUES ($1, $2, $3) 
           ON CONFLICT DO NOTHING
           RETURNING *`,
          [cat.name, cat.slug, req.user.id]
        );

        if (result.rows.length > 0) {
          created.push(result.rows[0]);
        }
      } catch (err) {
        console.error(`Failed to create category ${cat.name}:`, err);
      }
    }

    res.status(201).json(
      apiResponse(created, true, `${created.length} default categories created`)
    );
  } catch (error) {
    console.error('Bulk create defaults error:', error);
    res.status(500).json(apiResponse(null, false, 'Failed to create default categories'));
  }
});

export default router;
