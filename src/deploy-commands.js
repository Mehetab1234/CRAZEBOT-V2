// Script to register slash commands with Discord
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const token = process.env.DISCORD_TOKEN || config.token;
const clientId = process.env.CLIENT_ID || config.clientId;
// Only use guildId if it's a valid snowflake (numeric Discord ID)
const guildId = process.env.GUILD_ID && /^\d+$/.test(process.env.GUILD_ID) ? process.env.GUILD_ID : null;

// Function to recursively find all command files
function findCommandFiles(dir) {
  let commandFiles = [];
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Recurse into subdirectories
      commandFiles = commandFiles.concat(findCommandFiles(itemPath));
    } else if (item.name.endsWith('.js')) {
      // Add JavaScript files
      commandFiles.push(itemPath);
    }
  }
  
  return commandFiles;
}

// Get all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = findCommandFiles(commandsPath);

// Load command data from each file
for (const filePath of commandFiles) {
  const command = require(filePath);
  
  if ('data' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" property.`);
  }
}

// Create a new REST instance
const rest = new REST({ version: '10' }).setToken(token);

// Function to register commands
async function deployCommands() {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    
    let data;
    
    // Try guild commands first (if we have a valid guild ID)
    if (guildId && guildId.match(/^\d+$/)) {
      try {
        console.log(`Attempting to register commands for guild ID: ${guildId}`);
        // Register commands for a specific guild (faster updates during development)
        data = await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands },
        );
        console.log(`Successfully registered ${data.length} guild commands.`);
        return; // Exit if guild command registration was successful
      } catch (guildError) {
        console.warn(`Guild command registration failed: ${guildError.message}`);
        console.log('Falling back to global command registration...');
      }
    }
    
    // Register global commands if guild-specific registration fails or is not configured
    data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );
    console.log(`Successfully registered ${data.length} global commands.`);
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

deployCommands();
