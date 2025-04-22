const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play rock-paper-scissors with the bot'),
    
  async execute(interaction) {
    // Create buttons for rock, paper, scissors
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('rps_rock')
          .setLabel('Rock')
          .setEmoji('🪨')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rps_paper')
          .setLabel('Paper')
          .setEmoji('📄')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rps_scissors')
          .setLabel('Scissors')
          .setEmoji('✂️')
          .setStyle(ButtonStyle.Primary)
      );
    
    // Create prompt embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Rock Paper Scissors')
      .setDescription('Choose your move!')
      .setFooter({ text: 'Game will expire in 30 seconds' });
    
    // Send the message with buttons
    const reply = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });
    
    // Create collector for button interactions
    const filter = i => i.user.id === interaction.user.id && i.customId.startsWith('rps_');
    const collector = reply.createMessageComponentCollector({ filter, time: 30000 });
    
    collector.on('collect', async i => {
      // Get user's choice
      const userChoice = i.customId.replace('rps_', '');
      
      // Get bot's choice
      const choices = ['rock', 'paper', 'scissors'];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      
      // Determine winner
      let result;
      if (userChoice === botChoice) {
        result = 'It\'s a tie!';
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = 'You win!';
      } else {
        result = 'I win!';
      }
      
      // Create result embed
      const resultEmbed = new EmbedBuilder()
        .setTitle('Rock Paper Scissors Result')
        .setDescription(`${result}`)
        .addFields(
          { name: 'Your Choice', value: `${getEmoji(userChoice)} ${capitalize(userChoice)}`, inline: true },
          { name: 'My Choice', value: `${getEmoji(botChoice)} ${capitalize(botChoice)}`, inline: true }
        )
        .setColor(
          result === 'You win!' ? config.colors.success :
          result === 'I win!' ? config.colors.error :
          config.colors.warning
        )
        .setFooter({ text: 'Thanks for playing!' });
      
      // Update message with result
      await i.update({ embeds: [resultEmbed], components: [] });
      
      // End collector
      collector.stop();
    });
    
    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        // If time ran out and no buttons were clicked
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('Game Expired')
          .setDescription('You took too long to make a choice.')
          .setColor(config.colors.error);
        
        interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
      }
    });
  }
};

// Helper functions
function getEmoji(choice) {
  switch (choice) {
    case 'rock': return '🪨';
    case 'paper': return '📄';
    case 'scissors': return '✂️';
    default: return '';
  }
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
