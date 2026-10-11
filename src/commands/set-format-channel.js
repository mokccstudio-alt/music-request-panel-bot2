const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags, EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { getMissingPermissions } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-format-channel')
    .setDescription('Establece el canal donde llegarán las peticiones de música')
    .addChannelOption((option) =>
      option
        .setName('canal')
        .setDescription('Canal que recibirá las peticiones en forma de embed')
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
        content: `❌ No puedo enviar mensajes en ${channel}. Me faltan permisos: **${missing.join(', ')}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    storage.setGuildConfig(interaction.guildId, { formatChannelId: channel.id });

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Canal de peticiones configurado')
      .setDescription(
        `Las peticiones de música enviadas desde los paneles llegarán a ${channel}.\n\nCrea un panel con \`/set-panel-channel\` si aún no lo has hecho.`,
      );

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};