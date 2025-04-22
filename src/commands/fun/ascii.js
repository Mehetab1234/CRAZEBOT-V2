const { SlashCommandBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const figlet = require('figlet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ascii')
    .setDescription('Convert text to ASCII art')
    .addStringOption(option => 
      option.setName('text')
        .setDescription('The text to convert to ASCII art')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('font')
        .setDescription('The font to use (default: Standard)')
        .setRequired(false)
        .addChoices(
          { name: 'Standard', value: 'Standard' },
          { name: 'ANSI Shadow', value: 'ANSI Shadow' },
          { name: 'Small', value: 'Small' },
          { name: 'Big', value: 'Big' },
          { name: '3D', value: '3-D' },
          { name: 'Doom', value: 'Doom' },
          { name: 'Graffiti', value: 'Graffiti' },
          { name: 'Star Wars', value: 'Star Wars' }
        )),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const text = interaction.options.getString('text');
    const font = interaction.options.getString('font') || 'Standard';
    
    // Check if text is too long
    if (text.length > 20) {
      return interaction.editReply({ 
        embeds: [error('Text Too Long', 'Please provide a shorter text (maximum 20 characters).')] 
      });
    }
    
    try {
      // Convert text to ASCII art
      figlet.text(text, { font }, function(err, data) {
        if (err) {
          console.error('Error in ASCII generation:', err);
          return interaction.editReply({ 
            embeds: [error('Error', 'Failed to generate ASCII art.')] 
          });
        }
        
        if (data.length > 1994) {
          return interaction.editReply({ 
            embeds: [error('Result Too Large', 'The generated ASCII art is too large to display.')] 
          });
        }
        
        // Send the ASCII art in a code block
        interaction.editReply({
          content: `\`\`\`\n${data}\n\`\`\``
        });
      });
    } catch (err) {
      console.error('Error in ASCII command:', err);
      return interaction.editReply({ 
        embeds: [error('Error', 'Failed to generate ASCII art.')] 
      });
    }
  }
};
