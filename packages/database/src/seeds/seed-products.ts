import { db } from '../db';
import * as faker from 'faker';

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Books',
  'Toys',
  'Sports',
  'Beauty',
  'Jewelry',
  'Art',
  'Vintage',
];

const TAG_OPTIONS = [
  'handmade',
  'vintage',
  'eco-friendly',
  'bestseller',
  'new',
  'sale',
  'limited-edition',
  'custom',
  'gift',
  'popular',
];

export async function seedProducts() {
  console.log('Seeding products...');

  // Get all sellers
  const sellersResult = await db.query(`SELECT id FROM users WHERE role = 'seller'`);
  const sellerIds = sellersResult.rows.map((row) => row.id);

  if (sellerIds.length === 0) {
    throw new Error('No sellers found. Please seed users first.');
  }

  const products: any[] = [];
  const totalProducts = 1000;

  for (let i = 0; i < totalProducts; i++) {
    const isOrphaned = Math.random() < 0.05; // 5% orphaned (bad seller_id)
    const isMissingDescription = Math.random() < 0.1; // 10% missing description
    const isInvalidPrice = Math.random() < 0.03; // 3% invalid price

    const sellerId = isOrphaned
      ? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' // Invalid UUID
      : sellerIds[Math.floor(Math.random() * sellerIds.length)];

    const price = isInvalidPrice
      ? faker.datatype.number({ min: -1000, max: -1 }) // Negative price
      : faker.datatype.number({ min: 500, max: 50000 }); // Normal price in cents

    const tags: string[] = [];
    const tagCount = faker.datatype.number({ min: 1, max: 4 });
    for (let j = 0; j < tagCount; j++) {
      const tag = TAG_OPTIONS[Math.floor(Math.random() * TAG_OPTIONS.length)];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    const status = faker.random.arrayElement(['active', 'active', 'active', 'draft', 'out_of_stock']);

    products.push({
      seller_id: sellerId,
      title: faker.commerce.productName(),
      description: isMissingDescription ? null : faker.commerce.productDescription(),
      price,
      currency: 'USD',
      category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
      tags,
      image_url: faker.image.imageUrl(640, 480, 'product', true),
      stock: faker.datatype.number({ min: 0, max: 100 }),
      status,
      old_price: faker.datatype.number({ min: 600, max: 60000 }),
      legacy_category_id: faker.datatype.number({ min: 1, max: 50 }),
    });
  }

  // Insert products
  for (const product of products) {
    try {
      await db.query(
        `INSERT INTO products (seller_id, title, description, price, currency, category, tags, image_url, stock, status, old_price, legacy_category_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          product.seller_id,
          product.title,
          product.description,
          product.price,
          product.currency,
          product.category,
          product.tags,
          product.image_url,
          product.stock,
          product.status,
          product.old_price,
          product.legacy_category_id,
        ]
      );
    } catch (error) {
      // Ignore errors from orphaned products (intentional)
      if (!product.seller_id.startsWith('aaaa')) {
        throw error;
      }
    }
  }

  console.log(`✓ Seeded ${products.length} products (including bad data)`);
  return products.length;
}
