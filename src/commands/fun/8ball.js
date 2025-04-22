const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question to ask')
        .setRequired(true)),
    
  async execute(interaction) {
    const question = interaction.options.getString('question');
    
    // List of possible responses
    const responses = [
      // Affirmative answers
      'It is certain.',
      'It is decidedly so.',
      'Without a doubt.',
      'Yes – definitely.',
      'You may rely on it.',
      'As I see it, yes.',
      'Most likely.',
      'Outlook good.',
      'Yes.',
      'Signs point to yes.',
      
      // Non-committal answers
      'Reply hazy, try again.',
      'Ask again later.',
      'Better not tell you now.',
      'Cannot predict now.',
      'Concentrate and ask again.',
      
      // Negative answers
      "Don't count on it.",
      'My reply is no.',
      'My sources say no.',
      'Outlook not so good.',
      'Very doubtful.'
    ];
    
    // Get random response
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Question', value: question },
        { name: 'Answer', value: response }
      )
      .setFooter({ text: 'The 8-ball has spoken!' });
    
    await interaction.reply({ embeds: [embed] });
  }
};
