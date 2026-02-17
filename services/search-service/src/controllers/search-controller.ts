import { Request, Response } from 'express';
import { SearchService } from '../services/search-service';
import { createClient } from 'redis';

const searchService = new SearchService();

// Redis client for caching
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.connect().catch(console.error);

export const searchController = {
  // Search products
  async search(req: Request, res: Response) {
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
          return res.json(JSON.parse(cached));
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

      // Cache results for 5 minutes
      if (process.env.ENABLE_SEARCH_CACHE === 'true') {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(results));
      }

      res.json(results);
    } catch (error) {
      console.error('[Search Error]', error);
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
