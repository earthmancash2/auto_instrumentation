/**
 * Products listing page - Server Component
 */

import Link from 'next/link';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getProducts(searchParams: any) {
  try {
    const params = new URLSearchParams(searchParams);
    const res = await fetch(`${API_URL}/api/products?${params}`, {
      cache: 'no-store',
    });

    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  } catch (error) {
    return { products: [], total: 0 };
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const data = await getProducts(searchParams);
  const products = data.products || [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">All Products</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select className="border rounded px-3 py-2">
          <option>All Categories</option>
          <option>Electronics</option>
          <option>Clothing</option>
          <option>Home & Garden</option>
        </select>
        <select className="border rounded px-3 py-2">
          <option>Sort by: Latest</option>
          <option>Sort by: Price (Low to High)</option>
          <option>Sort by: Price (High to Low)</option>
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product: any) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow block"
          >
            <div className="aspect-square bg-gray-200 rounded mb-4" />
            <h3 className="font-semibold mb-2">{product.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{product.category}</p>
            <p className="font-bold">${(product.price / 100).toFixed(2)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
