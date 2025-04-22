const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const embedManager = require('../../database/embedManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-edit')
    .setDescription('Edit an existing embed message')
    .addStringOption(option => 
      option.setName('message-id')
        .setDescription('The ID of the message containing the embed to edit')
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
          embeds: [error('Cannot Edit', 'I can only edit embeds that I have sent.')] 
        });
      }
      
      // Get the stored embed data if available
      const storedEmbed = embedManager.getSentEmbed(messageId);
      
      // If not stored, create from the existing embed
      let embedData;
      if (!storedEmbed) {
        const existingEmbed = message.embeds[0];
        
        embedData = {
          title: existingEmbed.title || '',
          description: existingEmbed.description || '',
          color: existingEmbed.color ? `#${existingEmbed.color.toString(16).padStart(6, '0')}` : '#5865F2',
          footer: existingEmbed.footer ? { text: existingEmbed.footer.text || '' } : { text: '' },
          image: existingEmbed.image ? { url: existingEmbed.image.url || '' } : null,
          timestamp: existingEmbed.timestamp || new Date().toISOString()
        };
      } else {
        embedData = storedEmbed.embedData;
      }
      
      // Create modal for embed editing
      const modal = new ModalBuilder()
        .setCustomId(`embed_edit_modal_${messageId}_${channel.id}`)
        .setTitle('Edit Embed');
      
      // Title input
      const titleInput = new TextInputBuilder()
        .setCustomId('embedTitle')
        .setLabel('Embed Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a title for your embed')
        .setValue(embedData.title || '')
        .setRequired(false)
        .setMaxLength(256);
      
      // Description input
      const descriptionInput = new TextInputBuilder()
        .setCustomId('embedDescription')
        .setLabel('Embed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter a description for your embed')
        .setValue(embedData.description || '')
        .setRequired(false)
        .setMaxLength(4000);
      
      // Color input
      const colorInput = new TextInputBuilder()
        .setCustomId('embedColor')
        .setLabel('Embed Color (Hex code e.g. #5865F2)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#5865F2')
        .setValue(embedData.color || '#5865F2')
        .setRequired(false)
        .setMaxLength(7);
      
      // Footer input
      const footerInput = new TextInputBuilder()
        .setCustomId('embedFooter')
        .setLabel('Embed Footer')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a footer for your embed')
        .setValue(embedData.footer?.text || '')
        .setRequired(false)
        .setMaxLength(2048);
      
      // Image URL input
      const imageInput = new TextInputBuilder()
        .setCustomId('embedImage')
        .setLabel('Embed Image URL (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter an image URL for your embed')
        .setValue(embedData.image?.url || '')
        .setRequired(false)
        .setMaxLength(1024);
      
      // Create action rows for inputs
      const titleRow = new ActionRowBuilder().addComponents(titleInput);
      const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const colorRow = new ActionRowBuilder().addComponents(colorInput);
      const footerRow = new ActionRowBuilder().addComponents(footerInput);
      const imageRow = new ActionRowBuilder().addComponents(imageInput);
      
      // Add rows to modal
      modal.addComponents(titleRow, descriptionRow, colorRow, footerRow, imageRow);
      
      // Show the modal
      await interaction.editReply({ 
        embeds: [success('Preparing Edit', 'Loading embed edit form...')] 
      });
      
      await interaction.showModal(modal);
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Error', `Failed to fetch message: ${err.message}`)] 
      });
    }
  },
  
  // Handle modal submissions
  async handleModal(interaction, args) {
    await interaction.deferReply({ ephemeral: true });
    
    // Extract message ID and channel ID from the custom ID
    const [messageId, channelId] = args;
    
    // Get the channel and message
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.editReply({ 
        embeds: [error('Channel Not Found', 'The channel containing the message could not be found.')] 
      });
    }
    
    try {
      // Fetch the message
      const message = await channel.messages.fetch(messageId);
      
      // Get values from modal
      const title = interaction.fields.getTextInputValue('embedTitle');
      const description = interaction.fields.getTextInputValue('embedDescription');
      const color = interaction.fields.getTextInputValue('embedColor');
      const footer = interaction.fields.getTextInputValue('embedFooter');
      const image = interaction.fields.getTextInputValue('embedImage');
      
      // Check if at least one of title or description is provided
      if (!title && !description) {
        return interaction.editReply({ 
          embeds: [error('Missing Content', 'You must provide at least a title or description for the embed.')] 
        });
      }
      
      // Validate color hex code (if provided)
      let colorValue = config.colors.primary;
      if (color) {
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexColorRegex.test(color)) {
          return interaction.editReply({ 
            embeds: [error('Invalid Color', 'Please provide a valid hex color code (e.g., #5865F2).')] 
          });
        }
        colorValue = color;
      }
      
      // Validate image URL (if provided)
      let imageUrl = null;
      if (image) {
        const urlRegex = /^(https?:\/\/)(www\.)?([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(\/[^\s]*)?$/;
        if (!urlRegex.test(image)) {
          return interaction.editReply({ 
            embeds: [error('Invalid Image URL', 'Please provide a valid image URL or leave it blank.')] 
          });
        }
        imageUrl = image;
      }
      
      // Create updated embed data
      const embedData = {
        title: title || null,
        description: description || null,
        color: colorValue,
        footer: footer ? { text: footer } : null,
        image: imageUrl ? { url: imageUrl } : null,
        timestamp: new Date().toISOString()
      };
      
      // Create embed for updating
      const { EmbedBuilder } = require('discord.js');
      const updatedEmbed = new EmbedBuilder();
      
      if (embedData.title) updatedEmbed.setTitle(embedData.title);
      if (embedData.description) updatedEmbed.setDescription(embedData.description);
      if (embedData.color) updatedEmbed.setColor(embedData.color);
      if (embedData.footer) updatedEmbed.setFooter(embedData.footer);
      if (embedData.image) updatedEmbed.setImage(embedData.image.url);
      if (embedData.timestamp) updatedEmbed.setTimestamp(new Date(embedData.timestamp));
      
      // Update the message
      await message.edit({ embeds: [updatedEmbed] });
      
      // Update the stored embed if it exists
      embedManager.updateSentEmbed(messageId, embedData, interaction.user.id);
      
      return interaction.editReply({ 
        embeds: [success('Embed Updated', 'The embed has been successfully updated.')] 
      });
    } catch (err) {
      return interaction.editReply({ 
        embeds: [error('Error', `Failed to update embed: ${err.message}`)] 
      });
    }
  }
};
