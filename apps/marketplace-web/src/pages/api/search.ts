/**
 * Legacy Search API Route
 * Another duplicate endpoint (Pages Router vs App Router)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3002';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, category, minPrice, maxPrice } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const params = new URLSearchParams({
      q: q as string,
      ...(category && { category: category as string }),
      ...(minPrice && { minPrice: minPrice as string }),
      ...(maxPrice && { maxPrice: maxPrice as string }),
    });

    const response = await fetch(`${SEARCH_SERVICE_URL}/api/search?${params}`);

    if (!response.ok) {
      throw new Error('Search service error');
    }

    const data = await response.json();

    // Track search (different tracking method - inconsistent)
    console.log('[Legacy API] Search performed:', q);

    res.status(200).json(data);
  } catch (error) {
    console.error('[Legacy API] Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}
