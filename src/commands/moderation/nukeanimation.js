const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { handleError, createErrorResponse } = require('../../utils/errorHandler');
const { success, info } = require('../../utils/responseBuilder');

// Animation frames
const animations = {
  nuclear: [
    '```\n🔴 NUCLEAR LAUNCH DETECTED - 3 ```',
    '```\n🔴 NUCLEAR LAUNCH DETECTED - 2 ```',
    '```\n🔴 NUCLEAR LAUNCH DETECTED - 1 ```',
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
    '           \\                  /                  \n' +
    '            \\                /                   \n' +
    '            |      __       |                   \n' +
    '           /|  __/  \\_     |\\                  \n' +
    '          / | /      \\\\    | \\                 \n' +
    '            |/        \\|                        \n' +
    '              \\______/                          \n' +
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
    '```',
    '```\n' +
    '                    ____                        \n' +
    '                 /\\/    \\/\\                     \n' +
    '                /          \\                    \n' +
    '               |     __     |                   \n' +
    '              /|    /  \\    |\\                  \n' +
    '             / |   |    |   | \\                 \n' +
    '               |    \\__/    |                   \n' +
    '                \\          /                    \n' +
    '                 \\/\\____/\\/                     \n' +
    '```',
    '```\n' +
    '                                                \n' +
    '              .::.                              \n' +
    '             ::::::                             \n' +
    '            :::::::::                           \n' +
    '           ::::::::::                           \n' +
    '          :::::::::::::                         \n' +
    '         ::::::::::::::                         \n' +
    '         ::::::::::::::                         \n' +
    '        ::::::::::::::::                        \n' +
    '        ::::::::::::::::                        \n' +
    '       ::::::::::::::::::                       \n' +
    '       ::::::::::::::::::                       \n' +
    '```',
    '```\n' +
    '    .-.   .-.      .-.     .-.   .-.      .-.   \n' +
    '   /   \\ /   \\    /   \\   /   \\ /   \\    /   \\  \n' +
    '  | ... | ... |  | ... | | ... | ... |  | ... | \n' +
    '   \\ 0 / \\ 0 /    \\ 0 /   \\ 0 / \\ 0 /    \\ 0 /  \n' +
    '    `-´   `-´      `-´     `-´   `-´      `-´   \n' +
    '💥 KABOOM 💥 NUCLEAR DETONATION SUCCESSFUL 💥 KABOOM 💥\n' +
    '```'
  ],
  boom: [
    '```\n⚠️ EXPLOSION IMMINENT - 3 ⚠️```',
    '```\n⚠️ EXPLOSION IMMINENT - 2 ⚠️```', 
    '```\n⚠️ EXPLOSION IMMINENT - 1 ⚠️```',
    '```\n' +
    '      _.-^^---....,,--             \n' +
    '  _--                  --_         \n' +
    ' <                        >)        \n' +
    ' |                         |        \n' +
    '  \\._                   _./         \n' +
    '     ```--. . , ; .--```            \n' +
    '           | |   |                   \n' +
    '        .-=||  | |=-.                \n' +
    '        `-=#$%&%$#=-`                \n' +
    '           | ;  :|                   \n' +
    '  _____.,-#%&$@%#&#~,._____          \n' +
    '```',
    '```\n' +
    '              *                      \n' +
    '          ****                       \n' +
    '       *********                     \n' +
    '     *************                   \n' +
    '    ***************                  \n' +
    '   *****************                 \n' +
    '   *****************                 \n' +
    '    ***************                  \n' +
    '     *************                   \n' +
    '       *********                     \n' +
    '          ****                       \n' +
    '              *                      \n' +
    '```',
    '```\n' +
    '      ____  ____  ____  __  __ \n' +
    '     | __ )/ __ \\/ __ \\|  \\/  |\n' +
    '     |  _ \\ |  | | |  ||      |\n' +
    '     | |_) | |__| | |__| |\\/| |\n' +
    '     |____/ \\____/\\____|_|  |_|\n' +
    '💥 EXPLOSION COMPLETE 💥\n' +
    '```'
  ],
  thanos: [
    '```\nThanos has arrived...```',
    '```\nThanos: "I am inevitable"```',
    '```\n*snap*```',
    '```\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⣠⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⠀⠀⠀⠀\n' +
    '⠀⠀⢾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡷⠀⠀⠀\n' +
    '⠀⢠⣿⣿⣿⣿⡿⠛⠛⠛⠛⠛⢻⣿⣿⣿⡟⠛⠛⠛⠛⠻⣿⣿⣿⣿⣿⡄⠀⠀\n' +
    '⠀⢸⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⢸⣿⣿⣿⡇⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⡇⠀⠀\n' +
    '⠀⣿⠉⠹⢿⣿⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⣿⡿⠏⠉⣿⠀⠀\n' +
    '⢰⣿⣿⡇⠀⠁⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠘⠀⢸⣿⣿⡆⠀\n' +
    '⢰⣿⣿⠃⣷⣦⣤⣴⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⣤⣴⣷⠘⣿⣿⡆⠀\n' +
    '⠈⣿⣿⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣿⣿⠁⠀\n' +
    '⠀⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀\n' +
    '⠀⠀⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟⠀⠀⠀\n' +
    '⠀⠀⠀⠈⠙⠻⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠋⠁⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠛⠿⠿⣿⣿⣿⠿⠿⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '```',
    '```\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠛⠛⠛⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠋⠀⠀⢀⣀⠀⠙⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀⠀⢾⣿⣿⠃⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀⠀⠀⠀⠉⠁⠀⠀⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⠃⠀⠀⠠⠤⠤⠤⠤⠤⠤⠤⠤⠘⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⣠⡄⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠻⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⣄⣀⣀⣀⣀⣀⣠⣤⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿\n' +
    '```',
    '```\n' +
    'Half of all life has been snapped away...\n' +
    'Perfectly balanced, as all things should be.\n' +
    '```'
  ]
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nukeanimation')
    .setDescription('Display a nuke animation in the channel (does not delete messages)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(option => 
      option.setName('type')
        .setDescription('The type of animation to display')
        .setRequired(true)
        .addChoices(
          { name: 'Nuclear Explosion', value: 'nuclear' },
          { name: 'Boom Animation', value: 'boom' },
          { name: 'Thanos Snap', value: 'thanos' }
        )),
        
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get the animation type
      const animationType = interaction.options.getString('type');
      
      // Get the selected animation frames
      const frames = animations[animationType];
      
      if (!frames) {
        return await interaction.editReply({
          embeds: [error('Animation Error', 'The selected animation type was not found.')]
        });
      }
      
      // Send the initial message
      const message = await interaction.editReply(frames[0]);
      
      // Show animation frames with delay
      for (let i = 1; i < frames.length; i++) {
        // Wait for a moment between frames
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update the message with the next frame
        await message.edit(frames[i]);
      }
      
      // Final message after animation completes
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add a completion message
      let completionMessage;
      
      switch (animationType) {
        case 'nuclear':
          completionMessage = 'Nuclear explosion animation complete! 💥';
          break;
        case 'boom':
          completionMessage = 'Explosion animation complete! 💣';
          break;
        case 'thanos':
          completionMessage = 'Perfectly balanced, as all things should be. 🧤';
          break;
        default:
          completionMessage = 'Animation complete!';
      }
      
      await interaction.followUp({
        embeds: [success('Animation Complete', completionMessage)]
      });
      
    } catch (error) {
      handleError('Nuke animation command', error);
      
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(createErrorResponse(`Animation error: ${error.message}`));
      } else {
        await interaction.reply(createErrorResponse(`Animation error: ${error.message}`));
      }
    }
  }
};