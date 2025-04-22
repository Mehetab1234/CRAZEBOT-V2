const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
require('dotenv').config();

// Check if the DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not found. Using in-memory storage instead.');
}

// Create a PostgreSQL connection pool
const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL }) 
  : null;

// Create a Drizzle ORM instance if the pool exists
const db = pool ? drizzle(pool) : null;

// Export the database connection
module.exports = { db, pool };