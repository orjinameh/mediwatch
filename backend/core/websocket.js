const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

// Map of patientId → Set of subscribed WebSocket clients
const subscriptions = new Map();
// All connected clients
const clients = new Set();

/**

- Initialize WebSocket server attached to the HTTP server
*/
function initWebSocket(httpServer) {
wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
console.log(`🔌 WebSocket client connected [${req.socket.remoteAddress}]`);
clients.add(ws);


// Send connection acknowledgement
ws.send(JSON.stringify({
type: 'CONNECTED',
message: 'MediWatch WebSocket connected',
timestamp: new Date().toISOString(),
}));

// Handle messages from the client (e.g. subscribe to a patient)
ws.on('message', (raw) => {
try {
const msg = JSON.parse(raw.toString());
handleClientMessage(ws, msg);
} catch (e) {
ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' }));
}
});

ws.on('close', () => {
console.log('🔌 WebSocket client disconnected');
clients.delete(ws);
// Remove from all patient subscriptions
for (const [pid, subs] of subscriptions.entries()) {
subs.delete(ws);
if (subs.size === 0) subscriptions.delete(pid);
}
});

ws.on('error', (err) => {
console.error('WebSocket error:', err.message);
clients.delete(ws);
});

});

console.log('✅ WebSocket server initialised');
return wss;
}

/**

- Handle messages sent from dashboard/mobile clients
*/
function handleClientMessage(ws, msg) {
switch (msg.type) {

// Client subscribes to a specific patient's live feed
case 'SUBSCRIBE_PATIENT': {
const pid = msg.patientId;
if (!pid) return;
if (!subscriptions.has(pid)) subscriptions.set(pid, new Set());
subscriptions.get(pid).add(ws);
ws.send(JSON.stringify({
type: 'SUBSCRIBED',
patientId: pid,
message: `Subscribed to patient ${pid}`,
}));
break;
}

// Client unsubscribes
case 'UNSUBSCRIBE_PATIENT': {
const pid = msg.patientId;
if (subscriptions.has(pid)) subscriptions.get(pid).delete(ws);
break;
}

// Ping keepalive
case 'PING': {
ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
break;
}

default:
ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${msg.type}` }));
}
}

/**

- Broadcast live vitals update to all subscribed clients for a patient
*/
function broadcastVitals(patientId, payload) {
const message = JSON.stringify({
type: 'VITALS_UPDATE',
patientId,
timestamp: new Date().toISOString(),
data: payload,
});

// Send to clients subscribed to this patient
if (subscriptions.has(patientId)) {
for (const ws of subscriptions.get(patientId)) {
sendSafe(ws, message);
}
}

// Also broadcast to clients subscribed to ALL patients (dashboard overview)
if (subscriptions.has('ALL')) {
for (const ws of subscriptions.get('ALL')) {
sendSafe(ws, message);
}
}
}

/**

- Broadcast an alert to ALL connected clients
*/
function broadcastAlert(patientId, alert) {
const message = JSON.stringify({
type: 'ALERT',
patientId,
timestamp: new Date().toISOString(),
data: alert,
});

// Alerts go to everyone — no subscription filter
for (const ws of clients) {
sendSafe(ws, message);
}
}

/**

- Broadcast AI Assistant Doctor response to subscribed clients
*/
function broadcastAIResponse(patientId, response) {
const message = JSON.stringify({
type: 'AI_RESPONSE',
patientId,
timestamp: new Date().toISOString(),
data: response,
});

if (subscriptions.has(patientId)) {
for (const ws of subscriptions.get(patientId)) {
sendSafe(ws, message);
}
}
}

/**

- Broadcast a system-wide message to all clients
*/
function broadcastSystem(message) {
const payload = JSON.stringify({
type: 'SYSTEM',
timestamp: new Date().toISOString(),
message,
});
for (const ws of clients) {
sendSafe(ws, payload);
}
}

/**

- Safe send — won't crash if client is disconnecting
*/
function sendSafe(ws, message) {
if (ws.readyState === WebSocket.OPEN) {
try {
ws.send(message);
} catch (e) {
console.error('WebSocket send error:', e.message);
}
}
}

function getStats() {
return {
connectedClients: clients.size,
activeSubscriptions: subscriptions.size,
};
}

module.exports = {
initWebSocket,
broadcastVitals,
broadcastAlert,
broadcastAIResponse,
broadcastSystem,
getStats,
};