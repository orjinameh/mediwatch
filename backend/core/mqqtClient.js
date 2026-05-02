const mqtt = require('mqtt');
const { calcNEWS2 } = require('./news2');
const { broadcastVitals, broadcastAlert } = require('./websocket');
const { Vitals, Alert } = require('../db/models');

let client = null;

function initMQTT() {
client = mqtt.connect(process.env.MQTT_BROKER, {
  clientId: `mediwatch-backend-${Date.now()}`,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
});

client.on('connect', () => {
console.log('✅ MQTT connected to broker');
// Subscribe to all patient vitals topics
client.subscribe('mediwatch/patient/+/vitals', (err) => {
if (err) console.error('MQTT subscribe error:', err);
else console.log('📡 Subscribed to: mediwatch/patient/+/vitals');
});
});

client.on('message', async (topic, payload) => {
try {
// Extract patientId from topic: mediwatch/patient/{id}/vitals
const parts = topic.split('/');
const patientId = parts[2];


const vitals = JSON.parse(payload.toString());
await processVitals(patientId, vitals);
} catch (err) {
console.error('MQTT message processing error:', err.message);
}


});

client.on('error', (err) => console.error('❌ MQTT error:', err.message));
client.on('reconnect', () => console.log('🔄 MQTT reconnecting…'));
client.on('offline', () => console.log('⚠️ MQTT offline'));

return client;
}

/**

- Core pipeline: receives raw vitals → scores → saves → broadcasts
*/
async function processVitals(patientId, raw) {
// 1. Calculate NEWS2 score
const news2 = calcNEWS2(raw);

// 2. Build the full reading object
const reading = {
patientId,
heartRate: raw.heartRate,
spo2: raw.spo2,
temperature: raw.temperature,
respRate: raw.respRate,
systolic: raw.systolic,
diastolic: raw.diastolic,
ecgWaveform: raw.ecgWaveform || [],
news2Score: news2.total,
news2Level: news2.level,
};

// 3. Save to MongoDB
await Vitals.create(reading);

// 4. Broadcast live to WebSocket clients
broadcastVitals(patientId, {
...reading,
news2: news2,
});

// 5. Check alert thresholds
if (news2.total >= 5) {
await triggerAlert(patientId, news2, reading);
}
}

/**

- Create and broadcast an alert
*/
async function triggerAlert(patientId, news2, reading) {
// Avoid duplicate alerts: only fire if last alert was > 5 min ago
const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
const recentAlert = await Alert.findOne({
patientId,
timestamp: { $gte: fiveMinAgo },
level: news2.level,
});
if (recentAlert) return;

const alertDoc = await Alert.create({
patientId,
level: news2.level,
news2Score: news2.total,
triggerVital: news2.abnormal[0] || 'Multiple vitals',
message: `NEWS2 score ${news2.total} (${news2.level}). Abnormal: ${news2.abnormal.join(', ')}`,
});

console.log(`🚨 ALERT [${news2.level}] Patient ${patientId} — NEWS2: ${news2.total}`);

broadcastAlert(patientId, {
alertId: alertDoc._id,
level: alertDoc.level,
news2Score: alertDoc.news2Score,
message: alertDoc.message,
abnormal: news2.abnormal,
});
}

module.exports = { initMQTT };