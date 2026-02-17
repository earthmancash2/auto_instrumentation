import express, { Request, Response } from 'express';
import { db } from '@marketplace/database';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { trackEvent } from '../middleware/analytics-tracking';
import { getCache, setCache } from '../utils/redis';

const router = express.Router();

// List products (with caching)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, minPrice, maxPrice, page = '1', limit = '20' } = req.query;

    const cacheKey = `products:${category}:${minPrice}:${maxPrice}:${page}:${limit}`;

    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log('[Cache Hit]', cacheKey); // Legacy logging
      return res.json(cached);
    }

    // Build query (intentionally inefficient - no query builder)
    let query = 'SELECT * FROM products WHERE status = $1';
    const params: any[] = ['active'];
    let paramIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (minPrice) {
      query += ` AND price >= $${paramIndex}`;
      params.push(parseInt(minPrice as string) * 100);
      paramIndex++;
    }

    if (maxPrice) {
      query += ` AND price <= $${paramIndex}`;
      params.push(parseInt(maxPrice as string) * 100);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string));
    params.push((parseInt(page as string) - 1) * parseInt(limit as string));

    const result = await db.query(query, params);

    // Get total count (separate query - N+1 pattern)
    const countResult = await db.query('SELECT COUNT(*) FROM products WHERE status = $1', ['active']);
    const total = parseInt(countResult.rows[0].count);

    const response = {
      products: result.rows,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      hasMore: total > parseInt(page as string) * parseInt(limit as string),
    };

    // Cache for 5 minutes
    await setCache(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    console.error('[List Products Error]', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];

    // Track product view (inconsistent naming)
    trackEvent('product_viewed', {
      productId: product.id,
      productTitle: product.title,
      price: product.price,
      category: product.category,
    });

    res.json(product);
  } catch (error) {
    console.error('[Get Product Error]', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (sellers only)
router.post('/', authenticate, requireRole('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price, category, tags, imageUrl, stock } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `INSERT INTO products (seller_id, title, description, price, category, tags, image_url, stock, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.userId, title, description, price * 100, category, tags || [], imageUrl, stock || 0, 'active']
    );

    const product = result.rows[0];

    // Track product creation (different event naming)
    trackEvent('ProductCreated', {
      productId: product.id,
      sellerId: req.userId,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('[Create Product Error]', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (seller only, must own product)
router.put('/:id', authenticate, requireRole('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, tags, imageUrl, stock, status } = req.body;

    // Check ownership
    const existing = await db.query('SELECT seller_id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (existing.rows[0].seller_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update product (messy update logic)
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (title) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      params.push(price * 100);
      paramIndex++;
    }
    if (category) {
      updates.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (tags) {
      updates.push(`tags = $${paramIndex}`);
      params.push(tags);
      paramIndex++;
    }
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${paramIndex}`);
      params.push(imageUrl);
      paramIndex++;
    }
    if (stock !== undefined) {
      updates.push(`stock = $${paramIndex}`);
      params.push(stock);
      paramIndex++;
    }
    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    params.push(id);

    const query = `UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, params);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Update Product Error]', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (soft delete)
router.delete('/:id', authenticate, requireRole('seller'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = await db.query('SELECT seller_id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (existing.rows[0].seller_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Soft delete
    await db.query('UPDATE products SET status = $1 WHERE id = $2', ['deleted', id]);

    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('[Delete Product Error]', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
