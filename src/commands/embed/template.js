const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const embedManager = require('../../database/embedManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed-template')
    .setDescription('Manage embed templates')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List available embed templates'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new embed template'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'list') {
      await this.listTemplates(interaction);
    } 
    else if (subcommand === 'create') {
      // Show embed creation modal - reuse the create embed modal
      const createCommand = require('./create');
      await createCommand.execute(interaction);
    }
  },
  
  // List templates
  async listTemplates(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const templates = embedManager.getAllTemplates(guildId);
    
    if (templates.length === 0) {
      return interaction.editReply({ 
        embeds: [
          {
            title: 'No Templates Found',
            description: 'You haven\'t created any embed templates yet. Use `/embed-template create` to create one.',
            color: parseInt(config.colors.info.replace('#', ''), 16)
          }
        ]
      });
    }
    
    // Create template list
    const templateList = templates.map((template, index) => {
      return {
        name: `${index+1}. ${template.name}`,
        value: `Created by <@${template.createdBy}> on ${new Date(template.createdAt).toLocaleDateString()}`
      };
    });
    
    // Create dropdown for template management
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('embed_template_select')
      .setPlaceholder('Select a template to view or manage')
      .addOptions(templates.map(t => ({
        label: t.name,
        value: t.name,
        description: `Created by ${interaction.guild.members.cache.get(t.createdBy)?.displayName || 'Unknown'}`
      })));
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.editReply({
      embeds: [
        {
          title: 'Embed Templates',
          description: 'Here are your saved embed templates:',
          fields: templateList,
          color: parseInt(config.colors.info.replace('#', ''), 16)
        }
      ],
      components: [row]
    });
  },
  
  // Handle select menu interactions
  async handleSelectMenu(interaction) {
    if (interaction.customId === 'embed_template_select') {
      await interaction.deferUpdate();
      
      const guildId = interaction.guild.id;
      const templateName = interaction.values[0];
      
      const template = embedManager.getTemplate(guildId, templateName);
      if (!template) {
        return interaction.editReply({ 
          content: 'Template not found. It may have been deleted.',
          components: [] 
        });
      }
      
      // Show template preview
      const { EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const previewEmbed = new EmbedBuilder();
      
      const embedData = template.embedData;
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
            .setCustomId(`embed_template_use_${templateName}`)
            .setLabel('Use Template')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`embed_template_delete_${templateName}`)
            .setLabel('Delete Template')
            .setStyle(ButtonStyle.Danger)
        );
      
      await interaction.editReply({
        content: `Template: **${templateName}**`,
        embeds: [previewEmbed],
        components: [actionRow]
      });
    }
  },
  
  // Handle button interactions
  async handleButton(interaction, args) {
    const action = args[0];
    const templateName = args[1];
    
    if (action === 'save') {
      // Show modal to save current embed as template
      const modal = new ModalBuilder()
        .setCustomId('embed_template_save_modal')
        .setTitle('Save Embed Template');
      
      const nameInput = new TextInputBuilder()
        .setCustomId('templateName')
        .setLabel('Template Name')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a name for this template')
        .setRequired(true)
        .setMaxLength(32);
      
      const row = new ActionRowBuilder().addComponents(nameInput);
      modal.addComponents(row);
      
      await interaction.showModal(modal);
    }
    else if (action === 'use') {
      // Load template into session for use
      const guildId = interaction.guild.id;
      const template = embedManager.getTemplate(guildId, templateName);
      
      if (!template) {
        return interaction.reply({ 
          content: 'Template not found. It may have been deleted.',
          ephemeral: true 
        });
      }
      
      // Store in temporary session
      interaction.client.embedSession = interaction.client.embedSession || new Map();
      interaction.client.embedSession.set(interaction.user.id, template.embedData);
      
      // Redirect to send command
      await interaction.reply({ 
        content: 'Template loaded! Choose a channel to send it to.',
        ephemeral: true 
      });
      
      const sendCommand = require('./send');
      await sendCommand.handleButton(interaction);
    }
    else if (action === 'delete') {
      // Delete template
      const guildId = interaction.guild.id;
      const deleted = embedManager.deleteTemplate(guildId, templateName);
      
      if (deleted) {
        await interaction.update({ 
          content: `Template **${templateName}** has been deleted.`,
          embeds: [],
          components: [] 
        });
      } else {
        await interaction.update({ 
          content: 'Failed to delete template. It may have already been deleted.',
          embeds: [],
          components: [] 
        });
      }
    }
  },
  
  // Handle modal submissions
  async handleModal(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const templateName = interaction.fields.getTextInputValue('templateName');
    
    // Check if template name already exists
    const existingTemplate = embedManager.getTemplate(guildId, templateName);
    if (existingTemplate) {
      return interaction.editReply({ 
        embeds: [error('Template Already Exists', `A template with the name "${templateName}" already exists. Please choose a different name.`)] 
      });
    }
    
    // Check if user has a temporary embed in session
    if (!interaction.client.embedSession || !interaction.client.embedSession.has(interaction.user.id)) {
      return interaction.editReply({ 
        embeds: [error('No Embed Found', 'You need to create an embed first with `/embed-create`.')] 
      });
    }
    
    // Get the embed from session
    const embedData = interaction.client.embedSession.get(interaction.user.id);
    
    // Save as template
    embedManager.createTemplate(guildId, templateName, embedData, interaction.user.id);
    
    await interaction.editReply({ 
      embeds: [success('Template Saved', `Embed template "${templateName}" has been saved.`)] 
    });
  }
};
