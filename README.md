# 🎵 Music Request Panel Bot

Bot de Discord (discord.js v14) para crear **paneles de pedidos de música** totalmente personalizables.

- Un administrador crea el panel con un **editor privado**, que solo ve él (efímero).
- Desde el editor puede cambiar título, descripción, color, portada, miniatura, autor, pie, fecha, texto, emoji y color del botón, y el formulario.
- Al pulsar **Enviar**, el panel se publica en el canal elegido y todos lo ven, con un botón **"Pedir Música"**.
- Al pulsar el botón, el usuario rellena un formulario. Su petición se envía **como embed** al canal configurado con `/set-format-channel`.

## 📋 Comandos

| Comando | Descripción | Permiso |
|---|---|---|
| `/set-panel-channel canal:#canal` | Abre el editor privado del panel. Al pulsar **Enviar**, se publica en ese canal con el botón "Pedir Música". | Gestionar servidor |
| `/set-format-channel canal:#canal` | Define el canal donde llegan las peticiones en forma de embed. | Gestionar servidor |

### Botones del editor

- **📝 Título**: título del panel y enlace opcional.
- **📄 Descripción**: texto principal (hasta 4000 caracteres).
- **🎨 Color**: color del embed en HEX (por ejemplo `#FF0000`).
- **🖼️ Portada**: imagen grande del embed (URL).
- **🔳 Miniatura**: imagen pequeña arriba a la derecha (URL).
- **👤 Autor**: nombre e icono del autor.
- **🔻 Pie**: texto e icono del pie de página.
- **🔘 Botón**: texto y emoji del botón "Pedir Música".
- **📋 Formulario**: título del formulario, pregunta y texto de ejemplo.
- **🕒 Fecha**: activa o desactiva la marca de tiempo.
- **Menú de selección**: color del botón (azul, gris, verde o rojo).
- **📨 Enviar**, **🔄 Restablecer**, **✖️ Cancelar**.

> Para dejar un campo vacío (por ejemplo, quitar la portada), abre su formulario, borra el texto y envía.

Los paneles siguen funcionando tras reiniciar el bot, porque se guardan en `data/data.json`. Para evitar spam, cada usuario tiene un tiempo de espera de 20 segundos entre peticiones.

## ⚙️ Developer Portal

1. Entra en https://discord.com/developers/applications y crea una aplicación.
2. En **Bot**, pulsa **Reset Token** y copia el token.
3. **Intents**: el bot solo usa `Guilds` y `GuildMessages`, que **no son privilegiados**. No necesitas activar ningún intent privilegiado.
4. Invita al bot desde **OAuth2 > URL Generator**:
   - Scopes: `bot` y `applications.commands`.
   - Permisos: `View Channels`, `Send Messages`, `Embed Links` y `Use External Emojis` (si usarás emojis personalizados).

## 💻 Instalación local

Requisitos: **Node.js 18 o superior**.

```bash
git clone https://github.com/tu-usuario/music-request-panel-bot.git
cd music-request-panel-bot
npm install
cp .env.example .env    # en Windows: copy .env.example .env
```

Edita `.env`:

```
DISCORD_TOKEN=tu_token
CLIENT_ID=id_de_tu_aplicacion
GUILD_ID=id_de_tu_servidor   # opcional, para registrar los comandos al instante
```

Registra los comandos (solo la primera vez o cuando los cambies) e inicia el bot:

```bash
npm run deploy
npm start
```

## 🐙 Subir a GitHub

```bash
git init
git add .
git commit -m "Bot de pedidos de música"
git branch -M main
git remote add origin https://github.com/tu-usuario/music-request-panel-bot.git
git push -u origin main
```

El archivo `.env` y la carpeta `data/` están en `.gitignore`, así que **tu token nunca se sube**.

## 🚀 Despliegue

### Railway

1. Crea un proyecto en https://railway.app con **Deploy from GitHub repo**.
2. En **Variables**, añade `DISCORD_TOKEN`, `CLIENT_ID` y, si quieres, `GUILD_ID`.
3. Configura el comando de inicio `npm start`. Railway detecta Node automáticamente.
4. Ejecuta `npm run deploy` una vez, en local o desde la consola de Railway.
5. Para que `data/data.json` sobreviva a los redespliegues, añade un **Volume** montado en `/app/data`.

### Render

1. Crea un **Background Worker** en https://render.com conectado a tu repositorio.
2. Configura:
   - Build command: `npm install`
   - Start command: `npm start`
3. Añade las variables de entorno.
4. Para tener persistencia, añade un **Disk** montado en la carpeta `data`. Los planes gratuitos no lo incluyen.

### Discloud

1. Crea en la raíz un archivo `discloud.config` con este contenido:
   ```
   NAME=MusicPanelBot
   TYPE=bot
   MAIN=src/index.js
   RAM=100
   AUTORESTART=true
   VERSION=latest
   ```
2. Comprime el proyecto en un `.zip`. **No incluyas `node_modules`**. Incluye `.env` con tus datos.
3. Súbelo con `.upload` en el servidor de Discloud o desde su panel web.
4. Ejecuta `npm run deploy` en local para registrar los comandos.

### VPS con pm2

```bash
sudo apt update && sudo apt install -y nodejs npm git
git clone https://github.com/tu-usuario/music-request-panel-bot.git
cd music-request-panel-bot
npm install
nano .env               # pega tus variables
npm run deploy
sudo npm install -g pm2
pm2 start src/index.js --name music-panel
pm2 save
pm2 startup             # sigue las instrucciones para el arranque automático
```

Comandos útiles: `pm2 logs music-panel`, `pm2 restart music-panel`.

## 📁 Estructura

```
src/
  index.js                 # Arranque del bot
  deploy-commands.js       # Registro de slash commands
  commands/
    set-panel-channel.js
    set-format-channel.js
  events/
    ready.js
    interactionCreate.js
    messageDelete.js
  handlers/
    panelEditor.js         # Editor privado del panel
    musicRequest.js        # Botón "Pedir Música" y envío de peticiones
  utils/
    storage.js             # Persistencia JSON
    panelBuilder.js        # Construcción de embeds y botones
    permissions.js         # Comprobación de permisos
data/data.json             # Se crea automáticamente
```

## ❓ Problemas comunes

- **No aparecen los comandos**: ejecuta `npm run deploy`. Si no pusiste `GUILD_ID`, los comandos globales pueden tardar hasta 1 hora.
- **"Me faltan permisos"**: da al bot `Ver canal`, `Enviar mensajes` e `Insertar enlaces` en el canal.
- **La imagen no se ve**: usa un enlace directo a la imagen, terminado en `.png`, `.jpg`, `.gif` o `.webp`.
- **El emoji personalizado falla**: el bot debe estar en el servidor del emoji y tener `Usar emojis externos`.