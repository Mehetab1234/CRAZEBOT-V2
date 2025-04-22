// Time-related utility functions
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Common timezones for the world clock feature
const commonTimezones = {
  'UTC': 'UTC',
  'EST': 'America/New_York',
  'CST': 'America/Chicago',
  'MST': 'America/Denver',
  'PST': 'America/Los_Angeles',
  'GMT': 'Europe/London',
  'CET': 'Europe/Paris',
  'JST': 'Asia/Tokyo',
  'AEST': 'Australia/Sydney',
  'IST': 'Asia/Kolkata',
};

/**
 * Get the current time in a specific timezone
 * @param {string} timezone - The timezone to get the time for
 * @returns {string} The formatted time
 */
function getTimeInTimezone(timezone) {
  try {
    const options = {
      timeZone: timezone,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    return new Date().toLocaleString('en-US', options);
  } catch (error) {
    console.error(`Error getting time for timezone ${timezone}:`, error);
    return 'Invalid timezone';
  }
}

/**
 * Creates an embed with the current time in the specified timezone
 * @param {string} timezone - The timezone to display
 * @param {string} label - The label for the timezone
 * @returns {EmbedBuilder} The time embed
 */
function createTimeEmbed(timezone, label) {
  const resolvedTimezone = commonTimezones[timezone] || timezone;
  const time = getTimeInTimezone(resolvedTimezone);
  
  const embed = new EmbedBuilder()
    .setTitle(`🕰️ World Clock: ${label || timezone}`)
    .setDescription(`Current time: **${time}**`)
    .setColor(config.colors.primary)
    .setTimestamp();
    
  return embed;
}

/**
 * Creates an embed with multiple timezones
 * @param {Array} timezones - Array of timezone objects with code and label
 * @returns {EmbedBuilder} The multi-timezone embed
 */
function createMultipleTimezonesEmbed(timezones) {
  const embed = new EmbedBuilder()
    .setTitle('🌎 World Clock')
    .setColor(config.colors.primary)
    .setTimestamp();
  
  timezones.forEach(tz => {
    const resolvedTimezone = commonTimezones[tz.code] || tz.code;
    const time = getTimeInTimezone(resolvedTimezone);
    embed.addFields({ name: tz.label || tz.code, value: time, inline: true });
  });
  
  return embed;
}

/**
 * Gets a list of all supported timezones
 * @returns {EmbedBuilder} The timezone list embed
 */
function getTimezoneListEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🌐 Supported Timezones')
    .setDescription('Here are some common timezones you can use:')
    .setColor(config.colors.primary)
    .setTimestamp();
  
  const chunks = [];
  const entries = Object.entries(commonTimezones);
  
  // Split into chunks for better formatting
  for (let i = 0; i < entries.length; i += 5) {
    chunks.push(entries.slice(i, i + 5));
  }
  
  chunks.forEach((chunk, index) => {
    const formattedChunk = chunk.map(([code, tz]) => `\`${code}\` - ${tz}`).join('\n');
    embed.addFields({ name: `Timezones (${index + 1})`, value: formattedChunk, inline: true });
  });
  
  embed.addFields({ 
    name: 'Full List', 
    value: 'You can also use any valid IANA timezone identifier, such as `America/New_York` or `Europe/London`.',
    inline: false 
  });
  
  return embed;
}

module.exports = {
  getTimeInTimezone,
  createTimeEmbed,
  createMultipleTimezonesEmbed,
  getTimezoneListEmbed,
  commonTimezones
};
