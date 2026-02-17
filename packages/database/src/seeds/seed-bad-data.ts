import { db } from '../db';

/**
 * Intentionally seed bad data to simulate real-world issues
 */
export async function seedBadData() {
  console.log('Seeding intentional bad data...');

  // Get some valid product IDs
  const productsResult = await db.query(`SELECT id FROM products LIMIT 10`);
  const productIds = productsResult.rows.map((row) => row.id);

  if (productIds.length === 0) {
    console.warn('⚠ No products found. Skipping bad data seeding.');
    return;
  }

  // 1. Create orphaned order items (order_id doesn't exist)
  try {
    await db.query(
      `INSERT INTO order_items (order_id, product_id, product_title, quantity, price, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Invalid order_id
        productIds[0],
        'Orphaned Product',
        1,
        1000,
        1000,
      ]
    );
  } catch (error) {
    // Expected to fail due to foreign key constraint
    console.log('✓ Orphaned order item test (expected failure)');
  }

  // 2. Create inventory with negative stock (intentional data issue)
  for (let i = 0; i < 5; i++) {
    await db.query(
      `INSERT INTO inventory (product_id, available_stock, reserved_stock, warehouse_location)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id) DO NOTHING`,
      [
        productIds[i],
        -Math.floor(Math.random() * 10) - 1, // Negative stock
        0,
        'WAREHOUSE-A',
      ]
    );
  }

  // 3. Create analytics events with inconsistent naming
  const eventNames = [
    'product_viewed',
    'ProductViewed',
    'product-view',
    'add_to_cart',
    'AddedToCart',
    'checkout_started',
    'CheckoutInitiated',
  ];

  for (const eventName of eventNames) {
    await db.query(
      `INSERT INTO analytics_events (event_name, properties)
       VALUES ($1, $2)`,
      [
        eventName,
        JSON.stringify({
          test: true,
          inconsistent: 'naming',
        }),
      ]
    );
  }

  // 4. Create some cart items that reference deleted products
  try {
    const buyersResult = await db.query(`SELECT id FROM users WHERE role = 'buyer' LIMIT 1`);
    if (buyersResult.rows.length > 0) {
      await db.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [
          buyersResult.rows[0].id,
          'cccccccc-cccc-cccc-cccc-cccccccccccc', // Invalid product_id
          2,
        ]
      );
    }
  } catch (error) {
    console.log('✓ Orphaned cart item test (expected failure)');
  }

  // 5. Create notifications that are unread (unused feature)
  const usersResult = await db.query(`SELECT id FROM users LIMIT 5`);
  for (const user of usersResult.rows) {
    await db.query(
      `INSERT INTO notifications (user_id, type, message, is_read)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'promotion', 'Test notification from incomplete feature', false]
    );
  }

  console.log('✓ Seeded intentional bad data (orphaned records, negative inventory, inconsistent events)');
}
