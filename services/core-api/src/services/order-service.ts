import { db } from '@marketplace/database';
import { stripe, sendgrid, calculateTax, calculateShipping } from '@marketplace/shared';
import { CartService } from './cart-service';
import axios from 'axios';

const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || 'http://localhost:3003';

interface CreateOrderData {
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
  };
}

export class OrderService {
  private cartService: CartService;

  constructor() {
    this.cartService = new CartService();
  }

  async createOrder(userId: string, data: CreateOrderData): Promise<any> {
    // Get cart
    const cart = await this.cartService.getCart(userId);

    if (cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate totals
    const subtotal = cart.subtotal;
    const tax = calculateTax(subtotal);
    const shipping = calculateShipping(cart.items.length);
    const total = subtotal + tax + shipping;

    // TODO: Check inventory availability via pricing service
    // Skipping for now - will add later (tech debt comment)

    try {
      // Process payment with Stripe stub
      const paymentIntent = await stripe.createPaymentIntent({
        amount: total,
        currency: 'usd',
        paymentMethod: {
          type: data.paymentMethod.type as any,
          card: data.paymentMethod.last4
            ? {
                last4: data.paymentMethod.last4,
                brand: data.paymentMethod.brand || 'Visa',
                exp_month: 12,
                exp_year: 2025,
              }
            : undefined,
        },
      });

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment failed');
      }

      // Create order in database (within transaction)
      const order = await db.transaction(async (client) => {
        // Insert order
        const orderResult = await client.query(
          `INSERT INTO orders (
            user_id, subtotal, tax, shipping, total, currency, status,
            payment_method_type, payment_method_last4, payment_method_brand, payment_intent_id,
            shipping_street, shipping_city, shipping_state, shipping_zip_code, shipping_country,
            billing_street, billing_city, billing_state, billing_zip_code, billing_country
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          RETURNING *`,
          [
            userId,
            subtotal,
            tax,
            shipping,
            total,
            'USD',
            'paid',
            data.paymentMethod.type,
            data.paymentMethod.last4,
            data.paymentMethod.brand,
            paymentIntent.id,
            data.shippingAddress.street,
            data.shippingAddress.city,
            data.shippingAddress.state,
            data.shippingAddress.zipCode,
            data.shippingAddress.country,
            data.billingAddress.street,
            data.billingAddress.city,
            data.billingAddress.state,
            data.billingAddress.zipCode,
            data.billingAddress.country,
          ]
        );

        const order = orderResult.rows[0];

        // Insert order items
        for (const item of cart.items) {
          await client.query(
            `INSERT INTO order_items (order_id, product_id, product_title, quantity, price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [order.id, item.productId, item.productTitle, item.quantity, item.price, item.price * item.quantity]
          );

          // Update product stock (direct update - should use pricing service)
          await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.productId]);
        }

        return order;
      });

      // Clear cart
      await this.cartService.clearCart(userId);

      // Send order confirmation email
      const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0) {
        await sendgrid.sendOrderConfirmation(userResult.rows[0].email, order.id, total);
      }

      // Notify pricing service about inventory change (HTTP call - messy integration)
      try {
        await axios.post(`${PRICING_SERVICE_URL}/api/inventory/sync`, {
          orderId: order.id,
        });
      } catch (error) {
        console.error('[Order Service] Failed to notify pricing service:', error);
        // Continue anyway - background job will sync later (TODO comment)
      }

      return order;
    } catch (error: any) {
      console.error('[Order Service] Create order error:', error);
      throw error;
    }
  }
}
