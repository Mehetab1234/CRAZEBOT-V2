// Database-backed embed template management system
const { Collection } = require('discord.js');
const config = require('../config');
const { db } = require('./db');
const { embedTemplates, sentEmbeds } = require('./schema/embeds');
const { eq, and } = require('drizzle-orm');

class EmbedManager {
  constructor() {
    // Fallback collections for when database is not available
    this.templates = new Collection();
    this.sentEmbeds = new Collection();
    this.useDatabase = !!db; // Check if database is available
    
    if (!this.useDatabase) {
      console.warn('Database not available. Using in-memory storage for embeds.');
    }
  }

  /**
   * Create a new embed template
   * @param {string} guildId - The guild ID
   * @param {string} name - The template name
   * @param {Object} embedData - The embed data
   * @param {string} createdBy - The user ID who created the template
   * @returns {Object} The created template
   */
  async createTemplate(guildId, name, embedData, createdBy) {
    const template = {
      guildId: guildId,
      name: name,
      embedData: embedData,
      createdBy: createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (this.useDatabase) {
      try {
        const [result] = await db.insert(embedTemplates).values(template).returning();
        return result;
      } catch (error) {
        console.error('Error creating template in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const memoryTemplate = {
      ...template,
      id: `${guildId}-${Date.now()}`,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    };
    
    if (!this.templates.has(guildId)) {
      this.templates.set(guildId, new Collection());
    }
    
    const guildTemplates = this.templates.get(guildId);
    guildTemplates.set(name, memoryTemplate);
    
    return memoryTemplate;
  }

  /**
   * Get a template by name
   * @param {string} guildId - The guild ID
   * @param {string} name - The template name
   * @returns {Object|null} The template or null
   */
  async getTemplate(guildId, name) {
    if (this.useDatabase) {
      try {
        const [result] = await db
          .select()
          .from(embedTemplates)
          .where(and(
            eq(embedTemplates.guildId, guildId),
            eq(embedTemplates.name, name)
          ));
        return result || null;
      } catch (error) {
        console.error('Error getting template from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const guildTemplates = this.templates.get(guildId);
    if (!guildTemplates) return null;
    
    return guildTemplates.get(name) || null;
  }

  /**
   * Delete a template
   * @param {string} guildId - The guild ID
   * @param {string} name - The template name
   * @returns {boolean} Whether the template was deleted
   */
  async deleteTemplate(guildId, name) {
    if (this.useDatabase) {
      try {
        const result = await db
          .delete(embedTemplates)
          .where(and(
            eq(embedTemplates.guildId, guildId),
            eq(embedTemplates.name, name)
          ));
        return result.rowCount > 0;
      } catch (error) {
        console.error('Error deleting template from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const guildTemplates = this.templates.get(guildId);
    if (!guildTemplates) return false;
    
    return guildTemplates.delete(name);
  }

  /**
   * Get all templates for a guild
   * @param {string} guildId - The guild ID
   * @returns {Array} The templates
   */
  async getAllTemplates(guildId) {
    if (this.useDatabase) {
      try {
        const results = await db
          .select()
          .from(embedTemplates)
          .where(eq(embedTemplates.guildId, guildId));
        return results;
      } catch (error) {
        console.error('Error getting templates from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const guildTemplates = this.templates.get(guildId);
    if (!guildTemplates) return [];
    
    return Array.from(guildTemplates.values());
  }

  /**
   * Store a sent embed
   * @param {string} messageId - The message ID
   * @param {string} channelId - The channel ID
   * @param {string} guildId - The guild ID
   * @param {Object} embedData - The embed data
   * @param {string} createdBy - The user ID who created the embed
   * @returns {Object} The stored embed
   */
  async storeSentEmbed(messageId, channelId, guildId, embedData, createdBy) {
    const storedEmbed = {
      messageId,
      channelId,
      guildId,
      embedData,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (this.useDatabase) {
      try {
        const [result] = await db.insert(sentEmbeds).values(storedEmbed).returning();
        return result;
      } catch (error) {
        console.error('Error storing sent embed in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const memoryEmbed = {
      ...storedEmbed,
      createdAt: storedEmbed.createdAt.toISOString(),
      updatedAt: storedEmbed.updatedAt.toISOString()
    };
    
    this.sentEmbeds.set(messageId, memoryEmbed);
    return memoryEmbed;
  }

  /**
   * Get a sent embed
   * @param {string} messageId - The message ID
   * @returns {Object|null} The embed or null
   */
  async getSentEmbed(messageId) {
    if (this.useDatabase) {
      try {
        const [result] = await db
          .select()
          .from(sentEmbeds)
          .where(eq(sentEmbeds.messageId, messageId));
        return result || null;
      } catch (error) {
        console.error('Error getting sent embed from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    return this.sentEmbeds.get(messageId) || null;
  }

  /**
   * Update a sent embed
   * @param {string} messageId - The message ID
   * @param {Object} embedData - The new embed data
   * @param {string} updatedBy - The user ID who updated the embed
   * @returns {Object|null} The updated embed or null
   */
  async updateSentEmbed(messageId, embedData, updatedBy) {
    if (this.useDatabase) {
      try {
        const [storedEmbed] = await db
          .select()
          .from(sentEmbeds)
          .where(eq(sentEmbeds.messageId, messageId));
          
        if (!storedEmbed) return null;
        
        const [updatedEmbed] = await db
          .update(sentEmbeds)
          .set({
            embedData: embedData,
            updatedAt: new Date(),
            updatedBy: updatedBy
          })
          .where(eq(sentEmbeds.messageId, messageId))
          .returning();
          
        return updatedEmbed;
      } catch (error) {
        console.error('Error updating sent embed in database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    const storedEmbed = this.sentEmbeds.get(messageId);
    if (!storedEmbed) return null;
    
    storedEmbed.embedData = embedData;
    storedEmbed.updatedAt = new Date().toISOString();
    storedEmbed.updatedBy = updatedBy;
    
    this.sentEmbeds.set(messageId, storedEmbed);
    return storedEmbed;
  }

  /**
   * Delete a sent embed
   * @param {string} messageId - The message ID
   * @returns {boolean} Whether the embed was deleted
   */
  async deleteSentEmbed(messageId) {
    if (this.useDatabase) {
      try {
        const result = await db
          .delete(sentEmbeds)
          .where(eq(sentEmbeds.messageId, messageId));
        return result.rowCount > 0;
      } catch (error) {
        console.error('Error deleting sent embed from database:', error);
        // Fall back to in-memory storage
      }
    }
    
    // In-memory fallback
    return this.sentEmbeds.delete(messageId);
  }

  /**
   * Get default embed templates
   * @returns {Object} The default templates
   */
  getDefaultTemplates() {
    return config.embedTemplates;
  }
}

// Create singleton instance
const embedManager = new EmbedManager();

module.exports = embedManager;
