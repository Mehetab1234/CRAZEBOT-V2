// Database initialization script
require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const schema = require('./src/database/schema');

async function initDatabase() {
  console.log('Initializing database schema...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found. Cannot initialize database.');
    process.exit(1);
  }
  
  try {
    // Create pool and Drizzle instance
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
    
    // Create schema using SQL
    const queries = [
      // Embed templates table
      `CREATE TABLE IF NOT EXISTS "embed_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" text NOT NULL,
        "name" text NOT NULL,
        "embed_data" jsonb NOT NULL,
        "created_by" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )`,
      
      // Sent embeds table
      `CREATE TABLE IF NOT EXISTS "sent_embeds" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "message_id" text NOT NULL UNIQUE,
        "channel_id" text NOT NULL,
        "guild_id" text NOT NULL,
        "embed_data" jsonb NOT NULL,
        "created_by" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "updated_by" text
      )`,
      
      // Ticket settings table
      `CREATE TABLE IF NOT EXISTS "ticket_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" text NOT NULL UNIQUE,
        "settings" jsonb NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "panel_channel_id" text,
        "panel_message_id" text
      )`,
      
      // Tickets table
      `CREATE TABLE IF NOT EXISTS "tickets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" text NOT NULL,
        "channel_id" text NOT NULL UNIQUE,
        "user_id" text NOT NULL,
        "type" text NOT NULL,
        "status" text NOT NULL DEFAULT 'open',
        "claimed_by" text,
        "closed" boolean NOT NULL DEFAULT false,
        "closed_by" text,
        "closed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "ticket_name" text,
        "users_added" jsonb NOT NULL DEFAULT '[]',
        "messages" jsonb NOT NULL DEFAULT '[]',
        "updated_at" timestamp DEFAULT now()
      )`,
      
      // Ticket logs table
      `CREATE TABLE IF NOT EXISTS "ticket_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" text NOT NULL,
        "entry" jsonb NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )`,
      
      // Warnings table
      `CREATE TABLE IF NOT EXISTS "warnings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "guild_id" text NOT NULL,
        "user_id" text NOT NULL,
        "issued_by" text NOT NULL,
        "reason" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )`
    ];
    
    // Execute each query
    for (const query of queries) {
      await pool.query(query);
    }
    
    console.log('Database schema initialization completed successfully.');
    await pool.end();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

initDatabase();