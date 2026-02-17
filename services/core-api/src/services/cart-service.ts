import { db } from '@marketplace/database';
import { Cart, CartItem } from '@marketplace/shared';
import { redisClient } from '../utils/redis';

export class CartService {
  private getCartKey(userId: string): string {
    return `cart:${userId}`;
  }

  async getCart(userId: string): Promise<Cart> {
    try {
      // Get cart from Redis
      const cartData = await redisClient.get(this.getCartKey(userId));

      if (cartData) {
        return JSON.parse(cartData);
      }

      // Return empty cart
      return {
        userId,
        items: [],
        subtotal: 0,
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('[Cart Service] Get cart error:', error);
      throw error;
    }
  }

  async addToCart(userId: string, productId: string, quantity: number): Promise<Cart> {
    try {
      // Get product details
      const productResult = await db.query(
        'SELECT id, title, price, image_url, stock FROM products WHERE id = $1 AND status = $2',
        [productId, 'active']
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found or unavailable');
      }

      const product = productResult.rows[0];

      if (product.stock < quantity) {
        throw new Error('Insufficient stock');
      }

      // Get current cart
      const cart = await this.getCart(userId);

      // Check if product already in cart
      const existingItemIndex = cart.items.findIndex((item) => item.productId === productId);

      if (existingItemIndex >= 0) {
        // Update quantity
        cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        cart.items.push({
          productId: product.id,
          productTitle: product.title,
          price: product.price,
          quantity,
          imageUrl: product.image_url,
          addedAt: new Date(),
        });
      }

      // Recalculate subtotal
      cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      cart.updatedAt = new Date();

      // Save to Redis
      await redisClient.set(this.getCartKey(userId), JSON.stringify(cart), {
        EX: 86400, // 24 hours
      });

      // Also save to database (migration TODO - duplicate data)
      // This is intentional tech debt
      await db.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3`,
        [userId, productId, quantity]
      );

      return cart;
    } catch (error) {
      console.error('[Cart Service] Add to cart error:', error);
      throw error;
    }
  }

  async updateCartItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    try {
      const cart = await this.getCart(userId);

      const itemIndex = cart.items.findIndex((item) => item.productId === productId);

      if (itemIndex < 0) {
        throw new Error('Item not in cart');
      }

      if (quantity <= 0) {
        // Remove item
        cart.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
      }

      // Recalculate subtotal
      cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      cart.updatedAt = new Date();

      // Save to Redis
      await redisClient.set(this.getCartKey(userId), JSON.stringify(cart), {
        EX: 86400,
      });

      return cart;
    } catch (error) {
      console.error('[Cart Service] Update cart error:', error);
      throw error;
    }
  }

  async removeFromCart(userId: string, productId: string): Promise<Cart> {
    return this.updateCartItem(userId, productId, 0);
  }

  async clearCart(userId: string): Promise<void> {
    try {
      await redisClient.del(this.getCartKey(userId));
      await db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } catch (error) {
      console.error('[Cart Service] Clear cart error:', error);
      throw error;
    }
  }
}
