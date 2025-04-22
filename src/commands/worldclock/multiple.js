const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createMultipleTimezonesEmbed, commonTimezones } = require('../../utils/timeUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worldclock-multiple')
    .setDescription('Show the current time in multiple timezones')
    .addStringOption(option => 
      option.setName('preset')
        .setDescription('Preset timezone groups')
        .setRequired(false)
        .addChoices(
          { name: 'Major US', value: 'us' },
          { name: 'Global', value: 'global' },
          { name: 'Europe', value: 'europe' },
          { name: 'Asia Pacific', value: 'apac' }
        )),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const preset = interaction.options.getString('preset');
    
    // Define preset timezone groups
    const presets = {
      us: [
        { code: 'EST', label: 'Eastern Time' },
        { code: 'CST', label: 'Central Time' },
        { code: 'MST', label: 'Mountain Time' },
        { code: 'PST', label: 'Pacific Time' },
        { code: 'AKST', label: 'Alaska Time' },
        { code: 'HST', label: 'Hawaii Time' }
      ],
      global: [
        { code: 'UTC', label: 'Universal Time' },
        { code: 'EST', label: 'Eastern Time (US)' },
        { code: 'PST', label: 'Pacific Time (US)' },
        { code: 'GMT', label: 'London' },
        { code: 'CET', label: 'Central Europe' },
        { code: 'IST', label: 'India' },
        { code: 'JST', label: 'Japan/Korea' },
        { code: 'AEST', label: 'Australia Eastern' }
      ],
      europe: [
        { code: 'GMT', label: 'London' },
        { code: 'CET', label: 'Paris/Berlin/Rome' },
        { code: 'EET', label: 'Eastern Europe' },
        { code: 'MSK', label: 'Moscow' }
      ],
      apac: [
        { code: 'IST', label: 'India' },
        { code: 'ICT', label: 'Thailand/Vietnam' },
        { code: 'CST', label: 'China/Taiwan' },
        { code: 'JST', label: 'Japan/Korea' },
        { code: 'AEST', label: 'Sydney/Melbourne' },
        { code: 'NZST', label: 'New Zealand' }
      ]
    };
    
    // If preset is provided, use it
    if (preset && presets[preset]) {
      const timezones = presets[preset];
      const timezonesEmbed = createMultipleTimezonesEmbed(timezones);
      
      return interaction.editReply({ embeds: [timezonesEmbed] });
    }
    
    // If no preset, show dropdown for user to select timezones
    const options = Object.entries(commonTimezones).map(([code, tz]) => ({
      label: code,
      description: tz,
      value: code
    }));
    
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('worldclock_select')
          .setPlaceholder('Select timezones to display')
          .setMinValues(1)
          .setMaxValues(10)
          .addOptions(options.slice(0, 25)) // Discord has a 25 option limit
      );
    
    await interaction.editReply({
      content: 'Select up to 10 timezones to display:',
      components: [row]
    });
  },
  
  // Handle select menu interactions
  async handleSelectMenu(interaction) {
    if (interaction.customId === 'worldclock_select') {
      await interaction.deferUpdate();
      
      const selectedTimezones = interaction.values.map(code => ({
        code,
        label: code
      }));
      
      const timezonesEmbed = createMultipleTimezonesEmbed(selectedTimezones);
      
      await interaction.editReply({
        content: null,
        embeds: [timezonesEmbed],
        components: []
      });
    }
  }
};
