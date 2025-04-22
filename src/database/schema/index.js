// Import all schemas
const { embedTemplates, sentEmbeds } = require('./embeds');
const { ticketSettings, tickets, ticketLogs } = require('./tickets');
const { warnings } = require('./moderation');

// Export all tables
module.exports = {
  embedTemplates,
  sentEmbeds,
  ticketSettings,
  tickets,
  ticketLogs,
  warnings
};