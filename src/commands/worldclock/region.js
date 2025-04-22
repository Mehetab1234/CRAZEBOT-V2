const { SlashCommandBuilder } = require('discord.js');
const { createTimeEmbed, commonTimezones } = require('../../utils/timeUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('worldclock')
    .setDescription('Show the current time in a specific timezone or region')
    .addStringOption(option => 
      option.setName('region')
        .setDescription('The timezone or region to show time for')
        .setRequired(true)
        .setAutocomplete(true)),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    let region = interaction.options.getString('region');
    
    // Check if the provided region is a common timezone code
    if (commonTimezones[region.toUpperCase()]) {
      region = commonTimezones[region.toUpperCase()];
    }
    
    try {
      // Create embed with the time for the specified region
      const timeEmbed = createTimeEmbed(region, region);
      
      await interaction.editReply({ embeds: [timeEmbed] });
    } catch (error) {
      console.error('Error in worldclock command:', error);
      await interaction.editReply({ 
        content: `❌ Error: Invalid timezone "${region}". Use \`/worldclock list\` to see available timezones.`
      });
    }
  },
  
  // Handle autocomplete
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toUpperCase();
    
    // Get all available timezone keys
    const choices = Object.keys(commonTimezones).map(code => ({
      name: `${code} (${commonTimezones[code]})`,
      value: code
    }));
    
    // Filter based on input
    const filtered = choices.filter(choice => 
      choice.name.toUpperCase().includes(focusedValue)
    );
    
    // Respond with matching choices (max 25)
    await interaction.respond(
      filtered.slice(0, 25)
    );
  }
};
