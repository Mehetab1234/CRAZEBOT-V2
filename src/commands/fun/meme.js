const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { error } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit')
    .addStringOption(option => 
      option.setName('subreddit')
        .setDescription('Subreddit to get meme from (default: random)')
        .setRequired(false)),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const subreddit = interaction.options.getString('subreddit') || '';
    let apiUrl = 'https://meme-api.herokuapp.com/gimme';
    
    if (subreddit) {
      apiUrl = `https://meme-api.herokuapp.com/gimme/${subreddit}`;
    }
    
    try {
      const response = await axios.get(apiUrl);
      
      if (response.data.code) {
        // Handle error from API
        return interaction.editReply({ 
          embeds: [error('Error', `Failed to get a meme: ${response.data.message}`)] 
        });
      }
      
      const memeData = response.data;
      
      // Check if NSFW and if the channel is marked as NSFW
      if (memeData.nsfw && !interaction.channel.nsfw) {
        return interaction.editReply({ 
          embeds: [error('NSFW Content', 'This meme is NSFW and can only be shown in NSFW channels.')] 
        });
      }
      
      const memeEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(memeData.title)
        .setURL(memeData.postLink)
        .setImage(memeData.url)
        .setFooter({ text: `👍 ${memeData.ups} | From r/${memeData.subreddit}` });
      
      await interaction.editReply({ embeds: [memeEmbed] });
    } catch (err) {
      console.error('Error fetching meme:', err);
      await interaction.editReply({ 
        embeds: [error('Error', `Failed to fetch a meme. ${err.response?.data?.message || 'Please try again later.'}`)] 
      });
    }
  }
};
