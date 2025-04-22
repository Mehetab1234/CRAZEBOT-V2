// Main entry point for the Discord bot with enhanced error handling for Render.com compatibility
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { handleError } = require('./utils/errorHandler');

// Create a new client instance with increased max reconnect attempts
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  // Optimize client for Render.com deployment
  failIfNotExists: false,
  retryLimit: 5,
  restTimeOffset: 750,
  presence: {
    status: 'online',
    activities: [{
      name: '/help | Moderation Bot',
      type: ActivityType.Listening
    }]
  }
});

// Create collections for commands and their cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();
client.startTime = Date.now();

// Load event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  try {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => {
        try {
          event.execute(...args);
        } catch (error) {
          handleError(`Event execution error (${event.name})`, error);
        }
      });
    } else {
      client.on(event.name, (...args) => {
        try {
          event.execute(...args);
        } catch (error) {
          handleError(`Event execution error (${event.name})`, error);
        }
      });
    }
  } catch (error) {
    handleError(`Event loading error (${file})`, error);
  }
}

// Function to load commands recursively from directories
function loadCommands(dir) {
  try {
    const commandFolders = fs.readdirSync(dir);
    let commandCount = 0;
    
    for (const folder of commandFolders) {
      const commandsPath = path.join(dir, folder);
      
      try {
        if (fs.statSync(commandsPath).isDirectory()) {
          // If it's a directory, recurse into it
          commandCount += loadCommands(commandsPath);
        } else if (folder.endsWith('.js')) {
          // If it's a JS file, load it as a command
          const command = require(commandsPath);
          
          // Set a new item in the Collection with the key as the command name and the value as the exported module
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandCount++;
          } else {
            console.log(`[WARNING] The command at ${commandsPath} is missing a required "data" or "execute" property.`);
          }
        }
      } catch (error) {
        handleError(`Command loading error (${commandsPath})`, error);
      }
    }
    
    return commandCount;
  } catch (error) {
    handleError(`Commands directory error (${dir})`, error);
    return 0;
  }
}

// Load all command modules
const commandsPath = path.join(__dirname, 'commands');
const loadedCommands = loadCommands(commandsPath);
console.log(`Loaded ${loadedCommands} commands`);

// Automatic reconnection handling
client.on('disconnect', (event) => {
  console.log(`[DISCONNECT] Bot disconnected with code ${event.code}. Attempting to reconnect...`);
});

client.on('reconnecting', () => {
  console.log('[RECONNECT] Bot is reconnecting...');
});

client.on('resume', (replayed) => {
  console.log(`[RESUME] Bot resumed connection, replayed ${replayed} events.`);
});

client.on('error', (error) => {
  handleError('Client error event', error);
});

client.on('warn', (info) => {
  console.log('[WARN]', info);
});

// Process-level error handling with automatic reconnection
process.on('unhandledRejection', error => {
  handleError('Unhandled Rejection', error);
  // Don't crash the application
});

process.on('uncaughtException', error => {
  handleError('Uncaught Exception', error);
  // Don't crash the application for non-fatal errors
  if (error.fatal) {
    console.error('Fatal error detected, exiting process');
    process.exit(1);
  }
});

// Login with automatic retry
async function loginWithRetry(maxRetries = 5, retryDelay = 5000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const token = process.env.DISCORD_TOKEN || config.token;
      if (!token) {
        throw new Error('No Discord token provided. Set the DISCORD_TOKEN environment variable or configure it in config.js');
      }
      
      console.log('Attempting to login to Discord...');
      await client.login(token);
      console.log('Login successful!');
      
      // Log some stats about the bot
      console.log(`Bot is in ${client.guilds.cache.size} guilds`);
      return true;
    } catch (error) {
      retries++;
      handleError(`Login attempt ${retries} failed`, error);
      
      if (retries >= maxRetries) {
        console.error('Max login retries reached. Exiting process.');
        process.exit(1);
      }
      
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Start the bot
console.log('Starting Discord bot...');
loginWithRetry();
