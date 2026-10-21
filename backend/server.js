require('dotenv').config();
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const { connectDB } = require('./db/models');
const { initWebSocket } = require('./core/websocket');
const { initMQTT }     = require('./core/mqttClient');
const authRoutes = require('./routes/auth');
const apiRoutes  = require('./routes/api');

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is not set'); process.exit(1); }

const app    = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
// CORS_ORIGIN can be a comma-separated list; defaults to allowing any origin
const origins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : undefined));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api',      apiRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'MediWatch AI Backend', time: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  res.status(status).json({ success: false, error: status === 400 ? 'Invalid request body' : 'Server error' });
});

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
    console.log(`MediWatch backend running on port ${PORT}`);
    console.log(`REST API: /api   WebSocket: same port (token required)`);
  });
  initWebSocket(server);
  initMQTT();
}

start().catch(e => { console.error('Failed to start:', e); process.exit(1); });
