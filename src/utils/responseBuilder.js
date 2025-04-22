// Utility to build standardized Discord message responses
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const config = require('../config');

/**
 * Creates a standardized embed for responses
 * @param {string} type - The type of response (success, error, info, warning)
 * @param {string} title - The title of the embed
 * @param {string} description - The description of the embed
 * @param {Object} options - Additional options for the embed
 * @returns {EmbedBuilder} The constructed embed
 */
function createEmbed(type = 'info', title, description, options = {}) {
  const colors = {
    success: config.colors.success,
    error: config.colors.error,
    warning: config.colors.warning,
    info: config.colors.info,
  };

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(colors[type] || config.colors.primary)
    .setTimestamp();

  if (options.fields) {
    options.fields.forEach(field => {
      embed.addFields({ name: field.name, value: field.value, inline: field.inline || false });
    });
  }

  if (options.footer) {
    embed.setFooter({ text: options.footer });
  }

  if (options.thumbnail) {
    embed.setThumbnail(options.thumbnail);
  }

  if (options.image) {
    embed.setImage(options.image);
  }

  if (options.author) {
    embed.setAuthor(options.author);
  }

  return embed;
}

/**
 * Creates a success embed
 * @param {string} title - The title of the embed
 * @param {string} description - The description of the embed
 * @param {Object} options - Additional options for the embed
 * @returns {EmbedBuilder} The constructed embed
 */
function success(title, description, options = {}) {
  return createEmbed('success', title, description, options);
}

/**
 * Creates an error embed
 * @param {string} title - The title of the embed
 * @param {string} description - The description of the embed
 * @param {Object} options - Additional options for the embed
 * @returns {EmbedBuilder} The constructed embed
 */
function error(title, description, options = {}) {
  return createEmbed('error', title, description, options);
}

/**
 * Creates an info embed
 * @param {string} title - The title of the embed
 * @param {string} description - The description of the embed
 * @param {Object} options - Additional options for the embed
 * @returns {EmbedBuilder} The constructed embed
 */
function info(title, description, options = {}) {
  return createEmbed('info', title, description, options);
}

/**
 * Creates a warning embed
 * @param {string} title - The title of the embed
 * @param {string} description - The description of the embed
 * @param {Object} options - Additional options for the embed
 * @returns {EmbedBuilder} The constructed embed
 */
function warning(title, description, options = {}) {
  return createEmbed('warning', title, description, options);
}

/**
 * Creates a button row
 * @param {Array} buttons - Array of button objects with style, label, customId, etc.
 * @returns {ActionRowBuilder} The constructed button row
 */
function createButtonRow(buttons) {
  const row = new ActionRowBuilder();
  
  buttons.forEach(button => {
    const buttonBuilder = new ButtonBuilder()
      .setCustomId(button.customId)
      .setLabel(button.label)
      .setStyle(button.style);
    
    if (button.emoji) {
      buttonBuilder.setEmoji(button.emoji);
    }
    
    if (button.url) {
      buttonBuilder.setURL(button.url);
    }
    
    if (button.disabled) {
      buttonBuilder.setDisabled(true);
    }
    
    row.addComponents(buttonBuilder);
  });
  
  return row;
}

module.exports = {
  createEmbed,
  success,
  error,
  info,
  warning,
  createButtonRow
};
