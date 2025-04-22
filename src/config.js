// Configuration settings for the bot
module.exports = {
  token: process.env.DISCORD_TOKEN || 'YOUR_DISCORD_TOKEN', // Will be replaced with env variable in production
  clientId: process.env.CLIENT_ID || 'YOUR_CLIENT_ID',
  guildId: process.env.GUILD_ID, // For development in a specific guild
  
  // Default colors for embeds
  colors: {
    primary: '#5865F2',   // Discord Blurple
    success: '#57F287',   // Green
    warning: '#FEE75C',   // Yellow
    error: '#ED4245',     // Red
    info: '#5865F2',      // Blurple
  },
  
  // Ticket system configuration
  ticketSystem: {
    defaultCategory: 'Tickets',
    roleIds: [],  // Staff role IDs that can view tickets by default
    logsChannel: 'ticket-logs',
    ticketTypes: [
      { name: 'General Support', emoji: '🔧' },
      { name: 'Report Issue', emoji: '⚠️' },
      { name: 'Feature Request', emoji: '💡' }
    ]
  },
  
  // API endpoints
  apis: {
    joke: 'https://v2.jokeapi.dev/joke/Any',
    meme: 'https://meme-api.herokuapp.com/gimme',
  },
  
  // Cooldowns in seconds
  cooldowns: {
    default: 3,
    fun: 5,
    moderation: 10,
  },
  
  // Default embed templates
  embedTemplates: {
    info: {
      title: "Information",
      color: '#5865F2',
      footer: { text: "Bot Information" }
    },
    success: {
      title: "Success",
      color: '#57F287',
      footer: { text: "Operation Successful" }
    },
    error: {
      title: "Error",
      color: '#ED4245',
      footer: { text: "An error occurred" }
    }
  }
};
