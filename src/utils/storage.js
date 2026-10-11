const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

let cache = null;

function emptyData() {
  return { guilds: {}, panels: {} };
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function save() {
  try {
    ensureDir();
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.error('❌ Error guardando data.json:', err);
  }
}

function load() {
  if (cache) return cache;
  try {
    ensureDir();
    if (!fs.existsSync(DATA_FILE)) {
      cache = emptyData();
      save();
      return cache;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    cache = {
      guilds: parsed.guilds && typeof parsed.guilds === 'object' ? parsed.guilds : {},
      panels: parsed.panels && typeof parsed.panels === 'object' ? parsed.panels : {},
    };
  } catch (err) {
    console.error('❌ data.json está corrupto, se creará uno nuevo (se guarda copia de seguridad):', err.message);
    try {
      if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, `${DATA_FILE}.corrupt-${Date.now()}`);
    } catch {
      /* ignorar */
    }
    cache = emptyData();
    save();
  }
  return cache;
}

function getGuildConfig(guildId) {
  const data = load();
  return data.guilds[guildId] || {};
}

function setGuildConfig(guildId, patch) {
  const data = load();
  data.guilds[guildId] = { ...(data.guilds[guildId] || {}), ...patch };
  save();
  return data.guilds[guildId];
}

function savePanel(messageId, panelData) {
  const data = load();
  data.panels[messageId] = panelData;
  save();
}

function getPanel(messageId) {
  const data = load();
  return data.panels[messageId] || null;
}

function deletePanel(messageId) {
  const data = load();
  if (data.panels[messageId]) {
    delete data.panels[messageId];
    save();
    return true;
  }
  return false;
}

module.exports = { getGuildConfig, setGuildConfig, savePanel, getPanel, deletePanel };