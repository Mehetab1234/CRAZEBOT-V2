const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display a list of available commands or info about a specific command')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('Get info about a specific command')
        .setRequired(false)
        .setAutocomplete(true)),
    
  async execute(interaction) {
    const commandName = interaction.options.getString('command');
    
    if (commandName) {
      // Show help for a specific command
      await this.showCommandHelp(interaction, commandName);
    } else {
      // Show general help
      await this.showGeneralHelp(interaction);
    }
  },
  
  async showCommandHelp(interaction, commandName) {
    // Find the command
    const command = interaction.client.commands.get(commandName);
    
    if (!command) {
      return interaction.reply({
        content: `Command \`${commandName}\` not found. Use \`/help\` to see all available commands.`,
        ephemeral: true
      });
    }
    
    // Extract command data
    const { data } = command;
    
    // Create embed for command help
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`Command: /${data.name}`)
      .setDescription(data.description || 'No description available');
    
    // Add options if they exist
    if (data.options && data.options.length > 0) {
      let optionsText = '';
      
      data.options.forEach(option => {
        if (option.type === 1) {
          // Subcommand
          optionsText += `**/${data.name} ${option.name}** - ${option.description}\n`;
        } else {
          // Regular option
          optionsText += `**${option.name}** - ${option.description}${option.required ? ' (Required)' : ''}\n`;
        }
      });
      
      if (optionsText) {
        embed.addFields({ name: 'Options', value: optionsText });
      }
    }
    
    await interaction.reply({ embeds: [embed] });
  },
  
  async showGeneralHelp(interaction) {
    // Get all command categories
    const categories = new Set();
    const commandsPath = path.join(__dirname, '../..');
    const commandFolders = fs.readdirSync(path.join(commandsPath, 'commands'));
    
    commandFolders.forEach(folder => {
      categories.add(folder);
    });
    
    // Create main help embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('Help Menu')
      .setDescription('Use the dropdown menu below to view commands by category, or use `/help command` to get detailed information about a specific command.')
      .setFooter({ text: `The bot has ${interaction.client.commands.size} commands in total` })
      .setTimestamp();
    
    // Create dropdown menu for categories
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_category_select')
          .setPlaceholder('Select a category')
          .addOptions(Array.from(categories).map(category => ({
            label: this.formatCategoryName(category),
            value: category,
            description: `View all ${category} commands`
          })))
      );
    
    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  },
  
  // Handle select menu interactions
  async handleSelectMenu(interaction) {
    if (interaction.customId === 'help_category_select') {
      const category = interaction.values[0];
      
      // Get commands in the selected category
      const commands = [];
      const categoryPath = path.join(__dirname, '../../commands', category);
      
      try {
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
          const filePath = path.join(categoryPath, file);
          const command = require(filePath);
          
          if (command.data) {
            commands.push({
              name: command.data.name,
              description: command.data.description
            });
          }
        }
      } catch (error) {
        console.error(`Error reading command directory ${category}:`, error);
      }
      
      // Create embed for category
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${this.formatCategoryName(category)} Commands`)
        .setDescription(`Here are all the commands in the ${category} category:`)
        .setFooter({ text: 'Use /help command to get more details about a specific command' });
      
      // Add commands to embed
      if (commands.length > 0) {
        const commandsList = commands.map(cmd => `**/${cmd.name}** - ${cmd.description}`).join('\n');
        embed.addFields({ name: 'Available Commands', value: commandsList });
      } else {
        embed.addFields({ name: 'Available Commands', value: 'No commands found in this category.' });
      }
      
      await interaction.update({ embeds: [embed] });
    }
  },
  
  // Helper function to format category names
  formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  },
  
  // Handle autocomplete
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const commands = Array.from(interaction.client.commands.values());
    
    // Filter commands based on input
    const filtered = commands
      .filter(choice => choice.data.name.toLowerCase().includes(focusedValue))
      .map(choice => ({
        name: choice.data.name,
        value: choice.data.name
      }));
    
    // Respond with matching choices (max 25)
    await interaction.respond(
      filtered.slice(0, 25)
    );
  }
};
