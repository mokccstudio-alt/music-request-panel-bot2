const { EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DEFAULT_COLOR = '#5865F2';
const VALID_STYLES = ['Primary', 'Secondary', 'Success', 'Danger'];

function defaultDraft() {
  return {
    title: '🎶 Pedidos de Música',
    url: '',
    description:
      '¿Quieres escuchar algo en especial?\nPulsa el botón de abajo, escribe tu petición y la enviaremos al equipo.',
    color: DEFAULT_COLOR,
    image: '',
    thumbnail: '',
    authorName: '',
    authorIcon: '',
    footerText: '',
    footerIcon: '',
    timestamp: false,
    buttonLabel: 'Pedir Música',
    buttonEmoji: '🎵',
    buttonStyle: 'Primary',
    modalTitle: 'Pedir Música',
    inputLabel: '¿Qué canción quieres pedir?',
    inputPlaceholder: 'Ej: Bohemian Rhapsody - Queen',
  };
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeHex(str) {
  if (!str) return null;
  const clean = str.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return `#${clean.toUpperCase()}`;
}

function hexToInt(hex) {
  const normalized = normalizeHex(hex) || DEFAULT_COLOR;
  return parseInt(normalized.slice(1), 16);
}

/**
 * Convierte un texto en un emoji válido para botones.
 * Acepta emojis unicode, emojis personalizados <:nombre:id> / <a:nombre:id> o un ID numérico.
 */
function parseEmoji(str) {
  if (!str) return null;
  const s = str.trim();
  const custom = s.match(/^<(a?):([a-zA-Z0-9_]{2,32}):(\d{17,20})>$/);
  if (custom) return { animated: custom[1] === 'a', name: custom[2], id: custom[3] };
  if (/^\d{17,20}$/.test(s)) return { id: s };
  if (
    /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(s) &&
    [...s].length <= 10 &&
    !/[a-zA-Z\s]/.test(s)
  ) {
    return { name: s };
  }
  return null;
}

function isEmbedEmpty(d) {
  return !d.title && !d.description && !d.image && !d.thumbnail && !d.authorName && !d.footerText;
}

function buildPanelEmbed(d, { preview = false } = {}) {
  const embed = new EmbedBuilder().setColor(hexToInt(d.color));
  if (d.title) {
    embed.setTitle(d.title.slice(0, 256));
    if (d.url && isValidUrl(d.url)) embed.setURL(d.url);
  }
  if (d.description) embed.setDescription(d.description.slice(0, 4096));
  if (d.image && isValidUrl(d.image)) embed.setImage(d.image);
  if (d.thumbnail && isValidUrl(d.thumbnail)) embed.setThumbnail(d.thumbnail);
  if (d.authorName) {
    embed.setAuthor({
      name: d.authorName.slice(0, 256),
      iconURL: d.authorIcon && isValidUrl(d.authorIcon) ? d.authorIcon : undefined,
    });
  }
  if (d.footerText) {
    embed.setFooter({
      text: d.footerText.slice(0, 2048),
      iconURL: d.footerIcon && isValidUrl(d.footerIcon) ? d.footerIcon : undefined,
    });
  }
  if (d.timestamp) embed.setTimestamp();
  if (preview && isEmbedEmpty(d)) {
    embed.setDescription('*(El embed está vacío. Añade al menos un título, descripción o imagen.)*');
  }
  return embed;
}

function buildPanelButton(d, customId, disabled = false) {
  const style = VALID_STYLES.includes(d.buttonStyle) ? ButtonStyle[d.buttonStyle] : ButtonStyle.Primary;
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setLabel((d.buttonLabel || 'Pedir Música').slice(0, 80))
    .setDisabled(disabled);
  const emoji = parseEmoji(d.buttonEmoji);
  if (emoji) button.setEmoji(emoji);
  return button;
}

module.exports = {
  DEFAULT_COLOR,
  VALID_STYLES,
  defaultDraft,
  isValidUrl,
  normalizeHex,
  hexToInt,
  parseEmoji,
  isEmbedEmpty,
  buildPanelEmbed,
  buildPanelButton,
};