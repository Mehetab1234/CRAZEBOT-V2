const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { db } = require('../../database/db');
const { handleError, createErrorResponse } = require('../../utils/errorHandler');
const { success, error, info } = require('../../utils/responseBuilder');
const { exec } = require('child_process');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('database')
    .setDescription('Database management commands (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check database connection status')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('init')
        .setDescription('Initialize database tables')
    ),
    
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'status') {
        await this.checkStatus(interaction);
      } else if (subcommand === 'init') {
        await this.initDatabase(interaction);
      }
    } catch (error) {
      handleError('Database command', error);
      await interaction.reply(createErrorResponse('An error occurred while executing this command.'));
    }
  },
  
  async checkStatus(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      if (!db) {
        return await interaction.editReply({
          embeds: [error('Database Error', 'Database connection is not available. Check your DATABASE_URL environment variable.')]
        });
      }
      
      // Test database connection
      const result = await db.execute('SELECT NOW();');
      
      if (result && result.rows && result.rows.length > 0) {
        return await interaction.editReply({
          embeds: [success('Database Connected', 'Successfully connected to the database.', {
            fields: [
              { name: 'Server Time', value: result.rows[0].now.toString(), inline: true }
            ]
          })]
        });
      } else {
        return await interaction.editReply({
          embeds: [error('Database Error', 'Failed to retrieve data from the database. The connection might be unstable.')]
        });
      }
    } catch (err) {
      handleError('Database status check', err);
      return await interaction.editReply({
        embeds: [error('Database Error', `Failed to connect to the database: ${err.message}`)]
      });
    }
  },
  
  async initDatabase(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      await interaction.editReply({
        embeds: [info('Database Initialization', 'Starting database initialization. This may take a moment...')]
      });
      
      // Run the database initialization script
      const child = exec('node db-init.js');
      
      let output = '';
      
      child.stdout.on('data', (data) => {
        output += data;
      });
      
      child.stderr.on('data', (data) => {
        output += `ERROR: ${data}`;
      });
      
      child.on('close', async (code) => {
        if (code === 0) {
          await interaction.editReply({
            embeds: [success('Database Initialized', 'Successfully initialized the database tables.', {
              fields: [
                { name: 'Output', value: output || 'No output', inline: false }
              ]
            })]
          });
        } else {
          await interaction.editReply({
            embeds: [error('Database Error', `Failed to initialize database (Exit code: ${code})`, {
              fields: [
                { name: 'Output', value: output || 'No output', inline: false }
              ]
            })]
          });
        }
      });
    } catch (err) {
      handleError('Database initialization', err);
      return await interaction.editReply({
        embeds: [error('Database Error', `Failed to initialize the database: ${err.message}`)]
      });
    }
  }
};