const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { error } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to say')
        .setRequired(true))
    .addBooleanOption(option => 
      option.setName('ephemeral')
        .setDescription('Whether to show the command use only to you (default: true)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
  async execute(interaction) {
    const message = interaction.options.getString('message');
    const isEphemeral = interaction.options.getBoolean('ephemeral') ?? true;
    
    // Check for mentions and other potential abuse
    if (message.includes('@everyone') || message.includes('@here')) {
      return interaction.reply({ 
        embeds: [error('Forbidden Mention', 'You cannot use everyone/here mentions in say command.')],
        ephemeral: true
      });
    }
    
    // Check for Discord invite links unless user has admin perms
    const hasAdminPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!hasAdminPermission && /(discord\.(gg|io|me|li)|discordapp\.com\/invite)/.test(message)) {
      return interaction.reply({ 
        embeds: [error('Forbidden Content', 'You cannot include Discord invite links in say command.')],
        ephemeral: true
      });
    }
    
    // Check message length
    if (message.length > 2000) {
      return interaction.reply({ 
        embeds: [error('Message Too Long', 'The message cannot exceed 2000 characters.')],
        ephemeral: true
      });
    }
    
    // Reply with an ephemeral message first if requested
    if (isEphemeral) {
      await interaction.reply({ 
        content: 'Your message has been sent!',
        ephemeral: true
      });
    }
    
    // Send the message
    try {
      await interaction.channel.send({
        content: message,
        allowedMentions: { 
          parse: ['users', 'roles'] // Allow user and role mentions, but not everyone/here
        }
      });
      
      // If not already replied with ephemeral
      if (!isEphemeral) {
        await interaction.reply({ 
          content: 'Message sent!',
          ephemeral: true
        });
      }
    } catch (err) {
      if (!interaction.replied) {
        await interaction.reply({ 
          embeds: [error('Error', `Failed to send message: ${err.message}`)],
          ephemeral: true
        });
      } else {
        await interaction.followUp({ 
          embeds: [error('Error', `Failed to send message: ${err.message}`)],
          ephemeral: true
        });
      }
    }
  }
};
