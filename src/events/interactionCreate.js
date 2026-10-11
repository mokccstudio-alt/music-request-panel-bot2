const { Events, MessageFlags } = require('discord.js');
const panelEditor = require('../handlers/panelEditor');
const musicRequest = require('../handlers/musicRequest');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          return interaction.reply({ content: '❌ Comando no encontrado.', flags: MessageFlags.Ephemeral });
        }
        return await command.execute(interaction);
      }

      if (!('customId' in interaction) || !interaction.customId) return;

      if (interaction.customId.startsWith('editor:')) return await panelEditor.handle(interaction);
      if (interaction.customId.startsWith('music:')) return await musicRequest.handle(interaction);
    } catch (err) {
      console.error('❌ Error manejando interacción:', err);
      if (!interaction.isRepliable()) return;
      const payload = { content: '❌ Ocurrió un error inesperado. Inténtalo de nuevo.', flags: MessageFlags.Ephemeral };
      try {
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
        else await interaction.reply(payload);
      } catch {
        /* la interacción ya no es válida */
      }
    }
  },
};