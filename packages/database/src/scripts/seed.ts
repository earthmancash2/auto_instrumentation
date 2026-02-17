import { db } from '../db';
import { seedUsers } from '../seeds/seed-users';
import { seedProducts } from '../seeds/seed-products';
import { seedOrders } from '../seeds/seed-orders';
import { seedBadData } from '../seeds/seed-bad-data';

async function seed() {
  console.log('Starting database seeding...\n');

  try {
    // Check if already seeded
    const usersCount = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCount.rows[0].count) > 0) {
      console.log('⚠ Database already seeded. Skipping...');
      process.exit(0);
    }

    await seedUsers();
    await seedProducts();
    await seedOrders();
    await seedBadData();

    console.log('\n✓ Database seeding completed successfully!');
    console.log('\nStats:');
    const stats = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM products'),
      db.query('SELECT COUNT(*) FROM orders'),
      db.query('SELECT COUNT(*) FROM order_items'),
      db.query('SELECT COUNT(*) FROM inventory'),
      db.query('SELECT COUNT(*) FROM analytics_events'),
    ]);

    console.log(`  Users: ${stats[0].rows[0].count}`);
    console.log(`  Products: ${stats[1].rows[0].count}`);
    console.log(`  Orders: ${stats[2].rows[0].count}`);
    console.log(`  Order Items: ${stats[3].rows[0].count}`);
    console.log(`  Inventory Records: ${stats[4].rows[0].count}`);
    console.log(`  Analytics Events: ${stats[5].rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
