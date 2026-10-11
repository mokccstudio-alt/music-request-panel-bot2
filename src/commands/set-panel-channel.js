const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getMissingPermissions } = require('../utils/permissions');
const { createSession, buildEditorPayload } = require('../handlers/panelEditor');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-panel-channel')
    .setDescription('Crea un panel personalizable de pedidos de música en un canal')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal donde se publicará el panel')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: '❌ Este comando solo funciona en servidores.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('canal', true);

    const missing = await getMissingPermissions(channel, interaction.guild, ['ViewChannel', 'SendMessages', 'EmbedLinks']);
    if (missing.length) {
      return interaction.reply({
        content: `❌ No puedo publicar en ${channel}. Me faltan permisos: **${missing.join(', ')}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const session = createSession(interaction.guildId, interaction.user.id, channel.id);
    return interaction.reply({
      ...buildEditorPayload(session, interaction.guildId),
      flags: MessageFlags.Ephemeral,
    });
  },
};