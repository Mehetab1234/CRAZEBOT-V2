const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const embedManager = require('../../database/embedManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-delete')
    .setDescription('Delete an embed message sent by the bot')
    .addStringOption(option => 
      option.setName('message-id')
        .setDescription('The ID of the message containing the embed to delete')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel containing the message (defaults to current channel)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const messageId = interaction.options.getString('message-id');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    
    // Check if channel is valid
    if (!channel.isTextBased()) {
      return interaction.editReply({ 
        embeds: [error('Invalid Channel', 'The specified channel is not a text channel.')] 
      });
    }
    
    try {
      // Try to fetch the message from the channel
      const message = await channel.messages.fetch(messageId);
      
      // Check if the message has an embed
      if (!message.embeds || message.embeds.length === 0) {
        return interaction.editReply({ 
          embeds: [error('No Embed Found', 'The specified message does not contain an embed.')] 
        });
      }
      
      // Check if the message is from this bot
      if (message.author.id !== interaction.client.user.id) {
        return interaction.editReply({ 
          embeds: [error('Cannot Delete', 'I can only delete embeds that I have sent.')] 
        });
      }
      
      // Delete the message
      await message.delete();
      
      // Remove from stored embeds if it exists
      embedManager.deleteSentEmbed(messageId);
      
      return interaction.editReply({ 
        embeds: [success('Embed Deleted', 'The embed has been successfully deleted.')] 
      });
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Error', `Failed to delete message: ${err.message}`)] 
      });
    }
  },
  
  // Handle button interactions
  async handleButton(interaction, args) {
    // This is for button presses from embed management
    await interaction.deferReply({ ephemeral: true });
    
    const messageId = args[0];
    const channelId = args[1] || interaction.channel.id;
    
    try {
      // Get the channel
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.editReply({ 
          embeds: [error('Channel Not Found', 'The channel containing the message could not be found.')] 
        });
      }
      
      // Fetch and delete the message
      const message = await channel.messages.fetch(messageId);
      await message.delete();
      
      // Remove from stored embeds
      embedManager.deleteSentEmbed(messageId);
      
      return interaction.editReply({ 
        embeds: [success('Embed Deleted', 'The embed has been successfully deleted.')] 
      });
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Error', `Failed to delete message: ${err.message}`)] 
      });
    }
  }
};
