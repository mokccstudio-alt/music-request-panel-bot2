const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const storage = require('../utils/storage');
const { getMissingPermissions } = require('../utils/permissions');
const { defaultDraft, hexToInt, isValidUrl } = require('../utils/panelBuilder');

const COOLDOWN_MS = 20 * 1000;
const cooldowns = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of cooldowns) if (now - ts > COOLDOWN_MS) cooldowns.delete(key);
}, 5 * 60 * 1000).unref();

async function openRequestModal(interaction) {
  const config = storage.getGuildConfig(interaction.guildId);
  if (!config.formatChannelId) {
    return interaction.reply({
      content: '⚠️ Las peticiones aún no están activas: un administrador debe configurar el canal con `/set-format-channel`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const cdKey = `${interaction.guildId}:${interaction.user.id}`;
  const last = cooldowns.get(cdKey);
  if (last && Date.now() - last < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
    return interaction.reply({
      content: `⏳ Espera **${remaining}s** antes de enviar otra petición.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const panel = storage.getPanel(interaction.message.id) || defaultDraft();

  const requestInput = new TextInputBuilder()
    .setCustomId('request')
    .setLabel((panel.inputLabel || '¿Qué canción quieres pedir?').slice(0, 45))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(1000);
  if (panel.inputPlaceholder) requestInput.setPlaceholder(panel.inputPlaceholder.slice(0, 100));

  const linkInput = new TextInputBuilder()
    .setCustomId('link')
    .setLabel('Enlace (opcional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('https://youtube.com/... o https://open.spotify.com/...');

  const modal = new ModalBuilder()
    .setCustomId(`music:submit:${interaction.message.id}`)
    .setTitle((panel.modalTitle || 'Pedir Música').slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(requestInput),
      new ActionRowBuilder().addComponents(linkInput),
    );

  return interaction.showModal(modal);
}

async function submitRequest(interaction, panelMessageId) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const text = (interaction.fields.getTextInputValue('request') || '').trim();
  const link = (interaction.fields.getTextInputValue('link') || '').trim();

  if (!text) return interaction.editReply('❌ La petición no puede estar vacía.');
  if (link && !isValidUrl(link)) {
    return interaction.editReply('❌ El enlace no es válido. Debe empezar por `http://` o `https://`.');
  }

  const config = storage.getGuildConfig(interaction.guildId);
  if (!config.formatChannelId) {
    return interaction.editReply('⚠️ El canal de peticiones no está configurado. Avisa a un administrador.');
  }

  const channel = await interaction.guild.channels.fetch(config.formatChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return interaction.editReply('❌ El canal de peticiones ya no existe. Un administrador debe usar `/set-format-channel` de nuevo.');
  }

  const missing = await getMissingPermissions(channel, interaction.guild, ['ViewChannel', 'SendMessages', 'EmbedLinks']);
  if (missing.length) {
    return interaction.editReply(`❌ No puedo enviar la petición: me faltan permisos en el canal de peticiones (**${missing.join(', ')}**).`);
  }

  const panel = storage.getPanel(panelMessageId);
  const color = panel?.color || defaultDraft().color;
  const panelChannelId = panel?.channelId || interaction.channelId;
  const panelUrl = `https://discord.com/channels/${interaction.guildId}/${panelChannelId}/${panelMessageId}`;

  const embed = new EmbedBuilder()
    .setColor(hexToInt(color))
    .setAuthor({
      name: interaction.member?.displayName || interaction.user.username,
      iconURL: interaction.user.displayAvatarURL({ size: 128 }),
    })
    .setTitle('🎵 Nueva petición de música')
    .setDescription(text.slice(0, 4000))
    .addFields(
      { name: '👤 Usuario', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
      { name: '📍 Panel', value: `[Ir al panel](${panelUrl})`, inline: true },
    )
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() ?? undefined })
    .setTimestamp();

  if (link) embed.addFields({ name: '🔗 Enlace', value: link.slice(0, 1024) });

  try {
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  } catch (err) {
    console.error('Error enviando petición:', err);
    return interaction.editReply(`❌ No se pudo enviar la petición: \`${err.message}\``);
  }

  cooldowns.set(`${interaction.guildId}:${interaction.user.id}`, Date.now());

  const confirm = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('✅ ¡Petición enviada!')
    .setDescription(`Tu petición fue enviada correctamente:\n>>> ${text.slice(0, 1000)}`);

  return interaction.editReply({ content: '', embeds: [confirm] });
}

async function handle(interaction) {
  if (!interaction.inGuild()) return;
  const [, action, arg] = interaction.customId.split(':');

  if (action === 'request' && interaction.isButton()) return openRequestModal(interaction);
  if (action === 'submit' && interaction.isModalSubmit()) return submitRequest(interaction, arg);
}

module.exports = { handle };