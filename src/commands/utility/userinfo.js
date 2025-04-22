const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to display info about (defaults to yourself)')
        .setRequired(false)),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const user = interaction.options.getUser('user') || interaction.user;
    
    try {
      // Try to fetch the member from the guild
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setColor(member ? member.displayHexColor : config.colors.primary)
        .setTitle(`User Information: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User ID', value: user.id, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
        );
      
      // Add member-specific info if available
      if (member) {
        // Format roles (excluding @everyone)
        const roles = member.roles.cache
          .filter(role => role.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position);
        
        const roleList = roles.size
          ? roles.map(role => `<@&${role.id}>`).join(', ')
          : 'No roles';
        
        const joinedAt = member.joinedTimestamp
          ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
          : 'Unknown';
        
        embed.addFields(
          { name: 'Nickname', value: member.nickname || 'None', inline: true },
          { name: 'Joined Server', value: joinedAt, inline: true },
          { name: `Roles [${roles.size}]`, value: roleList, inline: false }
        );
        
        // Add member presence if available
        if (member.presence) {
          const status = {
            online: '🟢 Online',
            idle: '🟡 Idle',
            dnd: '🔴 Do Not Disturb',
            offline: '⚫ Offline'
          };
          
          embed.addFields({
            name: 'Status',
            value: status[member.presence.status] || '⚫ Offline',
            inline: true
          });
          
          // Add activity if available
          if (member.presence.activities && member.presence.activities.length > 0) {
            const activity = member.presence.activities[0];
            let activityText = '';
            
            switch (activity.type) {
              case 0: activityText = `Playing ${activity.name}`; break;
              case 1: activityText = `Streaming ${activity.name}`; break;
              case 2: activityText = `Listening to ${activity.name}`; break;
              case 3: activityText = `Watching ${activity.name}`; break;
              case 4: activityText = `${activity.name}`; break;
              case 5: activityText = `Competing in ${activity.name}`; break;
              default: activityText = `${activity.name}`; break;
            }
            
            embed.addFields({
              name: 'Activity',
              value: activityText,
              inline: true
            });
          }
        }
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in userinfo command:', error);
      await interaction.editReply({
        content: 'An error occurred while fetching user information.'
      });
    }
  }
};
