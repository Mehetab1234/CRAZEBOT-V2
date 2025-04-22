const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-add')
    .setDescription('Add a user to the ticket')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to add to the ticket')
        .setRequired(true)),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const userId = interaction.options.getUser('user').id;
    
    // Check if this channel is a ticket
    const ticket = ticketManager.getTicketByChannelId(channelId);
    
    if (!ticket) {
      return interaction.editReply({ 
        embeds: [error('Not a Ticket', 'This command can only be used in a ticket channel.')] 
      });
    }
    
    // Check if ticket is closed
    if (ticket.status === 'closed') {
      return interaction.editReply({ 
        embeds: [error('Ticket Closed', 'This ticket is closed. Cannot add users to closed tickets.')] 
      });
    }
    
    // Check if user is already in the ticket
    if (ticket.participants.includes(userId)) {
      return interaction.editReply({ 
        embeds: [error('Already Added', 'This user is already added to the ticket.')] 
      });
    }
    
    // Add user to ticket
    ticketManager.addUserToTicket(channelId, userId, interaction.user.id);
    
    try {
      // Update channel permissions
      await interaction.channel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
      
      // Notify user
      await interaction.channel.send(`<@${userId}> has been added to the ticket by <@${interaction.user.id}>.`);
      
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
                title: 'User Added to Ticket',
                description: `<@${interaction.user.id}> added <@${userId}> to ticket ${ticket.id}`,
                timestamp: new Date().toISOString()
              }
            ]
          });
        }
      }
      
      return interaction.editReply({ 
        embeds: [success('User Added', `<@${userId}> has been added to the ticket.`)] 
      });
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Failed to Add User', `Error: ${err.message}`)] 
      });
    }
  }
};
