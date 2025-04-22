// Database-backed ticket management system
const { Collection } = require('discord.js');
const config = require('../config');
const { db } = require('./db');
const { ticketSettings, tickets, ticketLogs } = require('./schema/tickets');
const { eq, and, desc } = require('drizzle-orm');

class TicketManager {
  constructor() {
    // Fallback collections for when database is not available
    this.tickets = new Collection();
    this.ticketSettings = new Collection();
    this.ticketLogs = new Collection();
    this.ticketCount = 0;
    this.useDatabase = !!db; // Check if database is available
    
    if (!this.useDatabase) {
      console.warn('Database not available. Using in-memory storage for tickets.');
    }
  }

  /**
   * Setup ticket system for a guild
   * @param {string} guildId - The guild ID
   * @param {Object} settings - The ticket settings
   * @returns {Object} The created settings
   */
  async setupTickets(guildId, settings) {
    const guildSettings = {
      settings: {
        category: settings.category || config.ticketSystem.defaultCategory,
        staffRoles: settings.staffRoles || config.ticketSystem.roleIds,
        logsChannel: settings.logsChannel || config.ticketSystem.logsChannel,
        ticketTypes: settings.ticketTypes || config.ticketSystem.ticketTypes,
        welcomeMessage: settings.welcomeMessage || 'Thank you for creating a ticket. Support staff will be with you shortly.',
      },
      guildId: guildId,
      panelMessageId: null,
      panelChannelId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (this.useDatabase) {
      try {
        // Check if settings already exist for this guild
        const [existingSettings] = await db
          .select()
          .from(ticketSettings)
          .where(eq(ticketSettings.guildId, guildId));
          
        if (existingSettings) {
          // Update existing settings
          const [updatedSettings] = await db
            .update(ticketSettings)
            .set({
              settings: guildSettings.settings,
              updatedAt: guildSettings.updatedAt
            })
            .where(eq(ticketSettings.guildId, guildId))
            .returning();
          
          return {
            ...updatedSettings.settings,
            panelMessageId: updatedSettings.panelMessageId,
            panelChannelId: updatedSettings.panelChannelId
          };
        } else {
          // Create new settings
          const [result] = await db
            .insert(ticketSettings)
            .values(guildSettings)
            .returning();
          
          return {
            ...result.settings,
            panelMessageId: result.panelMessageId,
            panelChannelId: result.panelChannelId
          };
        }
      } catch (error) {
        console.error('Error setting up tickets in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const memorySettings = {
      category: guildSettings.settings.category,
      staffRoles: guildSettings.settings.staffRoles,
      logsChannel: guildSettings.settings.logsChannel,
      ticketTypes: guildSettings.settings.ticketTypes,
      welcomeMessage: guildSettings.settings.welcomeMessage,
      panelMessageId: null,
      panelChannelId: null,
    };
    
    this.ticketSettings.set(guildId, memorySettings);
    return memorySettings;
  }

  /**
   * Get ticket settings for a guild
   * @param {string} guildId - The guild ID
   * @returns {Object|null} The ticket settings or null
   */
  async getTicketSettings(guildId) {
    if (this.useDatabase) {
      try {
        const [result] = await db
          .select()
          .from(ticketSettings)
          .where(eq(ticketSettings.guildId, guildId));
          
        if (result) {
          // Transform DB result to expected format
          return {
            ...result.settings,
            panelMessageId: result.panelMessageId,
            panelChannelId: result.panelChannelId
          };
        }
        return null;
      } catch (error) {
        console.error('Error getting ticket settings from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    return this.ticketSettings.get(guildId) || null;
  }

  /**
   * Store panel message information
   * @param {string} guildId - The guild ID
   * @param {string} channelId - The channel ID where panel was sent
   * @param {string} messageId - The message ID of the panel
   */
  async storePanelMessage(guildId, channelId, messageId) {
    if (this.useDatabase) {
      try {
        const [existingSettings] = await db
          .select()
          .from(ticketSettings)
          .where(eq(ticketSettings.guildId, guildId));
          
        if (existingSettings) {
          await db
            .update(ticketSettings)
            .set({
              panelMessageId: messageId,
              panelChannelId: channelId,
              updatedAt: new Date()
            })
            .where(eq(ticketSettings.guildId, guildId));
          return;
        }
      } catch (error) {
        console.error('Error storing panel message in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const settings = await this.getTicketSettings(guildId);
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
  async createTicket(guildId, channelId, userId, type) {
    this.ticketCount++;
    const ticketId = `ticket-${this.ticketCount}`;
    
    const ticket = {
      channelId: channelId,
      userId: userId,
      guildId: guildId,
      type: type,
      status: 'open',
      closed: false,
      usersAdded: [userId],
      messages: [],
      createdAt: new Date(),
      ticketName: ticketId
    };
    
    if (this.useDatabase) {
      try {
        const [result] = await db.insert(tickets).values(ticket).returning();
        
        // Add a log entry
        const logEntry = {
          action: 'create',
          ticketId: result.id,
          userId,
          timestamp: new Date(),
          details: `Ticket created: ${type}`
        };
        await this.addTicketLog(guildId, logEntry);
        
        // Format result to match expected structure
        return {
          id: result.ticketName,
          channelId: result.channelId,
          userId: result.userId,
          guildId: result.guildId,
          type: result.type,
          status: result.status,
          createdAt: result.createdAt.toISOString(),
          claimedBy: result.claimedBy,
          participants: result.usersAdded,
          messages: result.messages
        };
      } catch (error) {
        console.error('Error creating ticket in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const memoryTicket = {
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
    
    this.tickets.set(channelId, memoryTicket);
    this.addTicketLog(guildId, {
      action: 'create',
      ticketId,
      userId,
      timestamp: new Date().toISOString(),
      details: `Ticket created: ${type}`
    });
    
    return memoryTicket;
  }

  /**
   * Get a ticket by channel ID
   * @param {string} channelId - The channel ID
   * @returns {Object|null} The ticket or null
   */
  async getTicketByChannelId(channelId) {
    if (this.useDatabase) {
      try {
        const [result] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.channelId, channelId));
          
        if (result) {
          // Format result to match expected structure
          return {
            id: result.ticketName,
            channelId: result.channelId,
            userId: result.userId,
            guildId: result.guildId,
            type: result.type,
            status: result.status,
            createdAt: result.createdAt.toISOString(),
            claimedBy: result.claimedBy,
            participants: result.usersAdded,
            messages: result.messages,
            closedAt: result.closedAt ? result.closedAt.toISOString() : null,
            closedBy: result.closedBy,
            newName: result.ticketName
          };
        }
        return null;
      } catch (error) {
        console.error('Error getting ticket from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    return this.tickets.get(channelId) || null;
  }

  /**
   * Close a ticket
   * @param {string} channelId - The channel ID
   * @param {string} closedBy - The user ID who closed the ticket
   * @returns {Object|null} The updated ticket or null
   */
  async closeTicket(channelId, closedBy) {
    const ticket = await this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    const now = new Date();
    
    if (this.useDatabase) {
      try {
        const [result] = await db
          .update(tickets)
          .set({
            status: 'closed',
            closed: true,
            closedAt: now,
            closedBy: closedBy,
            updatedAt: now
          })
          .where(eq(tickets.channelId, channelId))
          .returning();
          
        if (result) {
          // Add a log entry
          const logEntry = {
            action: 'close',
            ticketId: result.id,
            userId: closedBy,
            timestamp: now,
            details: `Ticket closed`
          };
          await this.addTicketLog(result.guildId, logEntry);
          
          // Format result to match expected structure
          return {
            id: result.ticketName,
            channelId: result.channelId,
            userId: result.userId,
            guildId: result.guildId,
            type: result.type,
            status: result.status,
            createdAt: result.createdAt.toISOString(),
            closedAt: result.closedAt.toISOString(),
            closedBy: result.closedBy,
            claimedBy: result.claimedBy,
            participants: result.usersAdded,
            messages: result.messages
          };
        }
      } catch (error) {
        console.error('Error closing ticket in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    ticket.status = 'closed';
    ticket.closedAt = now.toISOString();
    ticket.closedBy = closedBy;
    
    this.tickets.set(channelId, ticket);
    this.addTicketLog(ticket.guildId, {
      action: 'close',
      ticketId: ticket.id,
      userId: closedBy,
      timestamp: now.toISOString(),
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
  async addUserToTicket(channelId, userId, addedBy) {
    const ticket = await this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    if (this.useDatabase) {
      try {
        const [existingTicket] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.channelId, channelId));
          
        if (!existingTicket) return null;
        
        // Check if user already added
        if (existingTicket.usersAdded.includes(userId)) {
          return ticket; // User already in ticket
        }
        
        // Add user to the array
        const updatedUsers = [...existingTicket.usersAdded, userId];
        const now = new Date();
        
        const [result] = await db
          .update(tickets)
          .set({
            usersAdded: updatedUsers,
            updatedAt: now
          })
          .where(eq(tickets.channelId, channelId))
          .returning();
          
        if (result) {
          // Add a log entry
          const logEntry = {
            action: 'add_user',
            ticketId: result.id,
            userId: addedBy,
            timestamp: now,
            details: `Added user <@${userId}> to ticket`
          };
          await this.addTicketLog(result.guildId, logEntry);
          
          // Format result to match expected structure
          return {
            id: result.ticketName,
            channelId: result.channelId,
            userId: result.userId,
            guildId: result.guildId,
            type: result.type,
            status: result.status,
            createdAt: result.createdAt.toISOString(),
            claimedBy: result.claimedBy,
            participants: result.usersAdded,
            messages: result.messages
          };
        }
      } catch (error) {
        console.error('Error adding user to ticket in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
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
  async removeUserFromTicket(channelId, userId, removedBy) {
    const ticket = await this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    // Cannot remove the ticket creator
    if (ticket.userId === userId) return ticket;
    
    if (this.useDatabase) {
      try {
        const [existingTicket] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.channelId, channelId));
          
        if (!existingTicket) return null;
        if (existingTicket.userId === userId) return ticket; // Can't remove creator
        
        // Remove user from the array
        const updatedUsers = existingTicket.usersAdded.filter(u => u !== userId);
        const now = new Date();
        
        const [result] = await db
          .update(tickets)
          .set({
            usersAdded: updatedUsers,
            updatedAt: now
          })
          .where(eq(tickets.channelId, channelId))
          .returning();
          
        if (result) {
          // Add a log entry
          const logEntry = {
            action: 'remove_user',
            ticketId: result.id,
            userId: removedBy,
            timestamp: now,
            details: `Removed user <@${userId}> from ticket`
          };
          await this.addTicketLog(result.guildId, logEntry);
          
          // Format result to match expected structure
          return {
            id: result.ticketName,
            channelId: result.channelId,
            userId: result.userId,
            guildId: result.guildId,
            type: result.type,
            status: result.status,
            createdAt: result.createdAt.toISOString(),
            claimedBy: result.claimedBy,
            participants: result.usersAdded,
            messages: result.messages
          };
        }
      } catch (error) {
        console.error('Error removing user from ticket in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
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
  async claimTicket(channelId, userId) {
    const ticket = await this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    const now = new Date();
    
    if (this.useDatabase) {
      try {
        const [result] = await db
          .update(tickets)
          .set({
            claimedBy: userId,
            updatedAt: now
          })
          .where(eq(tickets.channelId, channelId))
          .returning();
          
        if (result) {
          // Add a log entry
          const logEntry = {
            action: 'claim',
            ticketId: result.id,
            userId: userId,
            timestamp: now,
            details: `Ticket claimed by <@${userId}>`
          };
          await this.addTicketLog(result.guildId, logEntry);
          
          // Format result to match expected structure
          return {
            id: result.ticketName,
            channelId: result.channelId,
            userId: result.userId,
            guildId: result.guildId,
            type: result.type,
            status: result.status,
            createdAt: result.createdAt.toISOString(),
            claimedBy: result.claimedBy,
            claimedAt: now.toISOString(),
            participants: result.usersAdded,
            messages: result.messages
          };
        }
      } catch (error) {
        console.error('Error claiming ticket in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    ticket.claimedBy = userId;
    ticket.claimedAt = now.toISOString();
    
    this.tickets.set(channelId, ticket);
    this.addTicketLog(ticket.guildId, {
      action: 'claim',
      ticketId: ticket.id,
      userId,
      timestamp: now.toISOString(),
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
  async renameTicket(channelId, newName, renamedBy) {
    const ticket = await this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    const now = new Date();
    
    if (this.useDatabase) {
      try {
        const [result] = await db
          .update(tickets)
          .set({
            ticketName: newName,
            updatedAt: now
          })
          .where(eq(tickets.channelId, channelId))
          .returning();
          
        if (result) {
          // Add a log entry
          const logEntry = {
            action: 'rename',
            ticketId: result.id,
            userId: renamedBy,
            timestamp: now,
            details: `Ticket renamed to ${newName}`
          };
          await this.addTicketLog(result.guildId, logEntry);
          
          // Format result to match expected structure
          return {
            id: result.ticketName,
            channelId: result.channelId,
            userId: result.userId,
            guildId: result.guildId,
            type: result.type,
            status: result.status,
            createdAt: result.createdAt.toISOString(),
            claimedBy: result.claimedBy,
            participants: result.usersAdded,
            messages: result.messages,
            newName: result.ticketName
          };
        }
      } catch (error) {
        console.error('Error renaming ticket in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    ticket.newName = newName;
    
    this.tickets.set(channelId, ticket);
    this.addTicketLog(ticket.guildId, {
      action: 'rename',
      ticketId: ticket.id,
      userId: renamedBy,
      timestamp: now.toISOString(),
      details: `Ticket renamed to ${newName}`
    });
    
    return ticket;
  }

  /**
   * Add a message to a ticket (for transcript)
   * @param {string} channelId - The channel ID
   * @param {Object} message - The message data
   */
  async addMessageToTicket(channelId, message) {
    const ticket = await this.getTicketByChannelId(channelId);
    if (!ticket) return;
    
    const messageData = {
      id: message.id,
      content: message.content,
      author: message.author.id,
      timestamp: message.createdAt.toISOString(),
      attachments: message.attachments.map(a => a.url)
    };
    
    if (this.useDatabase) {
      try {
        const [existingTicket] = await db
          .select()
          .from(tickets)
          .where(eq(tickets.channelId, channelId));
          
        if (!existingTicket) return;
        
        // Add message to the array
        const updatedMessages = [...existingTicket.messages, messageData];
        
        await db
          .update(tickets)
          .set({
            messages: updatedMessages,
            updatedAt: new Date()
          })
          .where(eq(tickets.channelId, channelId));
          
        return;
      } catch (error) {
        console.error('Error adding message to ticket in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    if (!ticket.messages) ticket.messages = [];
    ticket.messages.push(messageData);
    
    this.tickets.set(channelId, ticket);
  }

  /**
   * Get ticket transcript
   * @param {string} channelId - The channel ID
   * @returns {Array|null} The ticket messages or null
   */
  async getTicketTranscript(channelId) {
    const ticket = await this.getTicketByChannelId(channelId);
    if (!ticket) return null;
    
    return ticket.messages || [];
  }

  /**
   * Add a ticket log entry
   * @param {string} guildId - The guild ID
   * @param {Object} logEntry - The log entry
   */
  async addTicketLog(guildId, logEntry) {
    if (this.useDatabase) {
      try {
        // Make sure timestamp is a Date object
        if (typeof logEntry.timestamp === 'string') {
          logEntry.timestamp = new Date(logEntry.timestamp);
        }
        
        const entry = {
          guildId,
          entry: logEntry,
          createdAt: new Date()
        };
        
        await db.insert(ticketLogs).values(entry);
        return;
      } catch (error) {
        console.error('Error adding ticket log to database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
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
  async getTicketLogs(guildId) {
    if (this.useDatabase) {
      try {
        const results = await db
          .select()
          .from(ticketLogs)
          .where(eq(ticketLogs.guildId, guildId))
          .orderBy(desc(ticketLogs.createdAt));
          
        // Format results to match expected structure
        return results.map(log => log.entry);
      } catch (error) {
        console.error('Error getting ticket logs from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    return this.ticketLogs.get(guildId) || [];
  }

  /**
   * Update the ticket category
   * @param {string} guildId - The guild ID
   * @param {string} categoryId - The category ID
   * @returns {Object} The updated settings
   */
  async updateTicketCategory(guildId, categoryId) {
    const settings = await this.getTicketSettings(guildId);
    if (!settings) return null;
    
    if (this.useDatabase) {
      try {
        const [existingSettings] = await db
          .select()
          .from(ticketSettings)
          .where(eq(ticketSettings.guildId, guildId));
          
        if (existingSettings) {
          // Update the category in the settings object
          const updatedSettings = {
            ...existingSettings.settings,
            category: categoryId
          };
          
          const [result] = await db
            .update(ticketSettings)
            .set({
              settings: updatedSettings,
              updatedAt: new Date()
            })
            .where(eq(ticketSettings.guildId, guildId))
            .returning();
            
          if (result) {
            return {
              ...result.settings,
              panelMessageId: result.panelMessageId,
              panelChannelId: result.panelChannelId
            };
          }
        }
      } catch (error) {
        console.error('Error updating ticket category in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    settings.category = categoryId;
    this.ticketSettings.set(guildId, settings);
    
    return settings;
  }
}

// Create singleton instance
const ticketManager = new TicketManager();

module.exports = ticketManager;
