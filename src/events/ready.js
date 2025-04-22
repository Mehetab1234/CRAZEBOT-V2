// Event handler for when the bot is ready
const { Events, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    
    // Set bot status
    client.user.setPresence({
      activities: [{ name: '/help', type: ActivityType.Listening }],
      status: 'online',
    });
    
    // Log some statistics
    console.log(`Bot is in ${client.guilds.cache.size} guilds`);
    console.log(`Loaded ${client.commands.size} commands`);
  },
};
