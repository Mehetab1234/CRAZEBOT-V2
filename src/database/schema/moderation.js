const { pgTable, text, timestamp, uuid, jsonb } = require('drizzle-orm/pg-core');

// Schema for user warnings
const warnings = pgTable('warnings', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').notNull(),
  userId: text('user_id').notNull(),
  issuedBy: text('issued_by').notNull(),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

module.exports = {
  warnings
};