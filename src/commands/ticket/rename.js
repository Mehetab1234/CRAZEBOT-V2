const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-rename')
    .setDescription('Rename a ticket channel')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('New name for the ticket (without ticket- prefix)')
        .setRequired(false)),
    
  async execute(interaction) {
    const channelId = interaction.channel.id;
    
    // Check if this channel is a ticket
    const ticket = ticketManager.getTicketByChannelId(channelId);
    
    if (!ticket) {
      return interaction.reply({ 
        embeds: [error('Not a Ticket', 'This command can only be used in a ticket channel.')],
        ephemeral: true
      });
    }
    
    // If name is provided directly
    const newName = interaction.options.getString('name');
    if (newName) {
      await this.renameTicket(interaction, newName);
    } else {
      // Show a modal to enter the name
      const modal = new ModalBuilder()
        .setCustomId('ticket_rename_modal')
        .setTitle('Rename Ticket');
      
      const nameInput = new TextInputBuilder()
        .setCustomId('ticketName')
        .setLabel('New ticket name (without ticket- prefix)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter new name')
        .setRequired(true)
        .setMaxLength(32);
      
      const row = new ActionRowBuilder().addComponents(nameInput);
      modal.addComponents(row);
      
      await interaction.showModal(modal);
    }
  },
  
  // Handle modal submission
  async handleModal(interaction) {
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const newName = interaction.fields.getTextInputValue('ticketName');
    
    await this.renameTicket(interaction, newName);
  },
  
  // Common function to handle renaming
  async renameTicket(interaction, newName) {
    await interaction.deferReply();
    
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    
    // Validate ticket exists
    const ticket = ticketManager.getTicketByChannelId(channelId);
    if (!ticket) {
      return interaction.editReply({ 
        embeds: [error('Not a Ticket', 'This command can only be used in a ticket channel.')] 
      });
    }
    
    // Clean the name - only allow alphanumeric, dashes and underscores
    const cleanName = newName.replace(/[^\w-]/g, '').toLowerCase();
    if (!cleanName) {
      return interaction.editReply({ 
        embeds: [error('Invalid Name', 'The ticket name must contain valid characters (alphanumeric, dashes, underscores).')] 
      });
    }
    
    // Format the new name
    const formattedName = `ticket-${cleanName}`;
    
    try {
      // Update the ticket in the manager
      ticketManager.renameTicket(channelId, formattedName, interaction.user.id);
      
      // Rename the channel
      await interaction.channel.setName(formattedName);
      
      // Log to ticket logs
      const settings = ticketManager.getTicketSettings(guildId);
      if (settings && settings.logsChannel) {
        const guild = interaction.guild;
        const logsChannel = guild.channels.cache.get(settings.logsChannel) ||
                          guild.channels.cache.find(c => c.name === settings.logsChannel);
        
        if (logsChannel) {
          await logsChannel.send({
            embeds: [
              {
                color: parseInt(config.colors.info.replace('#', ''), 16),
                title: 'Ticket Renamed',
                description: `<@${interaction.user.id}> renamed ticket ${ticket.id} to \`${formattedName}\``,
                timestamp: new Date().toISOString()
              }
            ]
          });
        }
      }
      
      return interaction.editReply({ 
        embeds: [success('Ticket Renamed', `The ticket has been renamed to \`${formattedName}\`.`)] 
      });
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Failed to Rename', `Error: ${err.message}`)] 
      });
    }
  }
};
