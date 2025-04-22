const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const embedManager = require('../../database/embedManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-create')
    .setDescription('Create a custom embed')
    .addStringOption(option => 
      option.setName('preset')
        .setDescription('Use a preset template')
        .setRequired(false)
        .addChoices(
          { name: 'Info (Blue)', value: 'info' },
          { name: 'Success (Green)', value: 'success' },
          { name: 'Error (Red)', value: 'error' },
          { name: 'Warning (Yellow)', value: 'warning' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
  async execute(interaction) {
    const preset = interaction.options.getString('preset');
    
    // Initialize preset data if selected
    let presetData = {};
    if (preset) {
      const templates = embedManager.getDefaultTemplates();
      presetData = templates[preset] || {};
    }
    
    // Create modal for embed creation
    const modal = new ModalBuilder()
      .setCustomId('embed_create_modal')
      .setTitle('Create Embed');
    
    // Title input
    const titleInput = new TextInputBuilder()
      .setCustomId('embedTitle')
      .setLabel('Embed Title')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter a title for your embed')
      .setValue(presetData.title || '')
      .setRequired(false)
      .setMaxLength(256);
    
    // Description input
    const descriptionInput = new TextInputBuilder()
      .setCustomId('embedDescription')
      .setLabel('Embed Description')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Enter a description for your embed')
      .setRequired(false)
      .setMaxLength(4000);
    
    // Color input
    const colorInput = new TextInputBuilder()
      .setCustomId('embedColor')
      .setLabel('Embed Color (Hex code e.g. #5865F2)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('#5865F2')
      .setValue(presetData.color || '#5865F2')
      .setRequired(false)
      .setMaxLength(7);
    
    // Footer input
    const footerInput = new TextInputBuilder()
      .setCustomId('embedFooter')
      .setLabel('Embed Footer')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter a footer for your embed')
      .setValue(presetData.footer?.text || '')
      .setRequired(false)
      .setMaxLength(2048);
    
    // Image URL input
    const imageInput = new TextInputBuilder()
      .setCustomId('embedImage')
      .setLabel('Embed Image URL (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter an image URL for your embed')
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
    await interaction.showModal(modal);
  },
  
  // Handle modal submissions
  async handleModal(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
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
    
    // Create embed data
    const embedData = {
      title: title || null,
      description: description || null,
      color: colorValue,
      footer: footer ? { text: footer } : null,
      image: imageUrl ? { url: imageUrl } : null,
      timestamp: new Date().toISOString()
    };
    
    // Store in temporary session
    interaction.client.embedSession = interaction.client.embedSession || new Map();
    interaction.client.embedSession.set(interaction.user.id, embedData);
    
    // Create preview of the embed
    const { EmbedBuilder } = require('discord.js');
    const previewEmbed = new EmbedBuilder();
    
    if (embedData.title) previewEmbed.setTitle(embedData.title);
    if (embedData.description) previewEmbed.setDescription(embedData.description);
    if (embedData.color) previewEmbed.setColor(embedData.color);
    if (embedData.footer) previewEmbed.setFooter(embedData.footer);
    if (embedData.image) previewEmbed.setImage(embedData.image.url);
    if (embedData.timestamp) previewEmbed.setTimestamp(new Date(embedData.timestamp));
    
    // Create action buttons
    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('embed_send')
          .setLabel('Send Embed')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('embed_template_save')
          .setLabel('Save as Template')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('embed_edit')
          .setLabel('Edit')
          .setStyle(ButtonStyle.Secondary)
      );
    
    // Send preview and buttons
    await interaction.editReply({
      content: 'Here\'s a preview of your embed:',
      embeds: [previewEmbed],
      components: [actionRow]
    });
  }
};

// Imports for button handling
const { ButtonBuilder, ButtonStyle } = require('discord.js');
