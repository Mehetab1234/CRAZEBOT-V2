const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Ship two users together and see their compatibility!')
    .addUserOption(option => 
      option.setName('user1')
        .setDescription('First user to ship')
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user2')
        .setDescription('Second user to ship')
        .setRequired(true)),
    
  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');
    
    // Generate ship name (combine parts of both usernames)
    const shipName = user1.username.slice(0, Math.ceil(user1.username.length / 2)) + 
                    user2.username.slice(Math.floor(user2.username.length / 2));
    
    // Calculate compatibility (generate consistent percentage based on the two user IDs)
    const combinedString = user1.id + user2.id;
    let compatibilityPercentage = 0;
    
    // Sum the char codes of the combined string and use it as a seed
    for (let i = 0; i < combinedString.length; i++) {
      compatibilityPercentage += combinedString.charCodeAt(i);
    }
    
    // Ensure the percentage is between 0-100
    compatibilityPercentage = compatibilityPercentage % 101;
    
    // Create compatibility messages based on percentage
    let compatibilityMessage;
    if (compatibilityPercentage < 10) {
      compatibilityMessage = "Yikes! There's almost nothing here...";
    } else if (compatibilityPercentage < 30) {
      compatibilityMessage = "Not great... maybe just stay friends?";
    } else if (compatibilityPercentage < 50) {
      compatibilityMessage = "There's potential, but it'll take work!";
    } else if (compatibilityPercentage < 70) {
      compatibilityMessage = "Pretty good match! You two should hang out more.";
    } else if (compatibilityPercentage < 90) {
      compatibilityMessage = "Great match! You two are meant for each other!";
    } else {
      compatibilityMessage = "Perfect match! When's the wedding?";
    }
    
    // Create progress bar for compatibility
    const progressBarLength = 20;
    const filledHearts = Math.round((compatibilityPercentage / 100) * progressBarLength);
    const emptyHearts = progressBarLength - filledHearts;
    const progressBar = '❤️'.repeat(filledHearts) + '🖤'.repeat(emptyHearts);
    
    // Determine color based on compatibility percentage
    let color;
    if (compatibilityPercentage < 30) {
      color = '#ED4245'; // Red
    } else if (compatibilityPercentage < 70) {
      color = '#FEE75C'; // Yellow
    } else {
      color = '#57F287'; // Green
    }
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💘 Shipping Calculator 💘')
      .setDescription(`Shipping **${user1.username}** with **${user2.username}**`)
      .addFields(
        { name: 'Ship Name', value: `**${shipName}**`, inline: false },
        { name: 'Compatibility', value: `${compatibilityPercentage}%`, inline: true },
        { name: 'Match Rating', value: progressBar, inline: false },
        { name: 'Verdict', value: compatibilityMessage, inline: false }
      )
      .setFooter({ text: 'Ship with another user to find your perfect match!' });
    
    await interaction.reply({ embeds: [embed] });
  }
};
