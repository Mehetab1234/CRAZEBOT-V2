const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-category')
    .setDescription('Set the category for ticket channels')
    .addChannelOption(option => 
      option.setName('category')
        .setDescription('The category where tickets will be created')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const category = interaction.options.getChannel('category');
    
    // Validate category
    if (category.type !== ChannelType.GuildCategory) {
      return interaction.editReply({ 
        embeds: [error('Invalid Channel', 'Please select a category channel.')] 
      });
    }
    
    // Check if ticket system is set up
    const settings = ticketManager.getTicketSettings(guildId);
    
    if (!settings) {
      return interaction.editReply({ 
        embeds: [error('Ticket System Not Set Up', 'Please run `/ticket-setup` first to configure the ticket system.')] 
      });
    }
    
    // Update the ticket category
    ticketManager.updateTicketCategory(guildId, category.id);
    
    return interaction.editReply({ 
      embeds: [success('Category Updated', `Ticket category has been set to ${category.name}.`)] 
    });
  }
};
