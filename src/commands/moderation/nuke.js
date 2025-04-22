const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { handleError, createErrorResponse } = require('../../utils/errorHandler');
const { success, error, warning } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Delete all messages in a channel (creates a clone and deletes the original)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to nuke (defaults to current channel)')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for nuking the channel')
        .setRequired(false)),
        
  async execute(interaction) {
    try {
      // Get the target channel
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Create confirmation buttons
      const confirmButton = new ButtonBuilder()
        .setCustomId('nuke_confirm')
        .setLabel('Confirm Nuke')
        .setStyle(ButtonStyle.Danger);
        
      const cancelButton = new ButtonBuilder()
        .setCustomId('nuke_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);
        
      const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
      
      // Send confirmation message
      await interaction.reply({
        embeds: [warning(
          '⚠️ Channel Nuke Confirmation',
          `Are you sure you want to nuke ${targetChannel} and delete ALL messages?\n\n` +
          `This will create a clone of the channel with the same permissions and delete the original.\n\n` +
          `**This action cannot be undone!**\n\n` +
          `Reason: ${reason}`
        )],
        components: [row],
        ephemeral: true
      });
      
      // Create button collector
      const filter = i => i.user.id === interaction.user.id && 
                          (i.customId === 'nuke_confirm' || i.customId === 'nuke_cancel');
                          
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 30000,
        max: 1
      });
      
      // Handle button interactions
      collector.on('collect', async i => {
        if (i.customId === 'nuke_cancel') {
          await i.update({
            embeds: [info('Nuke Cancelled', 'Channel nuke operation has been cancelled.')],
            components: []
          });
          return;
        }
        
        // User confirmed the nuke
        await i.update({
          embeds: [warning('Nuking in Progress', `Nuking ${targetChannel}... This may take a moment.`)],
          components: []
        });
        
        try {
          // First, create a new channel with the same settings
          const newChannel = await targetChannel.clone({
            reason: `Channel nuked by ${interaction.user.tag} - ${reason}`
          });
          
          // Send nuke animation
          const nukeMessage = await newChannel.send('**CHANNEL NUKE INCOMING**');
          
          // Create nuke animation with ASCII art
          const nukeAnimation = [
            '```\n🔴 NUKE INCOMING - 3 ```',
            '```\n🔴 NUKE INCOMING - 2 ```',
            '```\n🔴 NUKE INCOMING - 1 ```',
            '```\n' +
            '    ____                  ____                  \n' +
            '   /\\   \\                /\\   \\                 \n' +
            '  /::\\   \\              /::\\   \\                \n' +
            ' /:/\\:\\   \\            /:/\\:\\   \\               \n' +
            '/::\\~\\:\\   \\          /::\\~\\:\\   \\              \n' +
            '/:/\\:\\ \\:\\___\\        /:/\\:\\ \\:\\___\\             \n' +
            '\\/__\\:\\/:/   /        \\/__\\:\\/:/   /             \n' +
            '     \\::/   /              \\::/   /              \n' +
            '     /:/   /               /:/   /               \n' +
            '     \\/__/                 \\/__/                 \n' +
            '```',
            '```\n' +
            '     ______                   ______              \n' +
            '    /      \\                 /      \\             \n' +
            '   /        \\               /        \\            \n' +
            '  /_________\\             /_________\\           \n' +
            ' |  _______  |           |  _______  |          \n' +
            ' | |       | |           | |       | |          \n' +
            ' | |_______| |           | |_______| |          \n' +
            ' |___________|           |___________|          \n' +
            '```',
            '```\n' +
            '           *                  *                  \n' +
            '          * *                * *                 \n' +
            '         *   *              *   *                \n' +
            '        *     *            *     *               \n' +
            '       *       *          *       *              \n' +
            '      *         *        *         *             \n' +
            '     *           *      *           *            \n' +
            '    *             *    *             *           \n' +
            '   *               *  *               *          \n' +
            '  *                 **                 *         \n' +
            '```'
          ];
          
          // Play the animation
          for (const frame of nukeAnimation) {
            await nukeMessage.edit(frame);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Delete the original channel
          await targetChannel.delete(`Channel nuked by ${interaction.user.tag} - ${reason}`);
          
          // Send success message in the new channel
          await newChannel.send({
            embeds: [success(
              '💥 Channel Nuked',
              `This channel has been nuked by ${interaction.user}.\n\n` +
              `**Reason:** ${reason}\n\n` +
              `All previous messages have been deleted.`
            )]
          });
          
        } catch (nukeError) {
          handleError('Nuke command - execution', nukeError);
          
          // Try to send error in the interaction channel
          try {
            await interaction.followUp({
              embeds: [error('Nuke Failed', `Failed to nuke channel: ${nukeError.message}`)],
              ephemeral: true
            });
          } catch (followUpError) {
            console.error('Failed to send nuke error followup:', followUpError);
          }
        }
      });
      
      // Handle collector timeout
      collector.on('end', async collected => {
        if (collected.size === 0) {
          try {
            await interaction.editReply({
              embeds: [info('Nuke Cancelled', 'Channel nuke operation timed out and was cancelled.')],
              components: []
            });
          } catch (error) {
            console.error('Failed to edit reply after collector timeout:', error);
          }
        }
      });
      
    } catch (error) {
      handleError('Nuke command', error);
      await interaction.reply(createErrorResponse(`Failed to start nuke operation: ${error.message}`));
    }
  },
  
  async handleButton(interaction, args) {
    // Button handling is done in the execute function
    // This is added to support external button handlers if needed in the future
  }
};