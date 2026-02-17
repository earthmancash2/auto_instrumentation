'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import { api } from '@/lib/api-client';
import { trackCheckout, trackPurchase } from '@/lib/analytics';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shippingStreet: '',
    shippingCity: '',
    shippingState: '',
    shippingZipCode: '',
    shippingCountry: 'USA',
    cardLast4: '',
    cardBrand: 'Visa',
  });

  useEffect(() => {
    // Track checkout started
    if (items.length > 0) {
      trackCheckout(subtotal);
    }
  }, [items, subtotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        shippingAddress: {
          street: formData.shippingStreet,
          city: formData.shippingCity,
          state: formData.shippingState,
          zipCode: formData.shippingZipCode,
          country: formData.shippingCountry,
        },
        billingAddress: {
          street: formData.shippingStreet,
          city: formData.shippingCity,
          state: formData.shippingState,
          zipCode: formData.shippingZipCode,
          country: formData.shippingCountry,
        },
        paymentMethod: {
          type: 'card',
          last4: formData.cardLast4,
          brand: formData.cardBrand,
        },
      };

      const order = await api.createOrder(orderData);

      // Track purchase
      trackPurchase(order.id, order.total);

      clearCart();
      alert('Order placed successfully!');
      router.push('/');
    } catch (error: any) {
      alert('Order failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <a href="/products" className="text-blue-600 hover:underline">
          Continue shopping
        </a>
      </div>
    );
  }

  const tax = Math.round(subtotal * 0.08);
  const shipping = 500 + (items.length - 1) * 100;
  const total = subtotal + tax + shipping;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shipping Address */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              required
              type="text"
              placeholder="Street"
              className="col-span-2 border rounded px-3 py-2"
              value={formData.shippingStreet}
              onChange={(e) => setFormData({ ...formData, shippingStreet: e.target.value })}
            />
            <input
              required
              type="text"
              placeholder="City"
              className="border rounded px-3 py-2"
              value={formData.shippingCity}
              onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
            />
            <input
              required
              type="text"
              placeholder="State"
              className="border rounded px-3 py-2"
              value={formData.shippingState}
              onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
            />
            <input
              required
              type="text"
              placeholder="Zip Code"
              className="border rounded px-3 py-2"
              value={formData.shippingZipCode}
              onChange={(e) => setFormData({ ...formData, shippingZipCode: e.target.value })}
            />
          </div>
        </div>

        {/* Payment */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              required
              type="text"
              placeholder="Card Last 4 Digits"
              maxLength={4}
              className="border rounded px-3 py-2"
              value={formData.cardLast4}
              onChange={(e) => setFormData({ ...formData, cardLast4: e.target.value })}
            />
            <select
              className="border rounded px-3 py-2"
              value={formData.cardBrand}
              onChange={(e) => setFormData({ ...formData, cardBrand: e.target.value })}
            >
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Amex</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            This is a demo. Payment uses fake Stripe stub (5% failure rate).
          </p>
        </div>

        {/* Order Summary */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${(tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>${(shipping / 100).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
