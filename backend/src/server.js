require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: process.env.DASHBOARD_URL || 'http://localhost:3001', methods: ['GET', 'POST'] } });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

global.GoatBot = { commands: new Map(), eventCommands: new Map(), onReaction: new Map(), onReply: new Map(), onEvent: new Map(), prefix: process.env.BOT_PREFIX || '!', ownerID: process.env.BOT_OWNER_ID || [], admins: new Map(), banned: new Map(), cooldowns: new Map(), messageID: new Map(), io: io };

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goatbot', { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log('✅ MongoDB connected')).catch(err => console.error('❌ MongoDB connection error:', err));

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const commandRoutes = require('./routes/commands');

app.use('/api', apiRoutes);
app.use('/auth', authRoutes);
app.use('/commands', commandRoutes);

app.get('/health', (req, res) => { res.json({ status: 'OK', timestamp: new Date() }); });

app.get('/webhook/facebook', (req, res) => { const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN; const mode = req.query['hub.mode']; const token = req.query['hub.verify_token']; const challenge = req.query['hub.challenge']; if (mode && token) { if (mode === 'subscribe' && token === VERIFY_TOKEN) { console.log('✅ Facebook webhook verified'); res.status(200).send(challenge); } else { res.sendStatus(403); } } else { res.sendStatus(400); } });

app.post('/webhook/facebook', (req, res) => { const facebookHandler = require('./integrations/facebook'); facebookHandler.handleWebhook(req.body, io); res.sendStatus(200); });

app.get('/webhook/whatsapp', (req, res) => { const VERIFY_TOKEN = process.env.TWILIO_VERIFY_TOKEN || 'whatsapp_verify_token'; const token = req.query['hub.verify_token']; const challenge = req.query['hub.challenge']; if (token === VERIFY_TOKEN) { console.log('✅ WhatsApp webhook verified'); res.status(200).send(challenge); } else { res.sendStatus(403); } });

app.post('/webhook/whatsapp', (req, res) => { const whatsappHandler = require('./integrations/whatsapp'); whatsappHandler.handleWebhook(req.body, io); res.sendStatus(200); });

const loadCommands = async () => { try { const commandsPath = path.join(__dirname, 'commands'); const fs = require('fs'); if (!fs.existsSync(commandsPath)) { fs.mkdirSync(commandsPath, { recursive: true }); } const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')); for (const file of files) { try { const command = require(`./commands/${file}`); if (command.config && command.run) { global.GoatBot.commands.set(command.config.name, command); console.log(`✅ Loaded command: ${command.config.name}`); } } catch (err) { console.error(`❌ Error loading command ${file}:`, err); } } } catch (err) { console.error('❌ Error loading commands:', err); } }; 

const loadEventCommands = async () => { try { const eventsPath = path.join(__dirname, 'events'); const fs = require('fs'); if (!fs.existsSync(eventsPath)) { fs.mkdirSync(eventsPath, { recursive: true }); } const files = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js')); for (const file of files) { try { const event = require(`./events/${file}`); if (event.config && event.onStart) { global.GoatBot.eventCommands.set(event.config.name, event); console.log(`✅ Loaded event: ${event.config.name}`); } } catch (err) { console.error(`❌ Error loading event ${file}:`, err); } } } catch (err) { console.error('❌ Error loading events:', err); } };

io.on('connection', (socket) => { console.log('✅ Dashboard connected:', socket.id);
    socket.on('disconnect', () => { console.log('❌ Dashboard disconnected:', socket.id); });
    socket.on('command:execute', (data) => { console.log('📨 Command execution request:', data); });
    socket.on('bot:status', (callback) => { callback({ status: 'online', commands: global.GoatBot.commands.size, events: global.GoatBot.eventCommands.size, timestamp: new Date() }); });
});

const PORT = process.env.PORT || 3000;
loadCommands();
loadEventCommands();
server.listen(PORT, () => { console.log(`╔════════════════════════════════════════╗  ║         🐐 GOAT BOT V2 - ONLINE 🐐    ║  ║      Server running on port ${PORT}      ║  ║════════════════════════════════════════╝`); });

module.exports = { app, server, io };