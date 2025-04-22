const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');
const ticketManager = require('../../database/ticketManager');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-open')
    .setDescription('Open a new ticket')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for opening a ticket')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Type of ticket')
        .setRequired(false)
        .addChoices(
          { name: 'General Support', value: 'General Support' },
          { name: 'Report Issue', value: 'Report Issue' },
          { name: 'Feature Request', value: 'Feature Request' }
        )),
    
  async execute(interaction, ticketTypeArg = null) {
    // Handle both slash command and button/select menu
    const isSlashCommand = !ticketTypeArg;
    
    if (isSlashCommand) {
      await interaction.deferReply({ ephemeral: true });
    }
    
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const reason = isSlashCommand ? interaction.options.getString('reason') || 'No reason provided' : 'No reason provided';
    const ticketType = isSlashCommand ? interaction.options.getString('type') || 'General Support' : ticketTypeArg;
    
    // Check if ticket system is set up
    const settings = ticketManager.getTicketSettings(guildId);
    
    if (!settings) {
      return isSlashCommand ? 
        interaction.editReply({ 
          embeds: [error('Ticket System Not Set Up', 'The ticket system has not been set up on this server.')] 
        }) : 
        interaction.editReply({ 
          content: 'The ticket system has not been set up on this server.', 
          ephemeral: true 
        });
    }
    
    // Check if user already has an open ticket
    const guild = interaction.guild;
    const category = guild.channels.cache.get(settings.category) || 
                     guild.channels.cache.find(c => c.name === settings.category && c.type === ChannelType.GuildCategory);
    
    if (!category) {
      return isSlashCommand ? 
        interaction.editReply({ 
          embeds: [error('Ticket Category Not Found', 'The ticket category could not be found. Please ask an admin to set up the ticket system properly.')] 
        }) : 
        interaction.editReply({ 
          content: 'The ticket category could not be found. Please ask an admin to set up the ticket system.', 
          ephemeral: true 
        });
    }
    
    // Create ticket permissions
    const channelPermissions = [
      {
        id: guild.id, // @everyone role
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: userId,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
      },
      {
        id: interaction.client.user.id, // Bot user
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels],
      }
    ];
    
    // Add staff roles
    if (settings.staffRoles && settings.staffRoles.length > 0) {
      settings.staffRoles.forEach(roleId => {
        channelPermissions.push({
          id: roleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
        });
      });
    }
    
    // Create ticket channel
    const cleanUsername = username.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const ticketNumber = Math.floor(1000 + Math.random() * 9000);
    const channelName = `ticket-${cleanUsername}-${ticketNumber}`;
    
    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: channelPermissions,
        topic: `Ticket for ${interaction.user.tag} | Type: ${ticketType} | Reason: ${reason}`
      });
      
      // Register the ticket in the database
      const ticket = ticketManager.createTicket(guildId, ticketChannel.id, userId, ticketType);
      
      // Create ticket welcome message
      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${ticketType} Ticket`)
        .setDescription(settings.welcomeMessage || 'Thank you for creating a ticket. Support staff will be with you shortly.')
        .addFields(
          { name: 'Created By', value: `<@${userId}>`, inline: true },
          { name: 'Ticket Type', value: ticketType, inline: true },
          { name: 'Reason', value: reason }
        )
        .setFooter({ text: `Ticket ID: ${ticket.id}` })
        .setTimestamp();
      
      // Create action buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim Ticket')
            .setEmoji('🙋')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        );
      
      await ticketChannel.send({ 
        content: `<@${userId}> <@&${settings.staffRoles?.[0] || ''}>`, 
        embeds: [welcomeEmbed],
        components: [row]
      });
      
      // Send log message if logs channel exists
      if (settings.logsChannel) {
        const logsChannel = guild.channels.cache.get(settings.logsChannel) ||
                          guild.channels.cache.find(c => c.name === settings.logsChannel);
        
        if (logsChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('Ticket Created')
            .setDescription(`A new ticket has been created: <#${ticketChannel.id}>`)
            .addFields(
              { name: 'Created By', value: `<@${userId}>`, inline: true },
              { name: 'Ticket Type', value: ticketType, inline: true },
              { name: 'Ticket ID', value: ticket.id, inline: true }
            )
            .setTimestamp();
          
          await logsChannel.send({ embeds: [logEmbed] });
        }
      }
      
      // Reply to the user
      const replyContent = { 
        embeds: [
          success(
            'Ticket Created',
            `Your ticket has been created: <#${ticketChannel.id}>`
          )
        ],
        ephemeral: true 
      };
      
      if (isSlashCommand) {
        await interaction.editReply(replyContent);
      } else {
        await interaction.editReply(replyContent);
      }
    } catch (err) {
      const errorContent = { 
        embeds: [
          error(
            'Failed to Create Ticket',
            `Error: ${err.message}`
          )
        ],
        ephemeral: true 
      };
      
      if (isSlashCommand) {
        await interaction.editReply(errorContent);
      } else {
        await interaction.editReply(errorContent);
      }
    }
  },
  
  // Handle button interactions
  async handleButton(interaction, args) {
    // This function is called from interactionCreate event handler
    await this.execute(interaction, args[0]);
  }
};
