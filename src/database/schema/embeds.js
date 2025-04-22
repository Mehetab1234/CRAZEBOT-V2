const { pgTable, text, timestamp, uuid, jsonb } = require('drizzle-orm/pg-core');

// Schema for embed templates
const embedTemplates = pgTable('embed_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').notNull(),
  name: text('name').notNull(),
  embedData: jsonb('embed_data').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Schema for sent embeds
const sentEmbeds = pgTable('sent_embeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: text('message_id').notNull().unique(),
  channelId: text('channel_id').notNull(),
  guildId: text('guild_id').notNull(),
  embedData: jsonb('embed_data').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by')
});

module.exports = {
  embedTemplates,
  sentEmbeds
};