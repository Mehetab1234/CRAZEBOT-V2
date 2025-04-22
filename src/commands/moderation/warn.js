const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { success, error, info } = require('../../utils/responseBuilder');
const config = require('../../config');

// In-memory storage for warnings
const warnings = new Map(); // guildId -> Map(userId -> Array of warnings)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Manage warnings for users')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Warn a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to warn')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('reason')
            .setDescription('Reason for the warning')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List warnings for a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to check warnings for')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a warning from a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to remove a warning from')
            .setRequired(true))
        .addIntegerOption(option => 
          option.setName('warning-id')
            .setDescription('The ID of the warning to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all warnings from a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to clear warnings from')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'add':
        await this.addWarning(interaction);
        break;
      case 'list':
        await this.listWarnings(interaction);
        break;
      case 'remove':
        await this.removeWarning(interaction);
        break;
      case 'clear':
        await this.clearWarnings(interaction);
        break;
    }
  },
  
  async addWarning(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guildId = interaction.guild.id;
    
    // Initialize guild warnings if it doesn't exist
    if (!warnings.has(guildId)) {
      warnings.set(guildId, new Map());
    }
    
    const guildWarnings = warnings.get(guildId);
    
    // Initialize user warnings if they don't exist
    if (!guildWarnings.has(targetUser.id)) {
      guildWarnings.set(targetUser.id, []);
    }
    
    const userWarnings = guildWarnings.get(targetUser.id);
    
    // Create new warning
    const warning = {
      id: userWarnings.length + 1,
      reason: reason,
      timestamp: new Date().toISOString(),
      moderator: interaction.user.id
    };
    
    // Add warning to user
    userWarnings.push(warning);
    
    // Try to send a DM to the warned user
    try {
      await targetUser.send({
        embeds: [
          {
            title: `You have been warned in ${interaction.guild.name}`,
            description: `**Reason:** ${reason}\n**Warning Count:** ${userWarnings.length}`,
            color: parseInt(config.colors.warning.replace('#', ''), 16),
            timestamp: new Date().toISOString(),
            footer: { text: 'Please follow the server rules to avoid further action.' }
          }
        ]
      });
    } catch (dmError) {
      // Couldn't send DM, continue with warning
      console.log(`Could not send DM to ${targetUser.tag}: ${dmError.message}`);
    }
    
    // Respond to the interaction
    await interaction.editReply({ 
      embeds: [
        success(
          'User Warned', 
          `Successfully warned ${targetUser.tag}.`,
          { 
            fields: [
              { name: 'Reason', value: reason },
              { name: 'Warning Count', value: `${userWarnings.length}` }
            ] 
          }
        )
      ]
    });
    
    // Log the warning to a log channel if one exists
    const logChannel = interaction.guild.channels.cache.find(
      channel => channel.name === 'mod-logs' || channel.name === 'logs'
    );
    
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        embeds: [
          {
            title: 'User Warned',
            description: `**${targetUser.tag}** (${targetUser.id}) was warned by ${interaction.user.tag}`,
            fields: [
              { name: 'Reason', value: reason },
              { name: 'Warning ID', value: `${warning.id}` },
              { name: 'Total Warnings', value: `${userWarnings.length}` }
            ],
            color: parseInt(config.colors.warning.replace('#', ''), 16),
            timestamp: new Date().toISOString(),
            footer: { text: `Warned by ${interaction.user.tag}` }
          }
        ]
      });
    }
  },
  
  async listWarnings(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const targetUser = interaction.options.getUser('user');
    const guildId = interaction.guild.id;
    
    // Check if guild has any warnings
    if (!warnings.has(guildId) || !warnings.get(guildId).has(targetUser.id)) {
      return interaction.editReply({ 
        embeds: [info('No Warnings', `${targetUser.tag} has no warnings.`)] 
      });
    }
    
    const userWarnings = warnings.get(guildId).get(targetUser.id);
    
    if (userWarnings.length === 0) {
      return interaction.editReply({ 
        embeds: [info('No Warnings', `${targetUser.tag} has no warnings.`)] 
      });
    }
    
    // Create list of warnings
    const warningList = userWarnings.map(warning => {
      const date = new Date(warning.timestamp).toLocaleString();
      return `**ID:** ${warning.id} - **Reason:** ${warning.reason}\n**Date:** ${date} - **Moderator:** <@${warning.moderator}>`;
    }).join('\n\n');
    
    await interaction.editReply({ 
      embeds: [
        info(
          `Warnings for ${targetUser.tag}`,
          `This user has ${userWarnings.length} warning${userWarnings.length === 1 ? '' : 's'}:\n\n${warningList}`
        )
      ]
    });
  },
  
  async removeWarning(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const targetUser = interaction.options.getUser('user');
    const warningId = interaction.options.getInteger('warning-id');
    const guildId = interaction.guild.id;
    
    // Check if guild has any warnings
    if (!warnings.has(guildId) || !warnings.get(guildId).has(targetUser.id)) {
      return interaction.editReply({ 
        embeds: [error('No Warnings', `${targetUser.tag} has no warnings.`)] 
      });
    }
    
    const userWarnings = warnings.get(guildId).get(targetUser.id);
    
    // Find the warning to remove
    const warningIndex = userWarnings.findIndex(warning => warning.id === warningId);
    
    if (warningIndex === -1) {
      return interaction.editReply({ 
        embeds: [error('Warning Not Found', `Could not find a warning with ID ${warningId} for ${targetUser.tag}.`)] 
      });
    }
    
    // Store warning for logging
    const removedWarning = userWarnings[warningIndex];
    
    // Remove the warning
    userWarnings.splice(warningIndex, 1);
    
    // Update warning IDs
    userWarnings.forEach((warning, index) => {
      warning.id = index + 1;
    });
    
    await interaction.editReply({ 
      embeds: [
        success(
          'Warning Removed', 
          `Successfully removed warning ${warningId} from ${targetUser.tag}.`,
          { fields: [{ name: 'Remaining Warnings', value: `${userWarnings.length}` }] }
        )
      ]
    });
    
    // Log the warning removal
    const logChannel = interaction.guild.channels.cache.find(
      channel => channel.name === 'mod-logs' || channel.name === 'logs'
    );
    
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        embeds: [
          {
            title: 'Warning Removed',
            description: `A warning was removed from **${targetUser.tag}** (${targetUser.id}) by ${interaction.user.tag}`,
            fields: [
              { name: 'Removed Warning Reason', value: removedWarning.reason },
              { name: 'Original Warning ID', value: `${warningId}` },
              { name: 'Remaining Warnings', value: `${userWarnings.length}` }
            ],
            color: parseInt(config.colors.success.replace('#', ''), 16),
            timestamp: new Date().toISOString(),
            footer: { text: `Action by ${interaction.user.tag}` }
          }
        ]
      });
    }
  },
  
  async clearWarnings(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const targetUser = interaction.options.getUser('user');
    const guildId = interaction.guild.id;
    
    // Check if guild has any warnings
    if (!warnings.has(guildId) || !warnings.get(guildId).has(targetUser.id)) {
      return interaction.editReply({ 
        embeds: [error('No Warnings', `${targetUser.tag} has no warnings.`)] 
      });
    }
    
    const userWarnings = warnings.get(guildId).get(targetUser.id);
    const warningCount = userWarnings.length;
    
    if (warningCount === 0) {
      return interaction.editReply({ 
        embeds: [error('No Warnings', `${targetUser.tag} has no warnings.`)] 
      });
    }
    
    // Clear all warnings
    warnings.get(guildId).set(targetUser.id, []);
    
    await interaction.editReply({ 
      embeds: [
        success(
          'Warnings Cleared', 
          `Successfully cleared all warnings (${warningCount}) from ${targetUser.tag}.`
        )
      ]
    });
    
    // Log the warning clearance
    const logChannel = interaction.guild.channels.cache.find(
      channel => channel.name === 'mod-logs' || channel.name === 'logs'
    );
    
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({
        embeds: [
          {
            title: 'Warnings Cleared',
            description: `All warnings were cleared from **${targetUser.tag}** (${targetUser.id}) by ${interaction.user.tag}`,
            fields: [
              { name: 'Cleared Warnings', value: `${warningCount}` }
            ],
            color: parseInt(config.colors.success.replace('#', ''), 16),
            timestamp: new Date().toISOString(),
            footer: { text: `Action by ${interaction.user.tag}` }
          }
        ]
      });
    }
  }
};
