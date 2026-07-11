require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const { connectDB } = require('./db/models');
const { initWebSocket } = require('./core/websocket');
const { initMQTT }     = require('./core/mqttClient');
const authRoutes = require('./routes/auth');
const apiRoutes  = require('./routes/api');

const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api',      apiRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'MediWatch AI Backend', time: new Date().toISOString() }));

// Keep-alive for Render free tier
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => {
    fetch(`${process.env.RENDER_EXTERNAL_URL}/health`).catch(() => {});
  }, 10 * 60 * 1000);
}

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 MediWatch Backend running on port ${PORT}`);
    console.log(`📡 WebSocket: ws://mediwatch-backend.onrender.com`);
    console.log(`🌐 REST API:  https://mediwatch-backend.onrender.com/api`);
  });
  initWebSocket(server);
  initMQTT();
}

start().catch(e => { console.error('❌ Failed to start:', e); process.exit(1); });
