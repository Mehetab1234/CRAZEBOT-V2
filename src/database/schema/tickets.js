const { pgTable, text, timestamp, uuid, jsonb, boolean } = require('drizzle-orm/pg-core');

// Schema for ticket settings
const ticketSettings = pgTable('ticket_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').notNull().unique(),
  settings: jsonb('settings').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  panelChannelId: text('panel_channel_id'),
  panelMessageId: text('panel_message_id')
});

// Schema for tickets
const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull().unique(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  status: text('status').defaultValue('open').notNull(),
  claimedBy: text('claimed_by'),
  closed: boolean('closed').defaultValue(false).notNull(),
  closedBy: text('closed_by'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  ticketName: text('ticket_name'),
  usersAdded: jsonb('users_added').defaultValue([]).notNull(),
  messages: jsonb('messages').defaultValue([]).notNull()
});

// Schema for ticket logs
const ticketLogs = pgTable('ticket_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: text('guild_id').notNull(),
  entry: jsonb('entry').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

module.exports = {
  ticketSettings,
  tickets,
  ticketLogs
};