const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-claim')
    .setDescription('Claim a ticket to show you are handling it'),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const guildId = interaction.guild.id;
    const channelId = interaction.channel.id;
    const userId = interaction.user.id;
    
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
        embeds: [error('Ticket Closed', 'This ticket is closed and cannot be claimed.')] 
      });
    }
    
    // Check if ticket is already claimed
    if (ticket.claimedBy) {
      if (ticket.claimedBy === userId) {
        return interaction.editReply({ 
          embeds: [error('Already Claimed', 'You have already claimed this ticket.')] 
        });
      } else {
        return interaction.editReply({ 
          embeds: [error('Already Claimed', `This ticket is already claimed by <@${ticket.claimedBy}>.`)] 
        });
      }
    }
    
    // Claim the ticket
    ticketManager.claimTicket(channelId, userId);
    
    // Send claim message
    const claimEmbed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('Ticket Claimed')
      .setDescription(`This ticket has been claimed by <@${userId}>. They will be assisting you.`)
      .setTimestamp();
    
    await interaction.channel.send({ embeds: [claimEmbed] });
    
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
              title: 'Ticket Claimed',
              description: `<@${userId}> claimed ticket ${ticket.id}`,
              timestamp: new Date().toISOString()
            }
          ]
        });
      }
    }
    
    return interaction.editReply({ 
      embeds: [success('Ticket Claimed', 'You have claimed this ticket.')] 
    });
  },
  
  // Handle button interactions
  async handleButton(interaction) {
    // Simply call the execute method as the logic is identical
    await this.execute(interaction);
  }
};
