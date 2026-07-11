const { WebSocketServer, WebSocket } = require('ws');

let wss = null;
const clients = new Set();
const subscriptions = new Map();

function initWebSocket(server) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws, req) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'MediWatch WebSocket connected' }));
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'SUBSCRIBE_PATIENT') {
          if (!subscriptions.has(msg.patientId)) subscriptions.set(msg.patientId, new Set());
          subscriptions.get(msg.patientId).add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', patientId: msg.patientId }));
        }
        if (msg.type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }));
      } catch (_) {}
    });
    ws.on('close', () => {
      clients.delete(ws);
      for (const [pid, subs] of subscriptions.entries()) {
        subs.delete(ws);
        if (subs.size === 0) subscriptions.delete(pid);
      }
    });
    ws.on('error', () => clients.delete(ws));
  });
  console.log('✅ WebSocket server initialised');
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(typeof data === 'string' ? data : JSON.stringify(data)); } catch (_) {}
  }
}

function broadcastVitals(patientId, data) {
  const msg = JSON.stringify({ type: 'VITALS_UPDATE', patientId, timestamp: new Date().toISOString(), data });
  const targets = new Set([...(subscriptions.get(patientId) || []), ...(subscriptions.get('ALL') || [])]);
  targets.forEach(ws => send(ws, msg));
}

function broadcastAlert(patientId, data) {
  const msg = JSON.stringify({ type: 'ALERT', patientId, timestamp: new Date().toISOString(), data });
  clients.forEach(ws => send(ws, msg));
}

function broadcastAIResponse(patientId, data) {
  const msg = JSON.stringify({ type: 'AI_RESPONSE', patientId, timestamp: new Date().toISOString(), data });
  (subscriptions.get(patientId) || []).forEach(ws => send(ws, msg));
}

module.exports = { initWebSocket, broadcastVitals, broadcastAlert, broadcastAIResponse };
