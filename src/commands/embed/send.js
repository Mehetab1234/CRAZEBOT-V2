const { SlashCommandBuilder, PermissionFlagsBits, ChannelSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const embedManager = require('../../database/embedManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-send')
    .setDescription('Send a saved embed or previously created embed')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Channel to send the embed to')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('template')
        .setDescription('Use a saved template')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const channel = interaction.options.getChannel('channel');
    const templateName = interaction.options.getString('template');
    
    // Check if channel is valid for sending messages
    if (!channel.isTextBased()) {
      return interaction.editReply({ 
        embeds: [error('Invalid Channel', 'You can only send embeds to text channels.')] 
      });
    }
    
    // Check if bot has permission to send messages in the channel
    const botMember = await interaction.guild.members.fetchMe();
    if (!channel.permissionsFor(botMember).has(PermissionFlagsBits.SendMessages)) {
      return interaction.editReply({ 
        embeds: [error('Missing Permissions', 'I don\'t have permission to send messages in that channel.')] 
      });
    }
    
    // If a template name is provided, use it
    if (templateName) {
      const template = embedManager.getTemplate(guildId, templateName);
      
      if (!template) {
        return interaction.editReply({ 
          embeds: [error('Template Not Found', `Could not find a template named "${templateName}".`)] 
        });
      }
      
      await this.sendEmbed(interaction, channel, template.embedData);
      return;
    }
    
    // Check if user has a temporary embed in session
    if (!interaction.client.embedSession || !interaction.client.embedSession.has(interaction.user.id)) {
      // List available templates
      const templates = embedManager.getAllTemplates(guildId);
      
      if (templates.length === 0) {
        return interaction.editReply({ 
          embeds: [error('No Embed Available', 'You don\'t have any embed to send. Create one first with `/embed-create` or create a template.')] 
        });
      }
      
      // Show template list
      const templateList = templates.map((t, i) => `${i+1}. **${t.name}**`).join('\n');
      
      return interaction.editReply({ 
        embeds: [
          {
            title: 'Available Templates',
            description: `Use \`/embed-send channel:#channel template:name\` to send a template.\n\n${templateList}`,
            color: parseInt(config.colors.info.replace('#', ''), 16)
          }
        ]
      });
    }
    
    // Get the embed from session
    const embedData = interaction.client.embedSession.get(interaction.user.id);
    
    // Send the embed
    await this.sendEmbed(interaction, channel, embedData);
  },
  
  // Handle button interactions
  async handleButton(interaction) {
    // This is called when the Send Embed button is clicked after preview
    
    // Check if embed exists in session
    if (!interaction.client.embedSession || !interaction.client.embedSession.has(interaction.user.id)) {
      return interaction.reply({ 
        content: 'No embed found. Please create one with `/embed-create` first.',
        ephemeral: true 
      });
    }
    
    // Show channel selection for where to send
    const channelSelectRow = new ActionRowBuilder()
      .addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('embed_send_channel')
          .setPlaceholder('Select a channel to send the embed to')
      );
    
    await interaction.reply({
      content: 'Choose a channel to send your embed to:',
      components: [channelSelectRow],
      ephemeral: true
    });
  },
  
  // Handle select menu interactions
  async handleSelectMenu(interaction) {
    if (interaction.customId === 'embed_send_channel') {
      await interaction.deferUpdate();
      
      const selectedChannelId = interaction.values[0];
      const channel = interaction.guild.channels.cache.get(selectedChannelId);
      
      if (!channel) {
        return interaction.editReply({ 
          content: 'Invalid channel selected.',
          components: [] 
        });
      }
      
      // Get the embed from session
      const embedData = interaction.client.embedSession.get(interaction.user.id);
      
      // Send the embed
      await this.sendEmbed(interaction, channel, embedData);
    }
  },
  
  // Common function to send embed
  async sendEmbed(interaction, channel, embedData) {
    try {
      const { EmbedBuilder } = require('discord.js');
      const embed = new EmbedBuilder();
      
      if (embedData.title) embed.setTitle(embedData.title);
      if (embedData.description) embed.setDescription(embedData.description);
      if (embedData.color) embed.setColor(embedData.color);
      if (embedData.footer) embed.setFooter(embedData.footer);
      if (embedData.image) embed.setImage(embedData.image.url);
      if (embedData.timestamp) embed.setTimestamp(new Date(embedData.timestamp));
      
      // Send the embed to the channel
      const sentMessage = await channel.send({ embeds: [embed] });
      
      // Store the sent embed for future editing
      embedManager.storeSentEmbed(
        sentMessage.id,
        channel.id,
        interaction.guild.id,
        embedData,
        interaction.user.id
      );
      
      // Create success message
      let replyContent;
      if (interaction.replied || interaction.deferred) {
        replyContent = {
          embeds: [success('Embed Sent', `Embed has been sent to ${channel}.`)],
          components: []
        };
        await interaction.editReply(replyContent);
      } else {
        replyContent = {
          content: `Embed has been sent to ${channel}.`,
          ephemeral: true,
          components: []
        };
        await interaction.reply(replyContent);
      }
    } catch (err) {
      const errorContent = { 
        embeds: [error('Failed to Send Embed', `Error: ${err.message}`)],
        components: [],
        ephemeral: true
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(errorContent);
      } else {
        await interaction.reply(errorContent);
      }
    }
  }
};

// Import for config
const config = require('../../config');
