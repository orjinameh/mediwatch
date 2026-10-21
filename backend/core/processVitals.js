const { calcNEWS2 } = require('./news2');
const { broadcastVitals, broadcastAlert, broadcastDeviceOffline } = require('./websocket');
const { Vitals, Alert, Patient } = require('../db/models');

const RANGES = {
  heartRate:   [20, 300],
  spo2:        [50, 100],
  temperature: [25, 45],
  respRate:    [2, 80],
  systolic:    [40, 300],
  diastolic:   [20, 200],
};

// Keep only known numeric fields; report anything out of range instead of storing it
function sanitize(raw = {}) {
  const data = {};
  const invalid = [];
  for (const [f, [min, max]] of Object.entries(RANGES)) {
    if (raw[f] === undefined || raw[f] === null || raw[f] === '') continue;
    const n = Number(raw[f]);
    if (!Number.isFinite(n) || n < min || n > max) invalid.push(f); else data[f] = n;
  }
  if (Array.isArray(raw.ecgWaveform)) {
    const w = raw.ecgWaveform.slice(0, 5000).map(Number);
    if (w.every(Number.isFinite)) data.ecgWaveform = w; else invalid.push('ecgWaveform');
  }
  return { data, invalid };
}

const VITAL_KEYS = Object.keys(RANGES);

// When the device is switched off or the probes are not on the patient, it reports 0 on every vital probe.
// (Temperature is ignored: it keeps reading the room.) That means "device offline", not a patient value.
const PROBES = ['heartRate', 'spo2', 'systolic', 'diastolic', 'respRate'];
const isDeviceOff = (raw = {}) => {
  const present = PROBES.filter(k => raw[k] !== undefined && raw[k] !== null && raw[k] !== '');
  return present.length > 0 && present.every(k => Number(raw[k]) === 0);
};
// Mongo filter that skips any "all zeros" reading that was stored before this rule existed
const NOT_DEVICE_OFF = { $nor: [{ heartRate: 0, spo2: 0, systolic: 0, diastolic: 0, respRate: 0 }] };

// Shared by MQTT and the REST endpoint: validate, score, store, broadcast, alert
async function processVitals(patientId, raw) {
  const patient = await Patient.findOne({ patientId, active: true }).lean();
  if (!patient) return { error: 'Patient not found', status: 404 };

  // All-zero reading = device off. Do not store, score or alert; tell the clients it is offline.
  if (isDeviceOff(raw)) {
    broadcastDeviceOffline(patientId);
    return { offline: true };
  }

  const { data, invalid } = sanitize(raw);
  if (invalid.length) return { error: `Invalid values: ${invalid.join(', ')}`, status: 400, invalid };
  if (!VITAL_KEYS.some(k => data[k] !== undefined)) return { error: 'No valid vitals in reading', status: 400 };

  const news2 = calcNEWS2(data);
  const reading = await Vitals.create({ ...data, patientId, news2Score: news2.total, news2Level: news2.level });
  const payload = { ...reading.toObject(), news2 };
  broadcastVitals(patientId, payload);

  if (news2.total >= 5 || news2.red) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await Alert.findOne({ patientId, timestamp: { $gte: fiveMinAgo }, level: news2.level, acknowledged: false });
    if (!recent) {
      const alert = await Alert.create({
        patientId, level: news2.level, news2Score: news2.total,
        triggerVital: news2.abnormal[0] || 'Multiple vitals',
        message: `NEWS2 score ${news2.total} (${news2.level}). Abnormal: ${news2.abnormal.join(', ')}`,
      });
      broadcastAlert(patientId, { alertId: alert._id, _id: alert._id, patientId, level: alert.level, news2Score: alert.news2Score, message: alert.message, abnormal: news2.abnormal, timestamp: alert.timestamp });
    }
  }
  return { reading, news2 };
}

module.exports = { processVitals, sanitize, isDeviceOff, NOT_DEVICE_OFF };
