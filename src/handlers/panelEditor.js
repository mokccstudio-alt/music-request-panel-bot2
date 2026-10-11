const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const storage = require('../utils/storage');
const { getMissingPermissions } = require('../utils/permissions');
const {
  DEFAULT_COLOR,
  VALID_STYLES,
  defaultDraft,
  isValidUrl,
  normalizeHex,
  parseEmoji,
  isEmbedEmpty,
  buildPanelEmbed,
  buildPanelButton,
} = require('../utils/panelBuilder');

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hora
const drafts = new Map();

// Limpieza periódica de sesiones caducadas
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of drafts) {
    if (now - session.updatedAt > SESSION_TTL_MS) drafts.delete(key);
  }
}, 10 * 60 * 1000).unref();

function draftKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function createSession(guildId, userId, targetChannelId) {
  const session = {
    draft: defaultDraft(),
    targetChannelId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  drafts.set(draftKey(guildId, userId), session);
  return session;
}

// Definición de los modales de edición
const MODALS = {
  title: {
    title: 'Editar título',
    inputs: [
      { key: 'title', label: 'Título', style: TextInputStyle.Short, max: 256, type: 'text', placeholder: 'Título del panel' },
      { key: 'url', label: 'Enlace del título (opcional)', style: TextInputStyle.Short, max: 1000, type: 'url', placeholder: 'https://...' },
    ],
  },
  description: {
    title: 'Editar descripción',
    inputs: [
      { key: 'description', label: 'Descripción', style: TextInputStyle.Paragraph, max: 4000, type: 'text', placeholder: 'Texto principal del panel' },
    ],
  },
  color: {
    title: 'Editar color',
    inputs: [
      { key: 'color', label: 'Color en HEX (vacío = por defecto)', style: TextInputStyle.Short, max: 7, type: 'color', placeholder: '#5865F2' },
    ],
  },
  image: {
    title: 'Editar portada',
    inputs: [
      { key: 'image', label: 'URL de la imagen de portada', style: TextInputStyle.Short, max: 1000, type: 'url', placeholder: 'https://.../banner.png (vacío = quitar)' },
    ],
  },
  thumbnail: {
    title: 'Editar miniatura',
    inputs: [
      { key: 'thumbnail', label: 'URL de la miniatura', style: TextInputStyle.Short, max: 1000, type: 'url', placeholder: 'https://.../icono.png (vacío = quitar)' },
    ],
  },
  author: {
    title: 'Editar autor',
    inputs: [
      { key: 'authorName', label: 'Nombre del autor', style: TextInputStyle.Short, max: 256, type: 'text', placeholder: 'Vacío = quitar autor' },
      { key: 'authorIcon', label: 'URL del icono del autor (opcional)', style: TextInputStyle.Short, max: 1000, type: 'url', placeholder: 'https://...' },
    ],
  },
  footer: {
    title: 'Editar pie de página',
    inputs: [
      { key: 'footerText', label: 'Texto del pie', style: TextInputStyle.Paragraph, max: 2048, type: 'text', placeholder: 'Vacío = quitar pie' },
      { key: 'footerIcon', label: 'URL del icono del pie (opcional)', style: TextInputStyle.Short, max: 1000, type: 'url', placeholder: 'https://...' },
    ],
  },
  button: {
    title: 'Editar botón',
    inputs: [
      { key: 'buttonLabel', label: 'Texto del botón', style: TextInputStyle.Short, max: 80, type: 'text', required: true, placeholder: 'Pedir Música' },
      { key: 'buttonEmoji', label: 'Emoji del botón (opcional)', style: TextInputStyle.Short, max: 100, type: 'emoji', placeholder: '🎵 o <:nombre:id>' },
    ],
  },
  form: {
    title: 'Editar formulario de petición',
    inputs: [
      { key: 'modalTitle', label: 'Título del formulario', style: TextInputStyle.Short, max: 45, type: 'text', required: true, placeholder: 'Pedir Música' },
      { key: 'inputLabel', label: 'Pregunta del campo de texto', style: TextInputStyle.Short, max: 45, type: 'text', required: true, placeholder: '¿Qué canción quieres pedir?' },
      { key: 'inputPlaceholder', label: 'Texto de ejemplo (opcional)', style: TextInputStyle.Short, max: 100, type: 'text', placeholder: 'Ej: Bohemian Rhapsody - Queen' },
    ],
  },
};

function buildEditorPayload(session, guildId) {
  const { draft, targetChannelId } = session;
  const config = storage.getGuildConfig(guildId);
  const formatInfo = config.formatChannelId
    ? `📥 Canal de peticiones: <#${config.formatChannelId}>`
    : '⚠️ Canal de peticiones **no configurado**. Usa `/set-format-channel` para que las peticiones lleguen a algún sitio.';

  const content = [
    '## 🛠️ Editor de panel',
    `📌 Se enviará en: <#${targetChannelId}>`,
    formatInfo,
    'Abajo tienes la **vista previa**. Usa los botones para personalizarlo y pulsa **Enviar** cuando termines.',
  ].join('\n');

  const previewRow = new ActionRowBuilder().addComponents(buildPanelButton(draft, 'editor:preview', true));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('editor:edit:title').setLabel('Título').setEmoji('📝').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:edit:description').setLabel('Descripción').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:edit:color').setLabel('Color').setEmoji('🎨').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:edit:image').setLabel('Portada').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:edit:thumbnail').setLabel('Miniatura').setEmoji('🔳').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('editor:edit:author').setLabel('Autor').setEmoji('👤').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:edit:footer').setLabel('Pie').setEmoji('🔻').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:edit:button').setLabel('Botón').setEmoji('🔘').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:edit:form').setLabel('Formulario').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('editor:toggle:timestamp')
      .setLabel(draft.timestamp ? 'Fecha: Sí' : 'Fecha: No')
      .setEmoji('🕒')
      .setStyle(draft.timestamp ? ButtonStyle.Success : ButtonStyle.Secondary),
  );

  const styleNames = {
    Primary: 'Azul (Primario)',
    Secondary: 'Gris (Secundario)',
    Success: 'Verde (Éxito)',
    Danger: 'Rojo (Peligro)',
  };
  const row3 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('editor:style')
      .setPlaceholder('Color del botón')
      .addOptions(
        VALID_STYLES.map((s) => ({
          label: `Botón ${styleNames[s]}`,
          value: s,
          default: draft.buttonStyle === s,
        })),
      ),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('editor:send').setLabel('Enviar').setEmoji('📨').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('editor:reset').setLabel('Restablecer').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('editor:cancel').setLabel('Cancelar').setEmoji('✖️').setStyle(ButtonStyle.Danger),
  );

  return {
    content,
    embeds: [buildPanelEmbed(draft, { preview: true })],
    components: [previewRow, row1, row2, row3, row4],
  };
}

