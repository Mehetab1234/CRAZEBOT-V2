const { SlashCommandBuilder } = require('discord.js');
const { getTimezoneListEmbed } = require('../../utils/timeUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worldclock-list')
    .setDescription('List all available timezones and regions'),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    // Get the timezone list embed
    const listEmbed = getTimezoneListEmbed();
    
    await interaction.editReply({ embeds: [listEmbed] });
  }
};
