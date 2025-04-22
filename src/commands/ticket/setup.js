const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('Setup the ticket system')
    .addChannelOption(option => 
      option.setName('logs')
        .setDescription('Channel where ticket logs will be sent')
        .setRequired(false))
    .addChannelOption(option => 
      option.setName('category')
        .setDescription('Category where tickets will be created')
        .setRequired(false))
    .addRoleOption(option => 
      option.setName('staff-role')
        .setDescription('Role that can access tickets')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const logsChannel = interaction.options.getChannel('logs');
    const category = interaction.options.getChannel('category');
    const staffRole = interaction.options.getRole('staff-role');
    
    // Build settings object
    const settings = {};
    
    if (logsChannel) {
      settings.logsChannel = logsChannel.id;
    }
    
    if (category) {
      if (category.type !== 4) { // 4 is the channel type for categories
        return interaction.editReply({ 
          embeds: [error('Invalid Category', 'The channel you selected is not a category. Please select a valid category.')] 
        });
      }
      settings.category = category.id;
    }
    
    if (staffRole) {
      settings.staffRoles = [staffRole.id];
    }
    
    // Save settings
    const setupResult = ticketManager.setupTickets(guildId, settings);
    
    // Format response
    const responseFields = [];
    
    if (logsChannel) {
      responseFields.push({ name: 'Logs Channel', value: `<#${logsChannel.id}>`, inline: true });
    }
    
    if (category) {
      responseFields.push({ name: 'Tickets Category', value: `${category.name}`, inline: true });
    }
    
    if (staffRole) {
      responseFields.push({ name: 'Staff Role', value: `<@&${staffRole.id}>`, inline: true });
    }
    
    await interaction.editReply({
      embeds: [
        success(
          'Ticket System Setup',
          'The ticket system has been set up successfully. Use `/ticket-panel` to create a ticket creation panel.',
          { fields: responseFields }
        )
      ]
    });
  }
};
