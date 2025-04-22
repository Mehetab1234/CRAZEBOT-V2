// Database migration script
const { Pool } = require('pg');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { drizzle } = require('drizzle-orm/node-postgres');
require('dotenv').config();

// Import schema
const schema = require('./schema');

async function runMigration() {
  console.log('Starting database migration...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found. Cannot run migrations.');
    process.exit(1);
  }
  
  try {
    // Create pool and Drizzle instance
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    // Run migration
    console.log('Pushing schema to database...');
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();