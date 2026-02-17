/**
 * Legacy API Route
 * Duplicates functionality from App Router API routes
 * Demonstrates mixed API patterns (realistic tech debt)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const response = await fetch(`${API_URL}/api/products/${id}`);

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Product not found' });
      }

      const product = await response.json();

      // Log using different style (inconsistent)
      console.log('Product fetched via legacy API route:', id);

      res.status(200).json(product);
    } catch (error) {
      console.error('API route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
