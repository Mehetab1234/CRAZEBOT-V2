const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete a specified number of messages from a channel')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Number of messages to delete (1-99)')
        .setMinValue(1)
        .setMaxValue(99)
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');
    
    // Check if the bot has permission to delete messages
    if (!interaction.channel.permissionsFor(interaction.client.user).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.editReply({ 
        embeds: [error('Missing Permissions', 'I don\'t have permission to delete messages in this channel.')] 
      });
    }
    
    try {
      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      
      // Filter messages based on criteria
      let filteredMessages = messages;
      
      // Filter by age (Discord API doesn't allow bulk deletion of messages older than 14 days)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      filteredMessages = filteredMessages.filter(message => message.createdTimestamp > twoWeeksAgo);
      
      // Filter by user if specified
      if (user) {
        filteredMessages = filteredMessages.filter(message => message.author.id === user.id);
      }
      
      // Limit to the requested amount
      filteredMessages = Array.from(filteredMessages.values()).slice(0, amount);
      
      // Check if there are any messages to delete
      if (filteredMessages.length === 0) {
        return interaction.editReply({ 
          embeds: [error('No Messages', 'There are no recent messages to delete. Messages older than 14 days cannot be bulk deleted.')] 
        });
      }
      
      // Delete messages
      await interaction.channel.bulkDelete(filteredMessages);
      
      // Respond to the interaction
      await interaction.editReply({ 
        embeds: [
          success(
            'Messages Deleted', 
            `Successfully deleted ${filteredMessages.length} message${filteredMessages.length === 1 ? '' : 's'}${user ? ` from ${user.tag}` : ''}.`
          )
        ]
      });
      
      // Log the action to a log channel if one exists
      const logChannel = interaction.guild.channels.cache.find(
        channel => channel.name === 'mod-logs' || channel.name === 'logs'
      );
      
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send({
          embeds: [
            {
              title: 'Messages Purged',
              description: `${interaction.user.tag} purged ${filteredMessages.length} message${filteredMessages.length === 1 ? '' : 's'} in <#${interaction.channel.id}>`,
              fields: [
                { name: 'Channel', value: `<#${interaction.channel.id}>` },
                { name: 'Amount', value: `${filteredMessages.length}` },
                { name: 'Target User', value: user ? `${user.tag} (${user.id})` : 'All users' }
              ],
              color: parseInt(config.colors.warning.replace('#', ''), 16),
              timestamp: new Date().toISOString(),
              footer: { text: `Action by ${interaction.user.tag}` }
            }
          ]
        });
      }
    } catch (err) {
      console.error(`Error during message clear:`, err);
      
      if (err.code === 10008) {
        return interaction.editReply({ 
          embeds: [error('Error', 'Some messages could not be deleted. They may be too old (>14 days).')] 
        });
      }
      
      return interaction.editReply({ 
        embeds: [error('Clear Failed', `Failed to delete messages: ${err.message}`)] 
      });
    }
  }
};
