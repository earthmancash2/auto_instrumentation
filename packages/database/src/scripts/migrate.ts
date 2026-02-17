import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db';

async function migrate() {
  console.log('Running database migrations...');

  try {
    // Read schema file
    const schemaPath = join(__dirname, '../../../schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');

    // Execute schema
    await db.query(schema);

    console.log('✓ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
