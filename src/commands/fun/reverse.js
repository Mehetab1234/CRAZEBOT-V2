const { SlashCommandBuilder } = require('discord.js');
const { error } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reverse')
    .setDescription('Reverse a text')
    .addStringOption(option => 
      option.setName('text')
        .setDescription('The text to reverse')
        .setRequired(true)),
    
  async execute(interaction) {
    const text = interaction.options.getString('text');
    
    // Check if text is empty
    if (!text.trim()) {
      return interaction.reply({ 
        embeds: [error('Empty Text', 'Please provide some text to reverse.')],
        ephemeral: true
      });
    }
    
    // Reverse the text
    const reversedText = text.split('').reverse().join('');
    
    // Send the reversed text
    await interaction.reply({
      content: reversedText,
      allowedMentions: { parse: [] } // Prevent any mentions from working
    });
  }
};
