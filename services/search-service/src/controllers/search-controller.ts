import { Request, Response } from 'express';
import { SearchService } from '../services/search-service';
import { createClient } from 'redis';
import {
  analytics,
  generateRequestId,
  generateSearchId,
  detectClientType,
  isPrefetchRequest,
  getRetryCount
} from '@marketplace/shared';

const searchService = new SearchService();

// Redis client for caching
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.connect().catch(console.error);

export const searchController = {
  // Search products with comprehensive SSR instrumentation
  async search(req: Request, res: Response) {
    const startTime = Date.now();
    let dbQueryStartTime: number;
    let dbQueryTime: number = 0;

    // Generate correlation IDs
    const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
    const sessionId = (req.headers['x-session-id'] as string) || 'anonymous';
    const traceId = (req.headers['x-trace-id'] as string) || requestId;

    try {
      const { q, category, minPrice, maxPrice, page = '1', limit = '20' } = req.query;

      if (!q) {
        return res.status(400).json({ error: 'Missing search query' });
      }

      // Parse filters
      const filters = {
        category: category as string | undefined,
        minPrice: minPrice ? parseInt(minPrice as string) * 100 : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice as string) * 100 : undefined,
      };

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      // Generate deterministic search ID
      const searchId = generateSearchId(q as string, filters);

      // Detect client context
      const clientType = detectClientType(req.headers as Record<string, string>);
      const clientVersion = req.headers['x-client-version'] as string;
      const isPrefetch = isPrefetchRequest(req.headers as Record<string, string>);
      const retryCount = getRetryCount(req.headers as Record<string, string>);

      // ========================================
      // EVENT 1: search_api_request_received
      // ========================================
      analytics.track({
        name: 'search_api_request_received',
        properties: {
          // Correlation IDs
          request_id: requestId,
          search_id: searchId,
          session_id: sessionId,
          trace_id: traceId,

          // Query details
          search_query: q,
          filters,
          pagination,

          // Request metadata
          client_type: clientType,
          client_version: clientVersion || null,
          is_prefetch: isPrefetch,
          is_retry: retryCount > 0,
          retry_count: retryCount,
          user_agent: req.headers['user-agent'] || null,

          // Timing
          timestamp: new Date().toISOString(),
        },
      });

      const cacheKey = `search:${q}:${category}:${minPrice}:${maxPrice}:${page}:${limit}`;

      // Check cache (if enabled)
      if (process.env.ENABLE_SEARCH_CACHE === 'true') {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const cachedResults = JSON.parse(cached);

          // ========================================
          // EVENT 2a: search_api_request_completed (cache hit)
          // ========================================
          analytics.track({
            name: 'search_api_request_completed',
            properties: {
              // Correlation
              request_id: requestId,
              search_id: searchId,
              session_id: sessionId,
              trace_id: traceId,

              // Results summary
              results_summary: {
                total_matches: cachedResults.total,
                returned_count: cachedResults.products.length,
                has_more: cachedResults.hasMore,
                top_3_product_ids: cachedResults.products.slice(0, 3).map((p: any) => p.id),
              },

              // Results full (for detailed analysis)
              results_full: cachedResults.products.map((p: any) => ({
                id: p.id,
                title: p.title,
                price: p.price,
                category: p.category,
                rank: p.rank,
              })),

              // Performance
              cache_hit: true,
              query_time_ms: Date.now() - startTime,
              database_time_ms: 0,

              // Status
              success: true,
              error: null,
              timestamp: new Date().toISOString(),
            },
          });

          // Add request_id to response for client correlation
          return res.json({
            ...cachedResults,
            _meta: {
              request_id: requestId,
              search_id: searchId,
              cache_hit: true,
            },
          });
        }
      }

      // Execute search
      dbQueryStartTime = Date.now();
      const results = await searchService.search({
        query: q as string,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        page: pagination.page,
        limit: pagination.limit,
      });
      dbQueryTime = Date.now() - dbQueryStartTime;

      // ========================================
      // EVENT 2b: search_api_request_completed (fresh query)
      // ========================================
      analytics.track({
        name: 'search_api_request_completed',
        properties: {
          // Correlation
          request_id: requestId,
          search_id: searchId,
          session_id: sessionId,
          trace_id: traceId,

          // Results summary
          results_summary: {
            total_matches: results.total,
            returned_count: results.products.length,
            has_more: results.hasMore,
            top_3_product_ids: results.products.slice(0, 3).map((p: any) => p.id),
          },

          // Results full (for detailed analysis)
          results_full: results.products.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            category: p.category,
            rank: p.rank,
          })),

          // Performance
          cache_hit: false,
          query_time_ms: Date.now() - startTime,
          database_time_ms: dbQueryTime,

          // Status
          success: true,
          error: null,
          timestamp: new Date().toISOString(),
        },
      });

      // Cache results for 5 minutes
      if (process.env.ENABLE_SEARCH_CACHE === 'true') {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(results));
      }

      // Add metadata to response for client correlation
      res.json({
        ...results,
        _meta: {
          request_id: requestId,
          search_id: searchId,
          cache_hit: false,
        },
      });
    } catch (error) {
      console.error('[Search Error]', error);

      // ========================================
      // EVENT 3: search_api_request_failed
      // ========================================
      analytics.track({
        name: 'search_api_request_failed',
        properties: {
          request_id: requestId,
          search_query: req.query.q,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
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
