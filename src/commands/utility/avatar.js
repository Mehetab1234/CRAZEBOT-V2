const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display the avatar of a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user whose avatar to show (defaults to yourself)')
        .setRequired(false)),
    
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    // Get avatar URLs in different formats
    const avatarJpg = user.displayAvatarURL({ extension: 'jpg', size: 1024 });
    const avatarPng = user.displayAvatarURL({ extension: 'png', size: 1024 });
    const avatarWebp = user.displayAvatarURL({ extension: 'webp', size: 1024 });
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`${user.username}'s Avatar`)
      .setImage(avatarPng)
      .setDescription(`[JPG](${avatarJpg}) | [PNG](${avatarPng}) | [WebP](${avatarWebp})`)
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();
    
    // Send the embed
    await interaction.reply({ embeds: [embed] });
  }
};
