const { SlashCommandBuilder } = require('discord.js');
const { info, error } = require('../../utils/responseBuilder');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('q')
    .setDescription('Ask a question and get a random answer')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question to ask')
        .setRequired(true)),
    
  async execute(interaction) {
    const question = interaction.options.getString('question');
    
    // Check if question is empty
    if (!question.trim()) {
      return interaction.reply({ 
        embeds: [error('Empty Question', 'Please provide a question to ask.')],
        ephemeral: true
      });
    }
    
    // Check if question ends with a question mark
    const formattedQuestion = question.endsWith('?') ? question : `${question}?`;
    
    await interaction.deferReply();
    
    try {
      // Try to get an answer from an API
      const response = await axios.get('https://yesno.wtf/api');
      
      // Check if response is valid
      if (!response.data || !response.data.answer) {
        throw new Error('Invalid API response');
      }
      
      // Get answer from API
      const answer = response.data.answer.toUpperCase();
      
      // Create response embed
      const embed = info(
        '🔮 Question Response',
        `**Q:** ${formattedQuestion}\n**A:** ${answer}`,
        {
          footer: 'The universe has spoken!'
        }
      );
      
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in q command:', err);
      
      // Fallback to local responses if API fails
      const responses = [
        'YES!', 'NO!', 'ABSOLUTELY!', 'DEFINITELY NOT!', 'MAYBE...', 
        'ASK AGAIN LATER', 'WITHOUT A DOUBT', 'I DOUBT IT',
        'OUTLOOK GOOD', 'OUTLOOK NOT SO GOOD', 'SIGNS POINT TO YES',
        'UNLIKELY', 'VERY LIKELY', 'I HAVE NO IDEA'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const embed = info(
        '🔮 Question Response',
        `**Q:** ${formattedQuestion}\n**A:** ${randomResponse}`,
        {
          footer: 'The universe has spoken!'
        }
      );
      
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
