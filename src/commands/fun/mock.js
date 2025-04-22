const { SlashCommandBuilder } = require('discord.js');
const { error } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mock')
    .setDescription('Mock a text with alternating cases')
    .addStringOption(option => 
      option.setName('text')
        .setDescription('The text to mock')
        .setRequired(true)),
    
  async execute(interaction) {
    const text = interaction.options.getString('text');
    
    // Check if text is empty
    if (!text.trim()) {
      return interaction.reply({ 
        embeds: [error('Empty Text', 'Please provide some text to mock.')],
        ephemeral: true
      });
    }
    
    // Create mocked text with alternating case
    let mockedText = '';
    for (let i = 0; i < text.length; i++) {
      // Randomly decide whether to make the character uppercase or lowercase
      // with a slight bias towards lowercase for more authentic mocking appearance
      if (Math.random() > 0.4) {
        mockedText += text[i].toLowerCase();
      } else {
        mockedText += text[i].toUpperCase();
      }
    }
    
    // Send the mocked text
    await interaction.reply({
      content: mockedText,
      allowedMentions: { parse: [] } // Prevent any mentions from working
    });
  }
};
