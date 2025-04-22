// Event handler for interaction creation (commands, buttons, etc.)
const { Events, InteractionType } = require('discord.js');
const { handleError, handleInteractionError } = require('../utils/errorHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error, `Command: ${interaction.commandName}`);
      }
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      const [type, action, ...args] = interaction.customId.split('_');
      
      try {
        // Handle ticket buttons
        if (type === 'ticket') {
          const ticketHandler = require(`../commands/ticket/${action}.js`);
          if (ticketHandler && ticketHandler.handleButton) {
            await ticketHandler.handleButton(interaction, args);
          }
        }
        // Handle embed buttons
        else if (type === 'embed') {
          const embedHandler = require(`../commands/embed/${action}.js`);
          if (embedHandler && embedHandler.handleButton) {
            await embedHandler.handleButton(interaction, args);
          }
        }
        // Handle other button types as needed
      } catch (error) {
        await handleInteractionError(interaction, error, `Button: ${interaction.customId}`);
      }
    }
    
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      const [type, action, ...args] = interaction.customId.split('_');
      
      try {
        // Handle ticket select menus
        if (type === 'ticket') {
          const ticketHandler = require(`../commands/ticket/${action}.js`);
          if (ticketHandler && ticketHandler.handleSelectMenu) {
            await ticketHandler.handleSelectMenu(interaction, args);
          }
        }
        // Handle embed select menus
        else if (type === 'embed') {
          const embedHandler = require(`../commands/embed/${action}.js`);
          if (embedHandler && embedHandler.handleSelectMenu) {
            await embedHandler.handleSelectMenu(interaction, args);
          }
        }
        // Handle other select menu types as needed
      } catch (error) {
        await handleInteractionError(interaction, error, `SelectMenu: ${interaction.customId}`);
      }
    }
    
    // Handle modal submissions
    else if (interaction.type === InteractionType.ModalSubmit) {
      const [type, action, ...args] = interaction.customId.split('_');
      
      try {
        // Handle ticket modals
        if (type === 'ticket') {
          const ticketHandler = require(`../commands/ticket/${action}.js`);
          if (ticketHandler && ticketHandler.handleModal) {
            await ticketHandler.handleModal(interaction, args);
          }
        }
        // Handle embed modals
        else if (type === 'embed') {
          const embedHandler = require(`../commands/embed/${action}.js`);
          if (embedHandler && embedHandler.handleModal) {
            await embedHandler.handleModal(interaction, args);
          }
        }
        // Handle other modal types as needed
      } catch (error) {
        await handleInteractionError(interaction, error, `Modal: ${interaction.customId}`);
      }
    }
  },
};
