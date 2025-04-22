const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const config = require('../../config');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a user in the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Duration of the timeout (e.g. 1h, 1d, max 28d)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const targetUser = interaction.options.getUser('user');
    const durationString = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Convert duration string to milliseconds
    let duration;
    try {
      duration = ms(durationString);
      
      // Check for valid duration
      if (!duration) {
        return interaction.editReply({ 
          embeds: [error('Invalid Duration', 'Please provide a valid duration (e.g. 10s, 1m, 1h, 1d).')] 
        });
      }
      
      // Discord has a max timeout of 28 days
      const maxTimeout = ms('28d');
      if (duration > maxTimeout) {
        duration = maxTimeout;
      }
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Invalid Duration', 'Please provide a valid duration (e.g. 10s, 1m, 1h, 1d).')] 
      });
    }
    
    // Check if the user exists in the guild
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      return interaction.editReply({ 
        embeds: [error('Error', 'User not found in this server.')] 
      });
    }
    
    // Check if the bot has permission to timeout members
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ 
        embeds: [error('Missing Permissions', 'I don\'t have permission to timeout members.')] 
      });
    }
    
    // Check if the target can be timed out (higher roles cannot be timed out)
    if (!targetMember.moderatable) {
      return interaction.editReply({ 
        embeds: [error('Cannot Timeout', 'I cannot timeout this user. They may have a higher role than me.')] 
      });
    }
    
    // Check if the user is trying to time out themselves
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ 
        embeds: [error('Cannot Timeout', 'You cannot timeout yourself.')] 
      });
    }
    
    // Check if the user is trying to time out the bot
    if (targetUser.id === interaction.client.user.id) {
      return interaction.editReply({ 
        embeds: [error('Cannot Timeout', 'I cannot timeout myself.')] 
      });
    }
    
    try {
      // Calculate when the timeout will end
      const timeoutEnds = new Date(Date.now() + duration);
      const formattedDuration = formatTime(duration);
      
      // Try to send a DM to the user being timed out
      try {
        await targetUser.send({
          embeds: [
            {
              title: `You have been timed out in ${interaction.guild.name}`,
              description: `**Reason:** ${reason}\n**Duration:** ${formattedDuration}\n**Expires:** <t:${Math.floor(timeoutEnds.getTime() / 1000)}:R>`,
              color: parseInt(config.colors.warning.replace('#', ''), 16),
              timestamp: new Date().toISOString()
            }
          ]
        });
      } catch (dmError) {
        // Couldn't send DM, continue with timeout
        console.log(`Could not send DM to ${targetUser.tag}: ${dmError.message}`);
      }
      
      // Apply the timeout
      await targetMember.timeout(duration, `${reason} - Timed out by ${interaction.user.tag}`);
      
      // Respond to the interaction
      await interaction.editReply({ 
        embeds: [
          success(
            'User Timed Out', 
            `Successfully timed out ${targetUser.tag} for ${formattedDuration}.`,
            { 
              fields: [
                { name: 'Reason', value: reason },
                { name: 'Expires', value: `<t:${Math.floor(timeoutEnds.getTime() / 1000)}:R>` }
              ] 
            }
          )
        ]
      });
      
      // Log the timeout to a log channel if one exists
      const logChannel = interaction.guild.channels.cache.find(
        channel => channel.name === 'mod-logs' || channel.name === 'logs'
      );
      
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [
            {
              title: 'User Timed Out',
              description: `**${targetUser.tag}** (${targetUser.id}) was timed out by ${interaction.user.tag}`,
              fields: [
                { name: 'Reason', value: reason },
                { name: 'Duration', value: formattedDuration },
                { name: 'Expires', value: `<t:${Math.floor(timeoutEnds.getTime() / 1000)}:R>` }
              ],
              color: parseInt(config.colors.warning.replace('#', ''), 16),
              timestamp: new Date().toISOString(),
              footer: { text: `Timed out by ${interaction.user.tag}` }
            }
          ]
        });
      }
    } catch (err) {
      console.error(`Error during timeout:`, err);
      return interaction.editReply({ 
        embeds: [error('Timeout Failed', `Failed to timeout the user: ${err.message}`)] 
      });
    }
  }
};

// Helper function to format time
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'}`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  } else {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
}
