const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Close a ticket')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for closing the ticket')
        .setRequired(false)),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Check if this channel is a ticket
    const ticket = ticketManager.getTicketByChannelId(channelId);
    
    if (!ticket) {
      return interaction.editReply({ 
        embeds: [error('Not a Ticket', 'This command can only be used in a ticket channel.')] 
      });
    }
    
    // Check if ticket is already closed
    if (ticket.status === 'closed') {
      return interaction.editReply({ 
        embeds: [error('Ticket Already Closed', 'This ticket is already closed.')] 
      });
    }
    
    // Close the ticket
    await this.closeTicket(interaction, channelId, interaction.user.id, reason);
  },
  
  // Handle button interactions
  async handleButton(interaction) {
    await interaction.deferReply();
    
    const channelId = interaction.channel.id;
    const ticket = ticketManager.getTicketByChannelId(channelId);
    
    if (!ticket) {
      return interaction.editReply({ 
        content: 'This is not a ticket channel.',
        ephemeral: true
      });
    }
    
    if (ticket.status === 'closed') {
      return interaction.editReply({ 
        content: 'This ticket is already closed.',
        ephemeral: true
      });
    }
    
    // Ask for confirmation
    const confirmEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('Confirm Ticket Closure')
      .setDescription('Are you sure you want to close this ticket?')
      .setFooter({ text: 'The ticket will be closed and archived.' });
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close_confirm')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket_close_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.editReply({
      embeds: [confirmEmbed],
      components: [row]
    });
  },
  
  // Handle confirmation buttons
  async handleConfirmation(interaction, action) {
    const channelId = interaction.channel.id;
    
    if (action === 'confirm') {
      await interaction.update({
        content: 'Closing ticket...',
        embeds: [],
        components: []
      });
      
      await this.closeTicket(interaction, channelId, interaction.user.id, 'Closed via button');
    } else if (action === 'cancel') {
      await interaction.update({
        content: 'Ticket closure cancelled.',
        embeds: [],
        components: []
      });
    }
  },
  
  // Common function to close tickets
  async closeTicket(interaction, channelId, closedBy, reason) {
    const guildId = interaction.guild.id;
    
    // Update ticket in the manager
    const ticket = ticketManager.closeTicket(channelId, closedBy);
    
    if (!ticket) {
      return interaction.editReply({ 
        embeds: [error('Failed to Close', 'Could not find ticket information.')] 
      });
    }
    
    // Send closing message
    const closingEmbed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('Ticket Closed')
      .setDescription('This ticket has been closed.')
      .addFields(
        { name: 'Closed By', value: `<@${closedBy}>`, inline: true },
        { name: 'Reason', value: reason, inline: true }
      )
      .setTimestamp();
    
    // Create action buttons for transcript and delete
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_transcript')
          .setLabel('Save Transcript')
          .setEmoji('📝')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_delete')
          .setLabel('Delete Ticket')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger)
      );
    
    await interaction.channel.send({
      embeds: [closingEmbed],
      components: [row]
    });
    
    // Send log message if logs channel exists
    const settings = ticketManager.getTicketSettings(guildId);
    if (settings && settings.logsChannel) {
      const guild = interaction.guild;
      const logsChannel = guild.channels.cache.get(settings.logsChannel) ||
                        guild.channels.cache.find(c => c.name === settings.logsChannel);
      
      if (logsChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('Ticket Closed')
          .setDescription(`Ticket ${ticket.id} has been closed.`)
          .addFields(
            { name: 'Ticket Channel', value: `#${interaction.channel.name}`, inline: true },
            { name: 'Closed By', value: `<@${closedBy}>`, inline: true },
            { name: 'Reason', value: reason, inline: true }
          )
          .setTimestamp();
        
        await logsChannel.send({ embeds: [logEmbed] });
      }
    }
    
    // Reply to the original interaction if not already replied
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        embeds: [success('Ticket Closed', `The ticket has been closed by <@${closedBy}>.`)] 
      });
    } else {
      await interaction.editReply({ 
        embeds: [success('Ticket Closed', `The ticket has been closed.`)] 
      });
    }
  }
};
