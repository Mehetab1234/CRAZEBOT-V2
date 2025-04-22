// In-memory ticket management system
const { Collection } = require('discord.js');
const config = require('../config');

class TicketManager {
  constructor() {
    this.tickets = new Collection();
    this.ticketSettings = new Collection();
    this.ticketLogs = new Collection();
    this.ticketCount = 0;
  }

  /**
   * Setup ticket system for a guild
   * @param {string} guildId - The guild ID
   * @param {Object} settings - The ticket settings
   * @returns {Object} The created settings
   */
  setupTickets(guildId, settings) {
    const guildSettings = {
      category: settings.category || config.ticketSystem.defaultCategory,
      staffRoles: settings.staffRoles || config.ticketSystem.roleIds,
      logsChannel: settings.logsChannel || config.ticketSystem.logsChannel,
      ticketTypes: settings.ticketTypes || config.ticketSystem.ticketTypes,
      welcomeMessage: settings.welcomeMessage || 'Thank you for creating a ticket. Support staff will be with you shortly.',
      panelMessageId: null,
      panelChannelId: null,
    };

    this.ticketSettings.set(guildId, guildSettings);
    return guildSettings;
  }

  /**
   * Get ticket settings for a guild
   * @param {string} guildId - The guild ID
   * @returns {Object|null} The ticket settings or null
   */
  getTicketSettings(guildId) {
    return this.ticketSettings.get(guildId) || null;
  }

  /**
   * Store panel message information
   * @param {string} guildId - The guild ID
   * @param {string} channelId - The channel ID where panel was sent
   * @param {string} messageId - The message ID of the panel
   */
  storePanelMessage(guildId, channelId, messageId) {
    const settings = this.getTicketSettings(guildId);
    if (settings) {
      settings.panelMessageId = messageId;
      settings.panelChannelId = channelId;
      this.ticketSettings.set(guildId, settings);
    }
  }

  /**
   * Create a new ticket
   * @param {string} guildId - The guild ID
   * @param {string} channelId - The channel ID of the ticket
   * @param {string} userId - The user ID who created the ticket
   * @param {string} type - The ticket type
   * @returns {Object} The created ticket
   */
  createTicket(guildId, channelId, userId, type) {
    this.ticketCount++;
    const ticketId = `ticket-${this.ticketCount}`;
    
    const ticket = {
      id: ticketId,
      channelId: channelId,
      userId: userId,
      guildId: guildId,
      type: type,
      status: 'open',
      createdAt: new Date().toISOString(),
      claimedBy: null,
      participants: [userId],
      messages: []
    };
    
    this.tickets.set(channelId, ticket);
    this.addTicketLog(guildId, {
      action: 'create',
      ticketId,
      userId,
      timestamp: new Date().toISOString(),
      details: `Ticket created: ${type}`
    });
    
    return ticket;
  }

  /**
   * Get a ticket by channel ID
   * @param {string} channelId - The channel ID
   * @returns {Object|null} The ticket or null
   */
  getTicketByChannelId(channelId) {
    return this.tickets.get(channelId) || null;
  }

  /**
   * Close a ticket
   * @param {string} channelId - The channel ID
   * @param {string} closedBy - The user ID who closed the ticket
   * @returns {Object|null} The updated ticket or null
   */
  closeTicket(channelId, closedBy) {
    const ticket = this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = closedBy;
    
    this.tickets.set(channelId, ticket);
    this.addTicketLog(ticket.guildId, {
      action: 'close',
      ticketId: ticket.id,
      userId: closedBy,
      timestamp: new Date().toISOString(),
      details: `Ticket closed`
    });
    
    return ticket;
  }

  /**
   * Add a user to a ticket
   * @param {string} channelId - The channel ID
   * @param {string} userId - The user ID to add
   * @param {string} addedBy - The user ID who added the user
   * @returns {Object|null} The updated ticket or null
   */
  addUserToTicket(channelId, userId, addedBy) {
    const ticket = this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    if (!ticket.participants.includes(userId)) {
      ticket.participants.push(userId);
      
      this.tickets.set(channelId, ticket);
      this.addTicketLog(ticket.guildId, {
        action: 'add_user',
        ticketId: ticket.id,
        userId: addedBy,
        timestamp: new Date().toISOString(),
        details: `Added user <@${userId}> to ticket`
      });
    }
    
    return ticket;
  }

