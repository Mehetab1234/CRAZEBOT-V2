// Utility to handle errors consistently across the bot
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Handles an error and logs it
 * @param {string} context - The context in which the error occurred
 * @param {Error} error - The error object
 */
function handleError(context, error) {
  console.error(`[ERROR][${context}] ${error.message}`);
  console.error(error.stack);
}

/**
 * Creates an error response for interactions
 * @param {string} errorMessage - The error message to display
 * @param {boolean} ephemeral - Whether the response should be ephemeral
 * @returns {Object} The error response object
 */
function createErrorResponse(errorMessage, ephemeral = true) {
  const embed = new EmbedBuilder()
    .setTitle('Error')
    .setDescription(errorMessage)
    .setColor(config.colors.error)
    .setTimestamp();

  return { embeds: [embed], ephemeral };
}

/**
 * Handle an interaction error
 * @param {Interaction} interaction - The interaction object
 * @param {Error} error - The error that occurred
 * @param {string} context - The context in which the error occurred
 */
async function handleInteractionError(interaction, error, context) {
  handleError(context, error);
  
  // If the interaction can be replied to
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(createErrorResponse('An error occurred while processing your request.'))
      .catch(err => console.error('Failed to edit reply with error message:', err));
  } else if (interaction.isRepliable()) {
    await interaction.reply(createErrorResponse('An error occurred while processing your request.'))
      .catch(err => console.error('Failed to reply with error message:', err));
  }
}

/**
 * Check if a user has the required permissions
 * @param {Interaction} interaction - The interaction object
 * @param {Array} permissions - The required permissions
 * @returns {boolean} Whether the user has the required permissions
 */
function checkPermissions(interaction, permissions) {
  if (!interaction.memberPermissions.has(permissions)) {
    interaction.reply(createErrorResponse(`You don't have the required permissions to use this command.`));
    return false;
  }
  return true;
}

module.exports = {
  handleError,
  createErrorResponse,
  handleInteractionError,
  checkPermissions
};