async function showEditModal(interaction, session, field) {
  const def = MODALS[field];
  if (!def) {
    return interaction.reply({ content: '❌ Campo desconocido.', flags: MessageFlags.Ephemeral });
  }
  const modal = new ModalBuilder().setCustomId(`editor:modal:${field}`).setTitle(def.title);
  for (const input of def.inputs) {
    const ti = new TextInputBuilder()
      .setCustomId(input.key)
      .setLabel(input.label)
      .setStyle(input.style)
      .setRequired(Boolean(input.required))
      .setMaxLength(input.max);
    if (input.placeholder) ti.setPlaceholder(input.placeholder.slice(0, 100));
    const current = session.draft[input.key];
    if (current) ti.setValue(String(current).slice(0, input.max));
    modal.addComponents(new ActionRowBuilder().addComponents(ti));
  }
  return interaction.showModal(modal);
}

async function handleModal(interaction, session, field) {
  const def = MODALS[field];
  if (!def) {
    return interaction.reply({ content: '❌ Formulario desconocido.', flags: MessageFlags.Ephemeral });
  }

  const errors = [];
  const updates = {};

  for (const input of def.inputs) {
    const raw = (interaction.fields.getTextInputValue(input.key) || '').trim();
    switch (input.type) {
      case 'url':
        if (raw && !isValidUrl(raw)) {
          errors.push(`**${input.label}**: debe ser un enlace válido que empiece por \`http://\` o \`https://\`.`);
        } else updates[input.key] = raw;
        break;
      case 'color':
        if (!raw) updates[input.key] = DEFAULT_COLOR;
        else {
          const hex = normalizeHex(raw);
          if (!hex) errors.push(`**${input.label}**: usa un color HEX válido, por ejemplo \`#FF0000\`.`);
          else updates[input.key] = hex;
        }
        break;
      case 'emoji':
        if (raw && !parseEmoji(raw)) {
          errors.push(`**${input.label}**: emoji no válido. Usa un emoji normal (🎵) o uno personalizado (\`<:nombre:id>\`).`);
        } else updates[input.key] = raw;
        break;
      default:
        if (input.required && !raw) errors.push(`**${input.label}**: es obligatorio.`);
        else updates[input.key] = raw;
    }
  }

  if (errors.length) {
    return interaction.reply({
      content: `❌ No se aplicaron los cambios:\n${errors.map((e) => `• ${e}`).join('\n')}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  Object.assign(session.draft, updates);
  const payload = buildEditorPayload(session, interaction.guildId);
  if (interaction.isFromMessage()) return interaction.update(payload);
  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function sendPanel(interaction, session, key) {
  await interaction.deferUpdate();
  const { draft, targetChannelId } = session;

  if (isEmbedEmpty(draft)) {
    return interaction.followUp({
      content: '❌ El embed está vacío. Añade al menos un título, descripción, imagen, autor o pie antes de enviarlo.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = await interaction.guild.channels.fetch(targetChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return interaction.followUp({
      content: '❌ El canal de destino ya no existe o no es de texto. Vuelve a usar `/set-panel-channel`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const needed = ['ViewChannel', 'SendMessages', 'EmbedLinks'];
  if (parseEmoji(draft.buttonEmoji)?.id) needed.push('UseExternalEmojis');
  const missing = await getMissingPermissions(channel, interaction.guild, needed);
  if (missing.length) {
    return interaction.followUp({
      content: `❌ Me faltan permisos en ${channel}: **${missing.join(', ')}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  let sent;
  try {
    sent = await channel.send({
      embeds: [buildPanelEmbed(draft)],
      components: [new ActionRowBuilder().addComponents(buildPanelButton(draft, 'music:request'))],
    });
  } catch (err) {
    console.error('Error enviando panel:', err);
    return interaction.followUp({
      content: `❌ No se pudo enviar el panel: \`${err.message}\`\nRevisa las URLs de las imágenes y el emoji del botón.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  storage.savePanel(sent.id, {
    ...draft,
    guildId: interaction.guildId,
    channelId: channel.id,
    createdBy: interaction.user.id,
    createdAt: Date.now(),
  });
  storage.setGuildConfig(interaction.guildId, { panelChannelId: channel.id });
  drafts.delete(key);

  const config = storage.getGuildConfig(interaction.guildId);
  const warning = config.formatChannelId
    ? `\n📥 Las peticiones llegarán a <#${config.formatChannelId}>.`
    : '\n⚠️ Recuerda configurar el canal de peticiones con `/set-format-channel`.';

  return interaction.editReply({
    content: `✅ Panel enviado correctamente en ${channel}: ${sent.url}${warning}`,
    embeds: [],
    components: [],
  });
}

async function handle(interaction) {
  if (!interaction.inGuild()) return;
  const [, action, arg] = interaction.customId.split(':');

  if (action === 'preview') {
    return interaction.reply({ content: 'ℹ️ Este botón es solo una vista previa.', flags: MessageFlags.Ephemeral });
  }

  const key = draftKey(interaction.guildId, interaction.user.id);
  const session = drafts.get(key);
  if (!session) {
    return interaction.reply({
      content: '⌛ Esta sesión de edición expiró o ya fue enviada. Usa `/set-panel-channel` para crear otro panel.',
      flags: MessageFlags.Ephemeral,
    });
  }
  session.updatedAt = Date.now();

  switch (action) {
    case 'edit':
      if (!interaction.isButton()) return;
      return showEditModal(interaction, session, arg);
    case 'modal':
      if (!interaction.isModalSubmit()) return;
      return handleModal(interaction, session, arg);
    case 'toggle':
      if (arg === 'timestamp') session.draft.timestamp = !session.draft.timestamp;
      return interaction.update(buildEditorPayload(session, interaction.guildId));
    case 'style': {
      if (!interaction.isStringSelectMenu()) return;
      const value = interaction.values[0];
      if (VALID_STYLES.includes(value)) session.draft.buttonStyle = value;
      return interaction.update(buildEditorPayload(session, interaction.guildId));
    }
    case 'send':
      return sendPanel(interaction, session, key);
    case 'reset':
      session.draft = defaultDraft();
      return interaction.update(buildEditorPayload(session, interaction.guildId));
    case 'cancel':
      drafts.delete(key);
      return interaction.update({ content: '✖️ Edición cancelada. No se envió nada.', embeds: [], components: [] });
    default:
      return interaction.reply({ content: '❌ Acción desconocida.', flags: MessageFlags.Ephemeral });
  }
}

module.exports = { handle, createSession, buildEditorPayload };