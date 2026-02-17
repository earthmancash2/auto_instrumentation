import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { OrderService } from '../services/order-service';
import { db } from '@marketplace/database';
import { trackEvent } from '../middleware/analytics-tracking';

const router = express.Router();
const orderService = new OrderService();

// List user's orders
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('[List Orders Error]', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order (with N+1 query pattern - intentional performance issue)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get order
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.userId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items (separate query)
    const itemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    // N+1: Get product details for each item (inefficient - intentional)
    const items = [];
    for (const item of itemsResult.rows) {
      const productResult = await db.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      items.push({
        ...item,
        product: productResult.rows[0] || null, // May be null if product deleted
      });
    }

    res.json({
      ...order,
      items,
    });
  } catch (error) {
    console.error('[Get Order Error]', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order (checkout)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { shippingAddress, billingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !billingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Track checkout started (inconsistent event naming)
    trackEvent('checkout_started', {
      userId: req.userId,
    });

    const order = await orderService.createOrder(req.userId!, {
      shippingAddress,
      billingAddress,
      paymentMethod,
    });

    // Track order completed (different naming convention)
    trackEvent('purchase', {
      orderId: order.id,
      total: order.total,
      currency: order.currency,
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error('[Create Order Error]', error);

    // Track payment failure
    if (error.message.includes('payment')) {
      trackEvent('payment_failed', {
        userId: req.userId,
        reason: error.message,
      });
    }

    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Cancel order
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if order exists and belongs to user
    const orderResult = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.userId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (!['pending', 'paid'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    // Update order status
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['cancelled', id]);

    // TODO: Refund payment if paid

    res.json({ message: 'Order cancelled' });
  } catch (error) {
    console.error('[Cancel Order Error]', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

export default router;
