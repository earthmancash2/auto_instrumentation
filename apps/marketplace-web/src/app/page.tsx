/**
 * Homepage - Server Component
 * Fetches featured products on the server
 */

import Link from 'next/link';

// Use API_URL for server-side fetches (Docker internal), NEXT_PUBLIC_API_URL for client-side
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getFeaturedProducts() {
  try {
    const res = await fetch(`${API_URL}/api/products?limit=12`, {
      cache: 'no-store', // Always fresh data
    });

    if (!res.ok) {
      throw new Error('Failed to fetch products');
    }

    return res.json();
  } catch (error) {
    console.error('[Homepage] Failed to fetch products:', error);
    return { products: [] };
  }
}

export default async function HomePage() {
  const data = await getFeaturedProducts();
  const products = data.products || [];

  return (
    <div>
      <section className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Marketplace</h1>
        <p className="text-xl text-gray-600">
          Discover unique items from talented sellers around the world
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow block"
            >
              <div className="aspect-square bg-gray-200 rounded mb-4 flex items-center justify-center">
                <span className="text-gray-400">Image</span>
              </div>
              <h3 className="font-semibold mb-2 truncate">{product.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{product.category}</p>
              <p className="font-bold">${(product.price / 100).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
