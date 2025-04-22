const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-remove')
    .setDescription('Remove a user from the ticket')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to remove from the ticket')
        .setRequired(true)),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const user = interaction.options.getUser('user');
    const userId = user.id;
    
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
        embeds: [error('Ticket Closed', 'This ticket is closed. Cannot remove users from closed tickets.')] 
      });
    }
    
    // Check if user is the ticket creator (cannot remove ticket creator)
    if (userId === ticket.userId) {
      return interaction.editReply({ 
        embeds: [error('Cannot Remove', 'You cannot remove the ticket creator from the ticket.')] 
      });
    }
    
    // Check if user is in the ticket
    if (!ticket.participants.includes(userId)) {
      return interaction.editReply({ 
        embeds: [error('Not in Ticket', 'This user is not in the ticket.')] 
      });
    }
    
    // Remove user from ticket
    ticketManager.removeUserFromTicket(channelId, userId, interaction.user.id);
    
    try {
      // Update channel permissions
      await interaction.channel.permissionOverwrites.delete(userId);
      
      // Notify in channel
      await interaction.channel.send(`<@${userId}> has been removed from the ticket by <@${interaction.user.id}>.`);
      
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
                color: parseInt(config.colors.warning.replace('#', ''), 16),
                title: 'User Removed from Ticket',
                description: `<@${interaction.user.id}> removed <@${userId}> from ticket ${ticket.id}`,
                timestamp: new Date().toISOString()
              }
            ]
          });
        }
      }
      
      return interaction.editReply({ 
        embeds: [success('User Removed', `<@${userId}> has been removed from the ticket.`)] 
      });
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Failed to Remove User', `Error: ${err.message}`)] 
      });
    }
  }
};
