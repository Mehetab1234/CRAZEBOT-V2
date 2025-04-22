const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleError, createErrorResponse } = require('../../utils/errorHandler');
const { success, error, info } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages from a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('contains')
        .setDescription('Only delete messages containing this text')
        .setRequired(false)),
        
  async execute(interaction) {
    try {
      // Defer reply to allow for longer processing time
      await interaction.deferReply({ ephemeral: true });
      
      // Get options
      const amount = interaction.options.getInteger('amount');
      const user = interaction.options.getUser('user');
      const containsText = interaction.options.getString('contains');
      
      // Get messages from the channel
      const messages = await interaction.channel.messages.fetch({ limit: Math.min(amount + 10, 100) });
      
      // Filter messages if needed
      let messagesToDelete = messages;
      
      if (user || containsText) {
        messagesToDelete = messages.filter(msg => {
          let shouldDelete = true;
          
          // Filter by user
          if (user && msg.author.id !== user.id) {
            shouldDelete = false;
          }
          
          // Filter by content
          if (containsText && !msg.content.includes(containsText)) {
            shouldDelete = false;
          }
          
          return shouldDelete;
        });
      }
      
      // Limit to the requested amount
      messagesToDelete = Array.from(messagesToDelete.values()).slice(0, amount);
      
      // Only bulk delete messages that are less than 14 days old
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      // Separate recent and old messages
      const recentMessages = messagesToDelete.filter(msg => msg.createdAt > twoWeeksAgo);
      const oldMessages = messagesToDelete.filter(msg => msg.createdAt <= twoWeeksAgo);
      
      // Bulk delete recent messages
      let deletedCount = 0;
      
      if (recentMessages.length > 0) {
        try {
          const bulkDeleteResult = await interaction.channel.bulkDelete(recentMessages);
          deletedCount += bulkDeleteResult.size;
        } catch (bulkError) {
          console.error('Error bulk deleting messages:', bulkError);
          
          // If bulk delete fails, try deleting individually
          for (const msg of recentMessages) {
            try {
              await msg.delete();
              deletedCount++;
            } catch (err) {
              console.error(`Failed to delete message ${msg.id}:`, err);
            }
          }
        }
      }
      
      // Delete old messages individually
      for (const msg of oldMessages) {
        try {
          await msg.delete();
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete message ${msg.id}:`, err);
        }
      }
      
      // Respond with results
      if (deletedCount > 0) {
        const filterInfo = [];
        if (user) filterInfo.push(`from user @${user.tag}`);
        if (containsText) filterInfo.push(`containing "${containsText}"`);
        
        const filterText = filterInfo.length > 0 
          ? ` (${filterInfo.join(' and ')})` 
          : '';
          
        await interaction.editReply({
          embeds: [success(
            'Messages Purged', 
            `Successfully deleted ${deletedCount} message${deletedCount !== 1 ? 's' : ''}${filterText}.`
          )]
        });
      } else {
        await interaction.editReply({
          embeds: [info(
            'No Messages Deleted', 
            'No messages were found matching your criteria.'
          )]
        });
      }
    } catch (error) {
      handleError('Purge command', error);
      await interaction.editReply(createErrorResponse(`Failed to purge messages: ${error.message}`));
    }
  }
};