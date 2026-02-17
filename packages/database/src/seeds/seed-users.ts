import { db } from '../db';
import * as faker from 'faker';

export async function seedUsers() {
  console.log('Seeding users...');

  const users: any[] = [];

  // Create 100 buyers
  for (let i = 0; i < 100; i++) {
    users.push({
      email: faker.internet.email().toLowerCase(),
      username: faker.internet.userName().toLowerCase() + i,
      password_hash: '$2b$10$abcdefghijklmnopqrstuv', // Fake bcrypt hash
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      role: 'buyer',
      legacy_user_id: faker.datatype.number({ min: 1000, max: 9999 }),
      old_email_verified: faker.datatype.boolean(),
    });
  }

  // Create 50 sellers
  for (let i = 0; i < 50; i++) {
    users.push({
      email: faker.internet.email().toLowerCase(),
      username: 'seller_' + faker.internet.userName().toLowerCase() + i,
      password_hash: '$2b$10$abcdefghijklmnopqrstuv',
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      role: 'seller',
      legacy_user_id: faker.datatype.number({ min: 1000, max: 9999 }),
    });
  }

  // Create 2 admins
  users.push({
    email: 'admin@marketplace.com',
    username: 'admin',
    password_hash: '$2b$10$abcdefghijklmnopqrstuv',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
  });

  // Insert users
  for (const user of users) {
    await db.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, role, legacy_user_id, old_email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.email,
        user.username,
        user.password_hash,
        user.first_name,
        user.last_name,
        user.role,
        user.legacy_user_id || null,
        user.old_email_verified || false,
      ]
    );
  }

  console.log(`✓ Seeded ${users.length} users`);
  return users.length;
}
