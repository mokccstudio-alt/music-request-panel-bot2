require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');

if (!process.env.DISCORD_TOKEN) {
  console.error('❌ Falta DISCORD_TOKEN en el archivo .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Message, Partials.Channel],
});

client.commands = new Collection();

// Cargar comandos
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command?.data && typeof command.execute === 'function') {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ El comando ${file} no tiene "data" o "execute" y se ha ignorado.`);
  }
}

// Cargar eventos
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (!event?.name || typeof event.execute !== 'function') {
    console.warn(`⚠️ El evento ${file} no es válido y se ha ignorado.`);
    continue;
  }
  const runner = async (...args) => {
    try {
      await event.execute(...args);
    } catch (err) {
      console.error(`❌ Error en el evento ${event.name}:`, err);
    }
  };
  if (event.once) client.once(event.name, runner);
  else client.on(event.name, runner);
}

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promesa rechazada sin manejar:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('❌ No se pudo iniciar sesión. ¿Token correcto?', err.message);
  process.exit(1);
});