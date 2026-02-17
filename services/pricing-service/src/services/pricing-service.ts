import { db } from '@marketplace/database';
import axios from 'axios';

const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3001';

/**
 * Pricing Service
 * Implements dynamic pricing with intentional inconsistencies
 */
export class PricingService {
  /**
   * Get product price
   * ANTI-PATTERN: Sometimes calls Core API, sometimes queries DB directly
   */
  async getPrice(productId: string): Promise<any> {
    try {
      // Randomly decide whether to call API or query DB (inconsistent)
      if (Math.random() > 0.5) {
        // Call Core API (proper way)
        console.log('[Pricing] Fetching price from Core API');
        const response = await axios.get(`${CORE_API_URL}/api/products/${productId}`);
        return {
          productId,
          basePrice: response.data.price,
          finalPrice: response.data.price,
          currency: response.data.currency,
        };
      } else {
        // Query DB directly (anti-pattern)
        console.log('[Pricing] Fetching price from database directly');
        const result = await db.query('SELECT price, currency FROM products WHERE id = $1', [productId]);

        if (result.rows.length === 0) {
          throw new Error('Product not found');
        }

        return {
          productId,
          basePrice: result.rows[0].price,
          finalPrice: result.rows[0].price,
          currency: result.rows[0].currency,
        };
      }
    } catch (error) {
      console.error('[Pricing Service] Get price error:', error);
      throw error;
    }
  }

  /**
   * Calculate dynamic price based on quantity
   * Applies bulk discounts
   */
  async calculatePrice(productId: string, quantity: number): Promise<any> {
    try {
      const priceData = await this.getPrice(productId);
      const basePrice = priceData.basePrice;

      // Apply bulk discounts
      let discount = 0;
      if (quantity >= 10) {
        discount = 0.15; // 15% off
      } else if (quantity >= 5) {
        discount = 0.1; // 10% off
      } else if (quantity >= 3) {
        discount = 0.05; // 5% off
      }

      const finalPrice = Math.round(basePrice * (1 - discount));
      const totalPrice = finalPrice * quantity;

      return {
        productId,
        quantity,
        basePrice,
        discount: discount * 100,
        finalPrice,
        totalPrice,
        currency: priceData.currency,
      };
    } catch (error) {
      console.error('[Pricing Service] Calculate price error:', error);
      throw error;
    }
  }

  /**
   * Apply dynamic pricing based on demand (future feature)
   * TODO: Implement demand-based pricing algorithm
   */
  async applyDynamicPricing(productId: string): Promise<number> {
    // Placeholder for future implementation
    return 0;
  }
}
