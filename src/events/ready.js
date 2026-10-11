const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Conectado como ${client.user.tag} | ${client.guilds.cache.size} servidor(es) | ${client.commands.size} comando(s)`);
    client.user.setActivity('🎵 Pedidos de música', { type: ActivityType.Listening });
  },
};