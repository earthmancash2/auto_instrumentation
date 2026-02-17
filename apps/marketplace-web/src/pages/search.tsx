/**
 * Legacy Search Page with SSR Instrumentation
 * Demonstrates comprehensive tracking across SSR + hydration
 * Uses getServerSideProps (Next.js Pages Router)
 */

import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';

interface SearchPageProps {
  requestId: string;
  searchId: string;
  initialQuery: string;
  results: any[];
  totalResults: number;
  renderTimestamp: string;
}

export default function SearchPage({
  requestId,
  searchId,
  initialQuery,
  results,
  totalResults,
  renderTimestamp,
}: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [hydrationTime, setHydrationTime] = useState<number>(0);

  // Track client-side hydration
  useEffect(() => {
    const hydrationTimestamp = Date.now();
    setHydrationTime(hydrationTimestamp);

    // Calculate time to hydrate
    const renderTime = new Date(renderTimestamp).getTime();
    const timeToHydrate = hydrationTimestamp - renderTime;

    // ========================================
    // CLIENT EVENT: search_page_hydrated
    // ========================================
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track({
        name: 'search_page_hydrated',
        properties: {
          // Correlation (links to backend events)
          request_id: requestId,
          search_id: searchId,

          // Query context
          search_query: initialQuery,
          results_count: results.length,

          // Client timing (UX metrics)
          time_to_hydrate_ms: timeToHydrate,
          time_to_interactive_ms: performance.now(),

          // Client context
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          connection_type: (navigator as any).connection?.effectiveType || 'unknown',

          // Page type
          page_type: 'search',
          render_type: 'ssr_hydration',

          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [requestId, searchId, initialQuery, results.length, renderTimestamp]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    // ========================================
    // CLIENT EVENT: search_query_modified
    // ========================================
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track({
        name: 'search_query_modified',
        properties: {
          request_id: requestId,
          search_id: searchId,
          original_query: initialQuery,
          new_query: query,
          time_since_hydration_ms: Date.now() - hydrationTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    window.location.href = `/search?q=${encodeURIComponent(query)}`;
  };

  const handleResultClick = (product: any, position: number) => {
    // ========================================
    // CLIENT EVENT: search_result_clicked
    // ========================================
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track({
        name: 'search_result_clicked',
        properties: {
          // Correlation
          request_id: requestId,
          search_id: searchId,
          search_query: initialQuery,

          // Clicked result
          product_id: product.id,
          product_title: product.title,
          product_price: product.price,
          result_position: position,
          result_rank: product.rank || null,

          // Context
          total_results_shown: results.length,
          total_results_available: totalResults,
          time_to_click_ms: Date.now() - hydrationTime,

          timestamp: new Date().toISOString(),
        },
      });
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Search Products <span className="text-sm text-gray-500">(SSR + Hydration)</span>
      </h1>

      {/* Debug info - shows instrumentation working */}
      <div className="bg-blue-50 border border-blue-200 p-4 mb-6 text-sm">
        <p className="font-semibold mb-2">🔍 Instrumentation Info:</p>
        <p>Request ID: <code className="bg-white px-2 py-1 rounded">{requestId}</code></p>
        <p>Search ID: <code className="bg-white px-2 py-1 rounded">{searchId}</code></p>
        <p className="text-xs text-gray-600 mt-2">
          Check console for analytics events: search_page_hydrated, search_query_modified, search_result_clicked
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products..."
            className="flex-1 border rounded px-4 py-2"
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Search
          </button>
        </div>
      </form>

      {results.length > 0 ? (
        <div>
          <p className="text-gray-600 mb-4">
            Found {totalResults} results for "{initialQuery}" (showing {results.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((product: any, index: number) => (
              <a
                key={product.id}
                href={`/products/${product.id}`}
                onClick={() => handleResultClick(product, index)}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-200 rounded mb-4" />
                <h3 className="font-semibold mb-2">{product.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                <p className="font-bold">${(product.price / 100).toFixed(2)}</p>
                {product.rank && (
                  <p className="text-xs text-gray-500 mt-1">
                    Relevance: {(product.rank * 100).toFixed(1)}%
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-600">
          {initialQuery ? `No results found for "${initialQuery}"` : 'Enter a search query'}
        </p>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const query = (context.query.q as string) || '';

  if (!query) {
    return {
      props: {
        requestId: '',
        searchId: '',
        initialQuery: '',
        results: [],
        totalResults: 0,
        renderTimestamp: new Date().toISOString(),
      },
    };
  }

  try {
    const SEARCH_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3002';

    // Generate request ID for correlation
    const crypto = require('crypto');
    const requestId = crypto.randomUUID();
    const sessionId = context.req.cookies.session_id || 'anonymous';

    // Call search service with correlation headers
    const response = await fetch(
      `${SEARCH_URL}/api/search?q=${encodeURIComponent(query)}&limit=20`,
      {
        headers: {
          'x-request-id': requestId,
          'x-session-id': sessionId,
          'x-client-type': 'web-ssr',
          'x-client-version': '1.0.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    const renderTimestamp = new Date().toISOString();

    // ========================================
    // SSR EVENT: search_page_rendered_ssr
    // ========================================
    // Note: In production, this would use proper analytics client
    console.log('[SSR Analytics] search_page_rendered_ssr', {
      request_id: data._meta?.request_id || requestId,
      search_id: data._meta?.search_id || '',
      search_query: query,
      results_count: data.products?.length || 0,
      total_matches: data.total || 0,
      render_type: 'server',
      page_type: 'search',
      cache_hit: data._meta?.cache_hit || false,
      timestamp: renderTimestamp,
    });

    return {
      props: {
        requestId: data._meta?.request_id || requestId,
        searchId: data._meta?.search_id || '',
        initialQuery: query,
        results: data.products || [],
        totalResults: data.total || 0,
        renderTimestamp,
      },
    };
  } catch (error) {
    console.error('[Search SSR Error]', error);

    return {
      props: {
        requestId: '',
        searchId: '',
        initialQuery: query,
        results: [],
        totalResults: 0,
        renderTimestamp: new Date().toISOString(),
      },
    };
  }
};
