const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
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
    
    // Check if the bot has permission to kick
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.editReply({ 
        embeds: [error('Missing Permissions', 'I don\'t have permission to kick members.')] 
      });
    }
    
    // Check if the target is kickable (higher roles cannot be kicked)
    if (!targetMember.kickable) {
      return interaction.editReply({ 
        embeds: [error('Cannot Kick', 'I cannot kick this user. They may have a higher role than me.')] 
      });
    }
    
    // Check if the user is trying to kick themselves
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ 
        embeds: [error('Cannot Kick', 'You cannot kick yourself.')] 
      });
    }
    
    // Check if the user is trying to kick the bot
    if (targetUser.id === interaction.client.user.id) {
      return interaction.editReply({ 
        embeds: [error('Cannot Kick', 'I cannot kick myself.')] 
      });
    }
    
    try {
      // Try to send a DM to the user being kicked
      try {
        await targetUser.send({
          embeds: [
            {
              title: `You have been kicked from ${interaction.guild.name}`,
              description: `**Reason:** ${reason}`,
              color: parseInt(config.colors.warning.replace('#', ''), 16),
              timestamp: new Date().toISOString()
            }
          ]
        });
      } catch (dmError) {
        // Couldn't send DM, continue with kick
        console.log(`Could not send DM to ${targetUser.tag}: ${dmError.message}`);
      }
      
      // Kick the user
      await targetMember.kick(`${reason} - Kicked by ${interaction.user.tag}`);
      
      // Respond to the interaction
      await interaction.editReply({ 
        embeds: [
          success(
            'User Kicked', 
            `Successfully kicked ${targetUser.tag}.`,
            { fields: [{ name: 'Reason', value: reason }] }
          )
        ]
      });
      
      // Log the kick to a log channel if one exists
      const logChannel = interaction.guild.channels.cache.find(
        channel => channel.name === 'mod-logs' || channel.name === 'logs'
      );
      
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [
            {
              title: 'User Kicked',
              description: `**${targetUser.tag}** (${targetUser.id}) was kicked by ${interaction.user.tag}`,
              fields: [{ name: 'Reason', value: reason }],
              color: parseInt(config.colors.warning.replace('#', ''), 16),
              timestamp: new Date().toISOString(),
              footer: { text: `Kicked by ${interaction.user.tag}` }
            }
          ]
        });
      }
    } catch (err) {
      console.error(`Error during kick:`, err);
      return interaction.editReply({ 
        embeds: [error('Kick Failed', `Failed to kick the user: ${err.message}`)] 
      });
    }
  }
};