  /**
   * Remove a user from a ticket
   * @param {string} channelId - The channel ID
   * @param {string} userId - The user ID to remove
   * @param {string} removedBy - The user ID who removed the user
   * @returns {Object|null} The updated ticket or null
   */
  removeUserFromTicket(channelId, userId, removedBy) {
    const ticket = this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    // Cannot remove the ticket creator
    if (ticket.userId === userId) return ticket;
    
    const index = ticket.participants.indexOf(userId);
    if (index !== -1) {
      ticket.participants.splice(index, 1);
      
      this.tickets.set(channelId, ticket);
      this.addTicketLog(ticket.guildId, {
        action: 'remove_user',
        ticketId: ticket.id,
        userId: removedBy,
        timestamp: new Date().toISOString(),
        details: `Removed user <@${userId}> from ticket`
      });
    }
    
    return ticket;
  }

  /**
   * Claim a ticket
   * @param {string} channelId - The channel ID
   * @param {string} userId - The user ID claiming the ticket
   * @returns {Object|null} The updated ticket or null
   */
  claimTicket(channelId, userId) {
    const ticket = this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    ticket.claimedBy = userId;
    ticket.claimedAt = new Date().toISOString();
    
    this.tickets.set(channelId, ticket);
    this.addTicketLog(ticket.guildId, {
      action: 'claim',
      ticketId: ticket.id,
      userId,
      timestamp: new Date().toISOString(),
      details: `Ticket claimed by <@${userId}>`
    });
    
    return ticket;
  }

  /**
   * Rename a ticket
   * @param {string} channelId - The channel ID
   * @param {string} newName - The new name for the ticket
   * @param {string} renamedBy - The user ID who renamed the ticket
   * @returns {Object|null} The updated ticket or null
   */
  renameTicket(channelId, newName, renamedBy) {
    const ticket = this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    ticket.newName = newName;
    
    this.tickets.set(channelId, ticket);
    this.addTicketLog(ticket.guildId, {
      action: 'rename',
      ticketId: ticket.id,
      userId: renamedBy,
      timestamp: new Date().toISOString(),
      details: `Ticket renamed to ${newName}`
    });
    
    return ticket;
  }

  /**
   * Add a message to a ticket (for transcript)
   * @param {string} channelId - The channel ID
   * @param {Object} message - The message data
   */
  addMessageToTicket(channelId, message) {
    const ticket = this.getTicketByChannelId(channelId);
    if (!ticket) return;
    
    ticket.messages.push({
      id: message.id,
      content: message.content,
      author: message.author.id,
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map(a => a.url)
    });
    
    this.tickets.set(channelId, ticket);
  }

  /**
   * Get ticket transcript
   * @param {string} channelId - The channel ID
   * @returns {Array|null} The ticket messages or null
   */
  getTicketTranscript(channelId) {
    const ticket = this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    return ticket.messages;
  }

  /**
   * Add a ticket log entry
   * @param {string} guildId - The guild ID
   * @param {Object} logEntry - The log entry
   */
  addTicketLog(guildId, logEntry) {
    if (!this.ticketLogs.has(guildId)) {
      this.ticketLogs.set(guildId, []);
    }
    
    const logs = this.ticketLogs.get(guildId);
    logs.push(logEntry);
    this.ticketLogs.set(guildId, logs);
  }

  /**
   * Get ticket logs for a guild
   * @param {string} guildId - The guild ID
   * @returns {Array} The ticket logs
   */
  getTicketLogs(guildId) {
    return this.ticketLogs.get(guildId) || [];
  }

  /**
   * Update the ticket category
   * @param {string} guildId - The guild ID
   * @param {string} categoryId - The category ID
   * @returns {Object} The updated settings
   */
  updateTicketCategory(guildId, categoryId) {
    const settings = this.getTicketSettings(guildId);
    if (!settings) return null;
    
    settings.category = categoryId;
    this.ticketSettings.set(guildId, settings);
    
    return settings;
  }
}

// Create singleton instance
const ticketManager = new TicketManager();

module.exports = ticketManager;
