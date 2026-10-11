const { PermissionFlagsBits } = require('discord.js');

const PERMISSION_NAMES = {
  ViewChannel: 'Ver canal',
  SendMessages: 'Enviar mensajes',
  EmbedLinks: 'Insertar enlaces',
  UseExternalEmojis: 'Usar emojis externos',
};

/**
 * Devuelve la lista (en español) de permisos que le faltan al bot en un canal.
 */
async function getMissingPermissions(channel, guild, permissionKeys) {
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  if (!me) return permissionKeys.map((k) => PERMISSION_NAMES[k] || k);
  const perms = channel.permissionsFor(me);
  if (!perms) return permissionKeys.map((k) => PERMISSION_NAMES[k] || k);
  return permissionKeys
    .filter((key) => !perms.has(PermissionFlagsBits[key]))
    .map((key) => PERMISSION_NAMES[key] || key);
}

module.exports = { getMissingPermissions };