const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Create a ticket panel for users to open tickets')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Channel to send the ticket panel to')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('title')
        .setDescription('Title for the ticket panel')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('description')
        .setDescription('Description for the ticket panel')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title') || 'Support Tickets';
    const description = interaction.options.getString('description') || 
      'To create a ticket, select the appropriate option below or click the button.';
    
    // Check if ticket system is set up
    const settings = ticketManager.getTicketSettings(guildId);
    
    if (!settings) {
      return interaction.editReply({ 
        embeds: [error('Ticket System Not Set Up', 'Please run `/ticket-setup` first to configure the ticket system.')] 
      });
    }
    
    // Create the ticket panel embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(title)
      .setDescription(description)
      .addFields({
        name: 'Available Support',
        value: settings.ticketTypes.map(type => `${type.emoji} **${type.name}**`).join('\n')
      })
      .setFooter({ text: 'Click the button below or use the dropdown to open a ticket' })
      .setTimestamp();
    
    // Create buttons for tickets
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_open_default')
          .setLabel('Create Ticket')
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary)
      );
    
    // Create dropdown for different ticket types
    const selectRow = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_open_select')
          .setPlaceholder('Select ticket type...')
          .addOptions(settings.ticketTypes.map(type => ({
            label: type.name,
            value: type.name,
            emoji: type.emoji,
            description: `Create a ${type.name} ticket`
          })))
      );
    
    // Send the panel
    try {
      const panelMessage = await channel.send({
        embeds: [embed],
        components: [row, selectRow]
      });
      
      // Store the panel message ID
      ticketManager.storePanelMessage(guildId, channel.id, panelMessage.id);
      
      await interaction.editReply({
        embeds: [
          success(
            'Ticket Panel Created',
            `The ticket panel has been created in ${channel}.`
          )
        ]
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [
          error(
            'Failed to Create Panel',
            `Error: ${err.message}`
          )
        ]
      });
    }
  },
  
  // Handle button interactions
  async handleButton(interaction, args) {
    if (args[0] === 'default') {
      // Open default ticket type
      await interaction.reply({ 
        content: 'Creating your ticket...', 
        ephemeral: true 
      });
      
      // Call ticket-open command logic
      const openCmd = require('./open.js');
      await openCmd.execute(interaction, 'General Support');
    }
  },
  
  // Handle select menu interactions
  async handleSelectMenu(interaction, args) {
    if (interaction.customId === 'ticket_open_select') {
      const ticketType = interaction.values[0];
      
      await interaction.reply({ 
        content: `Creating a ${ticketType} ticket...`, 
        ephemeral: true 
      });
      
      // Call ticket-open command logic
      const openCmd = require('./open.js');
      await openCmd.execute(interaction, ticketType);
    }
  }
};
