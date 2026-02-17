import { db } from '../db';
import * as faker from 'faker';

export async function seedOrders() {
  console.log('Seeding orders...');

  // Get all buyers
  const buyersResult = await db.query(`SELECT id FROM users WHERE role = 'buyer' LIMIT 50`);
  const buyerIds = buyersResult.rows.map((row) => row.id);

  // Get all active products
  const productsResult = await db.query(`SELECT id, title, price FROM products WHERE status = 'active' LIMIT 500`);
  const products = productsResult.rows;

  if (buyerIds.length === 0 || products.length === 0) {
    console.warn('⚠ Insufficient data for orders. Skipping...');
    return 0;
  }

  const orders: any[] = [];
  const totalOrders = 500;

  for (let i = 0; i < totalOrders; i++) {
    const userId = buyerIds[Math.floor(Math.random() * buyerIds.length)];
    const itemCount = faker.datatype.number({ min: 1, max: 5 });
    const orderItems: any[] = [];

    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = faker.datatype.number({ min: 1, max: 3 });
      const itemSubtotal = product.price * quantity;

      orderItems.push({
        product_id: product.id,
        product_title: product.title,
        quantity,
        price: product.price,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
    }

    const tax = Math.round(subtotal * 0.08);
    const shipping = 500 + (itemCount - 1) * 100;
    const total = subtotal + tax + shipping;

    const status = faker.random.arrayElement([
      'paid',
      'paid',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ]);

    const order = {
      user_id: userId,
      subtotal,
      tax,
      shipping,
      total,
      currency: 'USD',
      status,
      payment_method_type: 'card',
      payment_method_last4: faker.datatype.number({ min: 1000, max: 9999 }).toString(),
      payment_method_brand: faker.random.arrayElement(['Visa', 'Mastercard', 'Amex']),
      payment_intent_id: `pi_${faker.random.alphaNumeric(24)}`,
      shipping_street: faker.address.streetAddress(),
      shipping_city: faker.address.city(),
      shipping_state: faker.address.state(),
      shipping_zip_code: faker.address.zipCode(),
      shipping_country: 'USA',
      billing_street: faker.address.streetAddress(),
      billing_city: faker.address.city(),
      billing_state: faker.address.state(),
      billing_zip_code: faker.address.zipCode(),
      billing_country: 'USA',
      old_order_number: `ORD-${faker.datatype.number({ min: 10000, max: 99999 })}`,
    };

    // Insert order
    const orderResult = await db.query(
      `INSERT INTO orders (
        user_id, subtotal, tax, shipping, total, currency, status,
        payment_method_type, payment_method_last4, payment_method_brand, payment_intent_id,
        shipping_street, shipping_city, shipping_state, shipping_zip_code, shipping_country,
        billing_street, billing_city, billing_state, billing_zip_code, billing_country,
        old_order_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING id`,
      [
        order.user_id,
        order.subtotal,
        order.tax,
        order.shipping,
        order.total,
        order.currency,
        order.status,
        order.payment_method_type,
        order.payment_method_last4,
        order.payment_method_brand,
        order.payment_intent_id,
        order.shipping_street,
        order.shipping_city,
        order.shipping_state,
        order.shipping_zip_code,
        order.shipping_country,
        order.billing_street,
        order.billing_city,
        order.billing_state,
        order.billing_zip_code,
        order.billing_country,
        order.old_order_number,
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of orderItems) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_title, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.product_id, item.product_title, item.quantity, item.price, item.subtotal]
      );
    }

    orders.push(order);
  }

  console.log(`✓ Seeded ${orders.length} orders`);
  return orders.length;
}
