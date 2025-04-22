const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and API response time'),
    
  async execute(interaction) {
    // Initial response timestamp
    const sent = await interaction.reply({ 
      content: 'Pinging...', 
      fetchReply: true 
    });
    
    // Calculate round-trip latency
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    
    // Get WebSocket heartbeat
    const wsHeartbeat = interaction.client.ws.ping;
    
    // Create embed with ping information
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${roundtripLatency}ms`, inline: true },
        { name: 'API Heartbeat', value: `${wsHeartbeat}ms`, inline: true }
      )
      .setFooter({ text: 'Discord.js v14' })
      .setTimestamp();
    
    // Edit the initial response with the embed
    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
