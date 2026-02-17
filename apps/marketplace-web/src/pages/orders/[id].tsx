/**
 * Legacy Order Detail Page
 * Uses getStaticProps + ISR (Incremental Static Regeneration)
 * Mixed pattern alongside App Router
 */

import { GetStaticProps, GetStaticPaths } from 'next';

interface OrderPageProps {
  order: any;
  error?: string;
}

export default function OrderPage({ order, error }: OrderPageProps) {
  if (error || !order) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <p className="text-gray-600">{error || 'Order not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Order #{order.id.substring(0, 8)}</h1>

      <div className="border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded">{order.status}</span>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Order Date</h3>
            <p>{new Date(order.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Items</h2>
        {order.items && order.items.length > 0 ? (
          <div className="space-y-2">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.product_title} x {item.quantity}
                </span>
                <span>${(item.subtotal / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No items</p>
        )}
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${(order.subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>${(order.tax / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping:</span>
            <span>${(order.shipping / 100).toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>${(order.total / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Generate paths for first 10 orders only (ISR will handle the rest)
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const orderId = context.params?.id as string;

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // This would need auth in real app - simplified for demo
    const response = await fetch(`${API_URL}/api/orders/${orderId}`);

    if (!response.ok) {
      return {
        props: {
          order: null,
          error: 'Order not found',
        },
        revalidate: 60, // ISR: Revalidate every 60 seconds
      };
    }

    const order = await response.json();

    return {
      props: {
        order,
      },
      revalidate: 60, // ISR: Revalidate every 60 seconds
    };
  } catch (error) {
    return {
      props: {
        order: null,
        error: 'Failed to load order',
      },
      revalidate: 60,
    };
  }
};
