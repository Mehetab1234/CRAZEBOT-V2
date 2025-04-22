const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('days') || 0;
    
    // Check if the user exists in the guild
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      return interaction.editReply({ 
        embeds: [error('Error', 'User not found in this server.')] 
      });
    }
    
    // Check if the bot has permission to ban
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.editReply({ 
        embeds: [error('Missing Permissions', 'I don\'t have permission to ban members.')] 
      });
    }
    
    // Check if the target is bannable (higher roles cannot be banned)
    if (!targetMember.bannable) {
      return interaction.editReply({ 
        embeds: [error('Cannot Ban', 'I cannot ban this user. They may have a higher role than me.')] 
      });
    }
    
    // Check if the user is trying to ban themselves
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ 
        embeds: [error('Cannot Ban', 'You cannot ban yourself.')] 
      });
    }
    
    // Check if the user is trying to ban the bot
    if (targetUser.id === interaction.client.user.id) {
      return interaction.editReply({ 
        embeds: [error('Cannot Ban', 'I cannot ban myself.')] 
      });
    }
    
    try {
      // Try to send a DM to the user being banned
      try {
        await targetUser.send({
          embeds: [
            {
              title: `You have been banned from ${interaction.guild.name}`,
              description: `**Reason:** ${reason}`,
              color: parseInt(config.colors.error.replace('#', ''), 16),
              timestamp: new Date().toISOString()
            }
          ]
        });
      } catch (dmError) {
        // Couldn't send DM, continue with ban
        console.log(`Could not send DM to ${targetUser.tag}: ${dmError.message}`);
      }
      
      // Ban the user
      await interaction.guild.members.ban(targetUser, { 
        reason: `${reason} - Banned by ${interaction.user.tag}`,
        deleteMessageDays: days
      });
      
      // Respond to the interaction
      await interaction.editReply({ 
        embeds: [
          success(
            'User Banned', 
            `Successfully banned ${targetUser.tag}${days > 0 ? ` and deleted their messages from the last ${days} day(s)` : ''}.`,
            { fields: [{ name: 'Reason', value: reason }] }
          )
        ]
      });
      
      // Log the ban to a log channel if one exists
      const logChannel = interaction.guild.channels.cache.find(
        channel => channel.name === 'mod-logs' || channel.name === 'logs'
      );
      
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [
            {
              title: 'User Banned',
              description: `**${targetUser.tag}** (${targetUser.id}) was banned by ${interaction.user.tag}`,
              fields: [
                { name: 'Reason', value: reason },
                { name: 'Message Deletion', value: `${days} day(s)` }
              ],
              color: parseInt(config.colors.error.replace('#', ''), 16),
              timestamp: new Date().toISOString(),
              footer: { text: `Banned by ${interaction.user.tag}` }
            }
          ]
        });
      }
    } catch (err) {
      console.error(`Error during ban:`, err);
      return interaction.editReply({ 
        embeds: [error('Ban Failed', `Failed to ban the user: ${err.message}`)] 
      });
    }
  }
};

// Import config
const config = require('../../config');
