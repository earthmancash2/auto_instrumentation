/**
 * Legacy Search Page
 * Uses getServerSideProps (old Next.js pattern)
 * Duplicates functionality that could be in App Router
 */

import { GetServerSideProps } from 'next';
import { useState } from 'react';

interface SearchPageProps {
  initialQuery: string;
  results: any[];
}

export default function SearchPage({ initialQuery, results }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Search Products (Legacy)</h1>

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
          <p className="text-gray-600 mb-4">Found {results.length} results for "{initialQuery}"</p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((product: any) => (
              <a
                key={product.id}
                href={`/products/${product.id}`}
                className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-200 rounded mb-4" />
                <h3 className="font-semibold mb-2">{product.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                <p className="font-bold">${(product.price / 100).toFixed(2)}</p>
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
        initialQuery: '',
        results: [],
      },
    };
  }

  try {
    // Call search service (could also call Core API - inconsistent)
    const SEARCH_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3002';
    const response = await fetch(`${SEARCH_URL}/api/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();

    // Track search event (server-side tracking - different from client-side)
    console.log('[Search Event]', { query, resultsCount: data.products?.length || 0 });

    return {
      props: {
        initialQuery: query,
        results: data.products || [],
      },
    };
  } catch (error) {
    console.error('[Search Error]', error);
    return {
      props: {
        initialQuery: query,
        results: [],
      },
    };
  }
};
