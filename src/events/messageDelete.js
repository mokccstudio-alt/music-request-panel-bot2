const { Events } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message?.id) return;
    if (storage.deletePanel(message.id)) {
      console.log(`🗑️ Panel ${message.id} eliminado del almacenamiento (mensaje borrado).`);
    }
  },
};