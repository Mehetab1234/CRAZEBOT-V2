const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout (unmute) from a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to remove timeout from')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for removing the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    // Check if the user exists in the guild
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      return interaction.editReply({ 
        embeds: [error('Error', 'User not found in this server.')] 
      });
    }
    
    // Check if the bot has permission to modify timeouts
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ 
        embeds: [error('Missing Permissions', 'I don\'t have permission to manage timeouts.')] 
      });
    }
    
    // Check if the target can be modified (higher roles cannot be modified)
    if (!targetMember.moderatable) {
      return interaction.editReply({ 
        embeds: [error('Cannot Modify', 'I cannot modify this user\'s timeout. They may have a higher role than me.')] 
      });
    }
    
    // Check if the user is actually timed out
    if (!targetMember.communicationDisabledUntil) {
      return interaction.editReply({ 
        embeds: [error('Not Timed Out', 'This user is not currently timed out.')] 
      });
    }
    
    try {
      // Remove the timeout
      await targetMember.timeout(null, `${reason} - Timeout removed by ${interaction.user.tag}`);
      
      // Try to send a DM to the user being untimed out
      try {
        await targetUser.send({
          embeds: [
            {
              title: `Your timeout has been removed in ${interaction.guild.name}`,
              description: `**Reason:** ${reason}`,
              color: parseInt(config.colors.success.replace('#', ''), 16),
              timestamp: new Date().toISOString()
            }
          ]
        });
      } catch (dmError) {
        // Couldn't send DM, continue with removal
        console.log(`Could not send DM to ${targetUser.tag}: ${dmError.message}`);
      }
      
      // Respond to the interaction
      await interaction.editReply({ 
        embeds: [
          success(
            'Timeout Removed', 
            `Successfully removed timeout from ${targetUser.tag}.`,
            { fields: [{ name: 'Reason', value: reason }] }
          )
        ]
      });
      
      // Log the unmute to a log channel if one exists
      const logChannel = interaction.guild.channels.cache.find(
        channel => channel.name === 'mod-logs' || channel.name === 'logs'
      );
      
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [
            {
              title: 'User Timeout Removed',
              description: `**${targetUser.tag}** (${targetUser.id}) had their timeout removed by ${interaction.user.tag}`,
              fields: [{ name: 'Reason', value: reason }],
              color: parseInt(config.colors.success.replace('#', ''), 16),
              timestamp: new Date().toISOString(),
              footer: { text: `Timeout removed by ${interaction.user.tag}` }
            }
          ]
        });
      }
    } catch (err) {
      console.error(`Error during unmute:`, err);
      return interaction.editReply({ 
        embeds: [error('Unmute Failed', `Failed to remove timeout from the user: ${err.message}`)] 
      });
    }
  }
};
