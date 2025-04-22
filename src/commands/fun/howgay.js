const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('howgay')
    .setDescription('Find out how gay someone is (for fun only!)')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to check (defaults to you)')
        .setRequired(false)),
    
  async execute(interaction) {
    // Get the target user or default to the command user
    const target = interaction.options.getUser('user') || interaction.user;
    
    // Seed the random number using the user's ID to make it consistent for the same user
    const userIdSeed = parseInt(target.id.slice(-8), 10);
    const percentage = (userIdSeed % 101); // 0-100 range
    
    // Create a progress bar
    const barLength = 20;
    const filledBars = Math.round((percentage / 100) * barLength);
    const emptyBars = barLength - filledBars;
    const progressBar = '🏳️‍🌈'.repeat(filledBars) + '⬛'.repeat(emptyBars);
    
    // Determine color based on percentage
    let color;
    if (percentage < 30) {
      color = '#57F287'; // Green
    } else if (percentage < 70) {
      color = '#FEE75C'; // Yellow
    } else {
      color = '#ED4245'; // Red
    }
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💖 Gay Rate Machine 🌈')
      .setDescription(`${target.username} is ${percentage}% gay!`)
      .addFields({ name: 'Gay Meter', value: progressBar })
      .setFooter({ text: 'This is just for fun and not meant to offend anyone!' });
    
    if (target.displayAvatarURL()) {
      embed.setThumbnail(target.displayAvatarURL());
    }
    
    await interaction.reply({ embeds: [embed] });
  }
};
