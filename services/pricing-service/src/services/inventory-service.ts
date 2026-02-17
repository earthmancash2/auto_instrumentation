import { db } from '@marketplace/database';

/**
 * Inventory Service
 * INTENTIONAL ISSUE: Has race conditions in stock reservation
 * No optimistic locking or transactions
 */
export class InventoryService {
  /**
   * Get inventory for a product
   * ANTI-PATTERN: Directly accesses inventory table (owned by this service)
   */
  async getInventory(productId: string): Promise<any> {
    try {
      const result = await db.query(
        'SELECT * FROM inventory WHERE product_id = $1',
        [productId]
      );

      if (result.rows.length === 0) {
        // If no inventory record, create one from product stock
        const productResult = await db.query(
          'SELECT stock FROM products WHERE id = $1',
          [productId]
        );

        if (productResult.rows.length === 0) {
          throw new Error('Product not found');
        }

        const stock = productResult.rows[0].stock;

        // Create inventory record
        const insertResult = await db.query(
          `INSERT INTO inventory (product_id, available_stock, reserved_stock)
           VALUES ($1, $2, 0)
           RETURNING *`,
          [productId, stock]
        );

        return insertResult.rows[0];
      }

      return result.rows[0];
    } catch (error) {
      console.error('[Inventory Service] Get inventory error:', error);
      throw error;
    }
  }

  /**
   * Reserve stock for an order
   * RACE CONDITION: Check and update are separate queries
   * Multiple concurrent requests can over-reserve stock
   */
  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    try {
      // Get current inventory (READ)
      const inventory = await this.getInventory(productId);

      console.log(`[Inventory] Attempting to reserve ${quantity} units of ${productId}`);
      console.log(`[Inventory] Available: ${inventory.available_stock}, Reserved: ${inventory.reserved_stock}`);

      // Check if enough stock (RACE CONDITION: Another request could reserve between this check and update)
      if (inventory.available_stock < quantity) {
        console.log('[Inventory] Insufficient stock');
        return false;
      }

      // Simulate some processing time (makes race condition more likely)
      await this.sleep(Math.random() * 100);

      // Update inventory (WRITE) - NO TRANSACTION, NO LOCK
      await db.query(
        `UPDATE inventory
         SET available_stock = available_stock - $1,
             reserved_stock = reserved_stock + $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [quantity, productId]
      );

      // Also update product stock (direct access to products table - anti-pattern)
      await db.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, productId]
      );

      console.log(`[Inventory] Reserved ${quantity} units of ${productId}`);
      return true;
    } catch (error) {
      console.error('[Inventory Service] Reserve stock error:', error);
      throw error;
    }
  }

  /**
   * Release reserved stock (e.g., when order is cancelled)
   */
  async releaseStock(productId: string, quantity: number): Promise<void> {
    try {
      await db.query(
        `UPDATE inventory
         SET available_stock = available_stock + $1,
             reserved_stock = reserved_stock - $1,
             last_updated = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [quantity, productId]
      );

      // Also update product stock
      await db.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2',
        [quantity, productId]
      );

      console.log(`[Inventory] Released ${quantity} units of ${productId}`);
    } catch (error) {
      console.error('[Inventory Service] Release stock error:', error);
      throw error;
    }
  }

  /**
   * Sync inventory from product stock
   * Background job to fix inventory discrepancies
   */
  async syncInventory(): Promise<void> {
    try {
      console.log('[Inventory] Starting inventory sync...');

      const result = await db.query(`
        SELECT p.id, p.stock, COALESCE(i.available_stock, 0) as inventory_stock
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.status = 'active'
      `);

      for (const row of result.rows) {
        if (row.stock !== row.inventory_stock) {
          console.log(`[Inventory] Syncing ${row.id}: ${row.inventory_stock} -> ${row.stock}`);
          await db.query(
            `INSERT INTO inventory (product_id, available_stock, reserved_stock)
             VALUES ($1, $2, 0)
             ON CONFLICT (product_id) DO UPDATE
             SET available_stock = $2, last_updated = CURRENT_TIMESTAMP`,
            [row.id, row.stock]
          );
        }
      }

      console.log('[Inventory] Sync complete');
    } catch (error) {
      console.error('[Inventory Service] Sync inventory error:', error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
