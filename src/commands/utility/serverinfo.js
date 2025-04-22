const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display information about the current server'),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const { guild } = interaction;
    
    try {
      // Fetch guild if needed to ensure latest data
      await guild.fetch();
      
      // Calculate guild statistics
      const totalMembers = guild.memberCount;
      const totalChannels = guild.channels.cache.size;
      const totalRoles = guild.roles.cache.size;
      const totalEmojis = guild.emojis.cache.size;
      
      // Get channel statistics
      const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
      const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`Server Information: ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: 'Server ID', value: guild.id, inline: true },
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
          {
            name: 'Members',
            value: `Total: ${totalMembers}`,
            inline: true
          },
          {
            name: 'Channels',
            value: `Total: ${totalChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}`,
            inline: true
          },
          {
            name: 'Other',
            value: `Roles: ${totalRoles}\nEmojis: ${totalEmojis}`,
            inline: true
          }
        );
      
      // Add server features if available
      if (guild.features.length > 0) {
        const featureList = guild.features.map(feature => 
          feature.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
        ).join(', ');
        
        embed.addFields({ name: 'Server Features', value: featureList });
      }
      
      // Add server banner if available
      if (guild.banner) {
        embed.setImage(guild.bannerURL({ size: 1024 }));
      }
      
      // Add server description if available
      if (guild.description) {
        embed.setDescription(guild.description);
      }
      
      // Add boost status
      embed.addFields({
        name: 'Boost Status',
        value: `Level ${guild.premiumTier}\nBoosts: ${guild.premiumSubscriptionCount || 0}`,
        inline: true
      });
      
      // Add verification level
      const verificationLevels = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High'
      };
      
      embed.addFields({
        name: 'Verification Level',
        value: verificationLevels[guild.verificationLevel] || 'Unknown',
        inline: true
      });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in serverinfo command:', error);
      await interaction.editReply({
        content: 'An error occurred while fetching server information.'
      });
    }
  }
};
