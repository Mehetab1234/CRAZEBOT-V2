const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
    
  async execute(interaction) {
    // Flip the coin (50/50 chance)
    const isHeads = Math.random() >= 0.5;
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('💰 Coin Flip')
      .setDescription(`You flipped a coin and got: **${isHeads ? 'Heads' : 'Tails'}**!`)
      .setThumbnail(isHeads ? 
        'https://cdn.discordapp.com/attachments/1234567890/heads.png' : 
        'https://cdn.discordapp.com/attachments/1234567890/tails.png')
      .setFooter({ text: 'Better luck next time!' });
    
    await interaction.reply({ embeds: [embed] });
  }
};
