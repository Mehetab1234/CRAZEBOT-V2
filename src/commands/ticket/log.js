const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-log')
    .setDescription('Set or view the ticket log channel')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the channel for ticket logs')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('The channel where ticket logs will be sent')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the current ticket log channel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const subcommand = interaction.options.getSubcommand();
    
    // Check if ticket system is set up
    const settings = ticketManager.getTicketSettings(guildId);
    
    if (!settings) {
      return interaction.editReply({ 
        embeds: [error('Ticket System Not Set Up', 'Please run `/ticket-setup` first to configure the ticket system.')] 
      });
    }
    
    if (subcommand === 'set') {
      const channel = interaction.options.getChannel('channel');
      
      // Update settings
      const updatedSettings = { ...settings, logsChannel: channel.id };
      ticketManager.setupTickets(guildId, updatedSettings);
      
      return interaction.editReply({ 
        embeds: [success('Logs Channel Set', `Ticket logs will now be sent to ${channel}.`)] 
      });
    } 
    else if (subcommand === 'view') {
      const logsChannel = settings.logsChannel ? 
        interaction.guild.channels.cache.get(settings.logsChannel) : null;
      
      if (!logsChannel) {
        return interaction.editReply({ 
          embeds: [error('No Logs Channel', 'No ticket logs channel has been set.')] 
        });
      }
      
      return interaction.editReply({ 
        embeds: [success('Ticket Logs Channel', `The current ticket logs channel is ${logsChannel}.`)] 
      });
    }
  }
};
