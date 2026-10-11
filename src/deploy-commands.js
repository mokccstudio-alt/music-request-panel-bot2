require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('❌ Faltan DISCORD_TOKEN y/o CLIENT_ID en el archivo .env');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`⏳ Registrando ${commands.length} comandos...`);
    if (GUILD_ID && GUILD_ID.trim()) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID.trim()), { body: commands });
      console.log(`✅ Comandos registrados en el servidor ${GUILD_ID} (disponibles al instante).`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Comandos registrados globalmente (pueden tardar hasta 1 hora en aparecer).');
    }
  } catch (err) {
    console.error('❌ Error registrando comandos:', err);
    process.exit(1);
  }
})();