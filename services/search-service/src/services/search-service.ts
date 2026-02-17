import { db } from '@marketplace/database';
import { ProductSearchQuery, ProductSearchResult } from '@marketplace/shared';

/**
 * Search Service
 * ANTI-PATTERN: Directly accesses Core API's database (products table)
 * In a proper microservices architecture, this should call Core API's endpoints
 */
export class SearchService {
  async search(query: ProductSearchQuery): Promise<ProductSearchResult> {
    try {
      // Build search query using PostgreSQL full-text search
      let sqlQuery = `
        SELECT p.*, ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
        FROM products p
        LEFT JOIN product_search_index psi ON p.id = psi.product_id
        WHERE p.status = 'active'
          AND search_vector @@ plainto_tsquery('english', $1)
      `;

      const params: any[] = [query.query];
      let paramIndex = 2;

      // Add filters
      if (query.category) {
        sqlQuery += ` AND p.category = $${paramIndex}`;
        params.push(query.category);
        paramIndex++;
      }

      if (query.minPrice !== undefined) {
        sqlQuery += ` AND p.price >= $${paramIndex}`;
        params.push(query.minPrice);
        paramIndex++;
      }

      if (query.maxPrice !== undefined) {
        sqlQuery += ` AND p.price <= $${paramIndex}`;
        params.push(query.maxPrice);
        paramIndex++;
      }

      // Order by relevance
      sqlQuery += ` ORDER BY rank DESC, p.created_at DESC`;

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      sqlQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      // Execute query
      const result = await db.query(sqlQuery, params);

      // Get total count (separate query - performance issue)
      let countQuery = `
        SELECT COUNT(*)
        FROM products p
        LEFT JOIN product_search_index psi ON p.id = psi.product_id
        WHERE p.status = 'active'
          AND search_vector @@ plainto_tsquery('english', $1)
      `;
      const countParams: any[] = [query.query];
      if (query.category) {
        countQuery += ` AND p.category = $2`;
        countParams.push(query.category);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      return {
        products: result.rows,
        total,
        page,
        limit,
        hasMore: total > page * limit,
      };
    } catch (error) {
      console.error('[Search Service] Search error:', error);
      throw error;
    }
  }

  /**
   * Index all products for search
   * ANTI-PATTERN: Directly modifies Core API's database
   */
  async indexAllProducts(): Promise<number> {
    try {
      // Get all active products (direct database access)
      const result = await db.query('SELECT id, title, description, category, tags FROM products WHERE status = $1', [
        'active',
      ]);

      const products = result.rows;

      for (const product of products) {
        await this.indexProduct(product.id);
      }

      return products.length;
    } catch (error) {
      console.error('[Search Service] Index all error:', error);
      throw error;
    }
  }

  /**
   * Index a single product
   * ANTI-PATTERN: Directly modifies Core API's database table
   */
  async indexProduct(productId: string): Promise<void> {
    try {
      // Get product (direct database access)
      const productResult = await db.query(
        'SELECT id, title, description, category, tags FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];

      // Build search text
      const searchText = [
        product.title,
        product.description || '',
        product.category,
        (product.tags || []).join(' '),
      ].join(' ');

      // Update search index (direct write to product_search_index table)
      await db.query(
        `INSERT INTO product_search_index (product_id, search_vector, indexed_at)
         VALUES ($1, to_tsvector('english', $2), CURRENT_TIMESTAMP)
         ON CONFLICT (product_id) DO UPDATE
         SET search_vector = to_tsvector('english', $2), indexed_at = CURRENT_TIMESTAMP`,
        [productId, searchText]
      );

      console.log(`[Search Service] Indexed product: ${productId}`);
    } catch (error) {
      console.error('[Search Service] Index product error:', error);
      throw error;
    }
  }
}
