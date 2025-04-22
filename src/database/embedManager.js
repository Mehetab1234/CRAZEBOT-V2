// In-memory embed template management system
const { Collection } = require('discord.js');
const config = require('../config');

class EmbedManager {
  constructor() {
    this.templates = new Collection();
    this.sentEmbeds = new Collection();
  }

  /**
   * Create a new embed template
   * @param {string} guildId - The guild ID
   * @param {string} name - The template name
   * @param {Object} embedData - The embed data
   * @param {string} createdBy - The user ID who created the template
   * @returns {Object} The created template
   */
  createTemplate(guildId, name, embedData, createdBy) {
    const template = {
      id: `${guildId}-${Date.now()}`,
      name: name,
      embedData: embedData,
      createdBy: createdBy,
      createdAt: new Date().toISOString(),
      guildId: guildId
    };
    
    if (!this.templates.has(guildId)) {
      this.templates.set(guildId, new Collection());
    }
    
    const guildTemplates = this.templates.get(guildId);
    guildTemplates.set(name, template);
    
    return template;
  }

  /**
   * Get a template by name
   * @param {string} guildId - The guild ID
   * @param {string} name - The template name
   * @returns {Object|null} The template or null
   */
  getTemplate(guildId, name) {
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
  deleteTemplate(guildId, name) {
    const guildTemplates = this.templates.get(guildId);
    if (!guildTemplates) return false;
    
    return guildTemplates.delete(name);
  }

  /**
   * Get all templates for a guild
   * @param {string} guildId - The guild ID
   * @returns {Array} The templates
   */
  getAllTemplates(guildId) {
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
  storeSentEmbed(messageId, channelId, guildId, embedData, createdBy) {
    const storedEmbed = {
      messageId,
      channelId,
      guildId,
      embedData,
      createdBy,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    this.sentEmbeds.set(messageId, storedEmbed);
    return storedEmbed;
  }

  /**
   * Get a sent embed
   * @param {string} messageId - The message ID
   * @returns {Object|null} The embed or null
   */
  getSentEmbed(messageId) {
    return this.sentEmbeds.get(messageId) || null;
  }

  /**
   * Update a sent embed
   * @param {string} messageId - The message ID
   * @param {Object} embedData - The new embed data
   * @param {string} updatedBy - The user ID who updated the embed
   * @returns {Object|null} The updated embed or null
   */
  updateSentEmbed(messageId, embedData, updatedBy) {
    const storedEmbed = this.getSentEmbed(messageId);
    if (!storedEmbed) return null;
    
    storedEmbed.embedData = embedData;
    storedEmbed.lastUpdated = new Date().toISOString();
    storedEmbed.updatedBy = updatedBy;
    
    this.sentEmbeds.set(messageId, storedEmbed);
    return storedEmbed;
  }

  /**
   * Delete a sent embed
   * @param {string} messageId - The message ID
   * @returns {boolean} Whether the embed was deleted
   */
  deleteSentEmbed(messageId) {
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
