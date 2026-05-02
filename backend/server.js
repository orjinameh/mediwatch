require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./db/connection');
const { initWebSocket } = require('./core/websocket');
const { initMQTT } = require('./core/mqqtClient');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// ── MIDDLEWARE ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── ROUTES ───────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
res.json({
status: 'ok',
service: 'MediWatch AI Backend',
timestamp: new Date().toISOString(),
});
});

// ── START ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
// 1. Connect MongoDB
await connectDB();

// 2. Start HTTP + WebSocket server
server.listen(PORT, () => {
console.log(`🚀 MediWatch Backend running on port ${PORT}`);
console.log(`📡 WebSocket: ws://localhost:${PORT}`);
console.log(`🌐 REST API: http://localhost:${PORT}/api`);
});

// 3. Init WebSocket (attached to same HTTP server — same port!)
initWebSocket(server);

// 4. Connect MQTT
initMQTT();
}

start().catch((err) => {
console.error('❌ Failed to start server:', err);
process.exit(1);
});