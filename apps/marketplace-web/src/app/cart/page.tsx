'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import Link from 'next/link';

export default function CartPage() {
  const { items, subtotal, isLoading, fetchCart, updateItem, removeItem } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  if (isLoading && items.length === 0) {
    return <div>Loading cart...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/products" className="text-blue-600 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <div key={item.productId} className="border rounded-lg p-4 flex gap-4">
            <div className="w-24 h-24 bg-gray-200 rounded" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">{item.productTitle}</h3>
              <p className="text-gray-600">${(item.price / 100).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(item.productId, parseInt(e.target.value))}
                className="border rounded px-2 py-1 w-16"
              />
              <button
                onClick={() => removeItem(item.productId)}
                className="text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <div className="font-semibold">
              ${((item.price * item.quantity) / 100).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between text-xl font-bold mb-4">
          <span>Subtotal:</span>
          <span>${(subtotal / 100).toFixed(2)}</span>
        </div>
        <Link
          href="/checkout"
          className="block w-full bg-blue-600 text-white text-center px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
