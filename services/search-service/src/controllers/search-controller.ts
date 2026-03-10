import { Request, Response } from 'express';
import { SearchService } from '../services/search-service';
import { createClient } from 'redis';
import { analytics } from '@marketplace/shared';

const searchService = new SearchService();

// Redis client for caching
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.connect().catch(console.error);

export const searchController = {
  // Search products
  async search(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const { q, category, minPrice, maxPrice, page = '1', limit = '20' } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Missing search query' });
      }

      const cacheKey = `search:${q}:${category}:${minPrice}:${maxPrice}:${page}:${limit}`;

      // Check cache (if enabled)
      if (process.env.ENABLE_SEARCH_CACHE === 'true') {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log('[Search Cache Hit]', cacheKey);
          const cachedResults = JSON.parse(cached);

          // Track search event (cache hit)
          analytics.track({
            name: 'search_performed',
            properties: {
              search_query: q,
              filters: {
                category: category || null,
                min_price: minPrice ? parseInt(minPrice as string) * 100 : null,
                max_price: maxPrice ? parseInt(maxPrice as string) * 100 : null,
              },
              pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
              },
              results: {
                total_matches: cachedResults.total,
                returned_count: cachedResults.products.length,
                has_more: cachedResults.hasMore,
                product_ids: cachedResults.products.map((p: any) => p.id),
                product_details: cachedResults.products.map((p: any) => ({
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  category: p.category,
                  rank: p.rank,
                })),
              },
              cache_hit: true,
              timestamp: new Date().toISOString(),
            },
          });

          return res.json(cachedResults);
        }
      }

      const results = await searchService.search({
        query: q as string,
        category: category as string | undefined,
        minPrice: minPrice ? parseInt(minPrice as string) * 100 : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice as string) * 100 : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      // Track search event with full product details
      console.log('[DEBUG] About to track search event:', q, 'results:', results.products.length);
      analytics.track({
        name: 'search_performed',
        properties: {
          search_query: q,
          filters: {
            category: category || null,
            min_price: minPrice ? parseInt(minPrice as string) * 100 : null,
            max_price: maxPrice ? parseInt(maxPrice as string) * 100 : null,
          },
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
          },
          results: {
            total_matches: results.total,
            returned_count: results.products.length,
            has_more: results.hasMore,
            product_ids: results.products.map((p: any) => p.id),
            product_details: results.products.map((p: any) => ({
              id: p.id,
              title: p.title,
              price: p.price,
              category: p.category,
              rank: p.rank,
            })),
          },
          cache_hit: false,
          response_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

      // Cache results for 5 minutes
      if (process.env.ENABLE_SEARCH_CACHE === 'true') {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(results));
      }

      res.json(results);
    } catch (error) {
      console.error('[Search Error]', error);

      // Track search failure
      analytics.track({
        name: 'search_failed',
        properties: {
          search_query: req.query.q,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          response_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });

      res.status(500).json({ error: 'Search failed' });
    }
  },

  // Index all products (full re-index)
  async indexProducts(req: Request, res: Response) {
    try {
      console.log('[Search] Starting full product index...');
      const count = await searchService.indexAllProducts();
      console.log(`[Search] Indexed ${count} products`);

      res.json({ message: 'Indexing complete', count });
    } catch (error) {
      console.error('[Index Error]', error);
      res.status(500).json({ error: 'Indexing failed' });
    }
  },

  // Index single product
  async indexProduct(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      await searchService.indexProduct(productId);

      res.json({ message: 'Product indexed', productId });
    } catch (error) {
      console.error('[Index Product Error]', error);
      res.status(500).json({ error: 'Failed to index product' });
    }
  },
};
