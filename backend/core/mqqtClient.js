const mqtt = require('mqtt');
const { calcNEWS2 } = require('./news2');
const { broadcastVitals, broadcastAlert } = require('./websocket');
const { Vitals, Alert } = require('../db/models');

function initMQTT() {
  if (!process.env.MQTT_BROKER) { console.log('⚠️  MQTT disabled'); return; }
  const client = mqtt.connect(process.env.MQTT_BROKER, {
    clientId: `mediwatch-${Date.now()}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 3000,
  });
  client.on('connect', () => {
    console.log('✅ MQTT connected');
    client.subscribe('mediwatch/patient/+/vitals');
  });
  client.on('message', async (topic, payload) => {
    try {
      const patientId = topic.split('/')[2];
      const raw = JSON.parse(payload.toString());
      const news2 = calcNEWS2(raw);
      const reading = { patientId, ...raw, news2Score: news2.total, news2Level: news2.level };
      await Vitals.create(reading);
      broadcastVitals(patientId, { ...reading, news2 });
      if (news2.total >= 5) {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recent = await Alert.findOne({ patientId, timestamp: { $gte: fiveMinAgo }, level: news2.level });
        if (!recent) {
          const alert = await Alert.create({ patientId, level: news2.level, news2Score: news2.total, triggerVital: news2.abnormal[0] || 'Multiple vitals', message: `NEWS2 score ${news2.total} (${news2.level}). Abnormal: ${news2.abnormal.join(', ')}` });
          broadcastAlert(patientId, { alertId: alert._id, level: alert.level, news2Score: alert.news2Score, message: alert.message, abnormal: news2.abnormal });
        }
      }
    } catch (e) { console.error('MQTT message error:', e.message); }
  });
  client.on('error', e => console.error('❌ MQTT error:', e.message));
}

module.exports = { initMQTT };
