const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config');
const { info, error } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke')
    .addStringOption(option => 
      option.setName('category')
        .setDescription('Category of joke')
        .setRequired(false)
        .addChoices(
          { name: 'Any', value: 'Any' },
          { name: 'Programming', value: 'Programming' },
          { name: 'Miscellaneous', value: 'Miscellaneous' },
          { name: 'Dark', value: 'Dark' },
          { name: 'Pun', value: 'Pun' },
          { name: 'Spooky', value: 'Spooky' },
          { name: 'Christmas', value: 'Christmas' }
        )),
    
  async execute(interaction) {
    await interaction.deferReply();
    
    const category = interaction.options.getString('category') || 'Any';
    
    try {
      const response = await axios.get(`https://v2.jokeapi.dev/joke/${category}?blacklistFlags=nsfw,religious,political,racist,sexist,explicit`);
      
      if (response.data.error) {
        return interaction.editReply({ 
          embeds: [error('Error', `Failed to get a joke: ${response.data.message}`)] 
        });
      }
      
      let jokeContent;
      
      if (response.data.type === 'single') {
        jokeContent = response.data.joke;
      } else {
        jokeContent = `${response.data.setup}\n\n||${response.data.delivery}||`;
      }
      
      const jokeEmbed = info(
        '😂 Random Joke',
        jokeContent,
        {
          footer: `Category: ${response.data.category}`
        }
      );
      
      await interaction.editReply({ embeds: [jokeEmbed] });
    } catch (err) {
      console.error('Error fetching joke:', err);
      await interaction.editReply({ 
        embeds: [error('Error', 'Failed to fetch a joke. Please try again later.')] 
      });
    }
  }
};
