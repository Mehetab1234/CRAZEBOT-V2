// Main entry point for the Discord bot
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { handleError } = require('./utils/errorHandler');

// Create a new client instance
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ] 
});

// Create collections for commands and their cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Function to load commands recursively from directories
function loadCommands(dir) {
  const commandFolders = fs.readdirSync(dir);
  
  for (const folder of commandFolders) {
    const commandsPath = path.join(dir, folder);
    
    if (fs.statSync(commandsPath).isDirectory()) {
      // If it's a directory, recurse into it
      loadCommands(commandsPath);
    } else if (folder.endsWith('.js')) {
      // If it's a JS file, load it as a command
      const command = require(commandsPath);
      
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(`[WARNING] The command at ${commandsPath} is missing a required "data" or "execute" property.`);
      }
    }
  }
}

// Load all command modules
const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

// Handle errors
process.on('unhandledRejection', error => {
  handleError('Unhandled Rejection', error);
});

process.on('uncaughtException', error => {
  handleError('Uncaught Exception', error);
});

// Login to Discord with your token
client.login(process.env.DISCORD_TOKEN || config.token).catch(error => {
  handleError('Login Error', error);
  process.exit(1);
});

console.log('Starting Discord bot...');
