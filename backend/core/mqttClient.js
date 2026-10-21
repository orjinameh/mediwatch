const mqtt = require('mqtt');
const { processVitals } = require('./processVitals');

function initMQTT() {
  if (!process.env.MQTT_BROKER) { console.log('[mqtt] disabled (MQTT_BROKER not set)'); return; }
  const client = mqtt.connect(process.env.MQTT_BROKER, {
    clientId: `mediwatch-${Date.now()}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 3000,
  });
  client.on('connect', () => {
    console.log('[mqtt] connected');
    client.subscribe('mediwatch/patient/+/vitals');
  });
  client.on('message', async (topic, payload) => {
    try {
      const patientId = topic.split('/')[2];
      const raw = JSON.parse(payload.toString());
      const r = await processVitals(patientId, raw);
      if (r.offline) return; // device off, reported as offline to clients
      if (r.error) console.warn(`[mqtt] dropped reading for ${patientId}: ${r.error}`);
    } catch (e) { console.error('[mqtt] message error:', e.message); }
  });
  client.on('error', e => console.error('[mqtt] error:', e.message));
}

module.exports = { initMQTT };
