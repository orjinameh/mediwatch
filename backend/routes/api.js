const express = require('express');
const router = express.Router();
const { Patient, Vitals, Alert, AILog } = require('../db/models');
const { broadcastAIResponse } = require('../core/websocket');
const { calcNEWS2 } = require('../core/news2');

// ── PATIENTS ────────────────────────────────────────────────────────

// GET all active patients with their latest vitals
router.get('/patients', async (req, res) => {
try {
const patients = await Patient.find({ active: true }).lean();


// Attach latest vitals to each patient
const withVitals = await Promise.all(patients.map(async (p) => {
const latest = await Vitals.findOne({ patientId: p.patientId })
.sort({ timestamp: -1 }).lean();
return { ...p, latestVitals: latest };
}));

res.json({ success: true, data: withVitals });


} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// POST create a new patient
router.post('/patients', async (req, res) => {
try {
const patient = await Patient.create(req.body);
res.status(201).json({ success: true, data: patient });
} catch (err) {
res.status(400).json({ success: false, error: err.message });
}
});

// GET single patient
router.get('/patients/:patientId', async (req, res) => {
try {
const patient = await Patient.findOne({ patientId: req.params.patientId }).lean();
if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
res.json({ success: true, data: patient });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// ── VITALS ──────────────────────────────────────────────────────────

// GET vitals history for a patient (last N readings)
router.get('/vitals/:patientId', async (req, res) => {
try {
const limit = parseInt(req.query.limit) || 50;
const vitals = await Vitals.find({ patientId: req.params.patientId })
.sort({ timestamp: -1 }).limit(limit).lean();
res.json({ success: true, data: vitals });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// GET latest single reading for a patient
router.get('/vitals/:patientId/latest', async (req, res) => {
try {
const latest = await Vitals.findOne({ patientId: req.params.patientId })
.sort({ timestamp: -1 }).lean();
if (!latest) return res.status(404).json({ success: false, error: 'No vitals found' });
res.json({ success: true, data: latest });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// POST manual vitals entry (for testing without ESP32)
router.post('/vitals/:patientId', async (req, res) => {
try {
const news2 = calcNEWS2(req.body);
const reading = await Vitals.create({
patientId: req.params.patientId,
...req.body,
news2Score: news2.total,
news2Level: news2.level,
});
res.status(201).json({ success: true, data: reading, news2 });
} catch (err) {
res.status(400).json({ success: false, error: err.message });
}
});

// ── ALERTS ──────────────────────────────────────────────────────────

// GET all unacknowledged alerts
router.get('/alerts', async (req, res) => {
try {
const alerts = await Alert.find({ acknowledged: false })
.sort({ timestamp: -1 }).limit(100).lean();
res.json({ success: true, data: alerts });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// GET alerts for a specific patient
router.get('/alerts/:patientId', async (req, res) => {
try {
const alerts = await Alert.find({ patientId: req.params.patientId })
.sort({ timestamp: -1 }).limit(50).lean();
res.json({ success: true, data: alerts });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// PATCH acknowledge an alert
router.patch('/alerts/:alertId/acknowledge', async (req, res) => {
try {
const alert = await Alert.findByIdAndUpdate(
req.params.alertId,
{ acknowledged: true, acknowledgedBy: req.body.acknowledgedBy, acknowledgedAt: new Date() },
{ new: true }
);
if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
res.json({ success: true, data: alert });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// ── AI ASSISTANT DOCTOR ─────────────────────────────────────────────

// POST query the AI Assistant Doctor for a patient
router.post('/ai/:patientId', async (req, res) => {
try {
const { query, askedBy } = req.body;
const { patientId } = req.params;


// Get latest vitals
const vitals = await Vitals.findOne({ patientId }).sort({ timestamp: -1 }).lean();
if (!vitals) return res.status(404).json({ success: false, error: 'No vitals found for patient' });

// Get patient info
const patient = await Patient.findOne({ patientId }).lean();

// Build context for Claude
const news2 = calcNEWS2(vitals);
const systemPrompt = 
`You are the AI Assistant Doctor in the MediWatch hospital monitoring system. You are providing clinical decision support to nursing staff when a doctor is not immediately available.
Patient: ${patient?.name || patientId}
Condition: ${patient?.condition || 'Unknown'}
Current Vitals:

- Heart Rate: ${vitals.heartRate} bpm
- SpO2: ${vitals.spo2}%
- Blood Pressure: ${vitals.systolic}/${vitals.diastolic} mmHg
- Respiratory Rate: ${vitals.respRate} breaths/min
- Temperature: ${vitals.temperature}°C
- NEWS2 Score: ${vitals.news2Score} (${vitals.news2Level})
- Abnormal Parameters: ${news2.abnormal.length ? news2.abnormal.join(', ') : 'None'}

Rules:

- Give clear, actionable first-response guidance appropriate for nursing staff
- Always recommend contacting the doctor urgently for NEWS2 ≥ 7
- Do not prescribe medications or make definitive diagnoses
- Be concise and clinically accurate`;

// Call Anthropic Claude API
// const response = await fetch('https://api.anthropic.com/v1/messages', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'x-api-key': process.env.ANTHROPIC_API_KEY,
//     'anthropic-version': '2023-06-01'
//   },
//   body: JSON.stringify({
//     model: 'claude-sonnet-4-20250514',
//     max_tokens: 1000,
//     system: systemPrompt,
//     messages: [{ role: 'user', content: query }],
//   }),
// });

// const aiData = await response.json();
// console.log('Anthropic raw response:', JSON.stringify(aiData, null, 2)); // ← add this
// const aiText = aiData.content?.[0]?.text || 'No response from AI.';
// TEMPORARY - free test using Groq API (free tier)
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ],
  }),
});
const aiData = await response.json();
const aiText = aiData.choices?.[0]?.message?.content || 'No response from AI.';
// console.log('Groq raw response:', JSON.stringify(aiData, null, 2));

// Log to MongoDB
await AILog.create({
patientId,
query,
response: aiText,
vitalsSnapshot: vitals,
news2Score: vitals.news2Score,
queryBy: askedBy || 'nurse',
});

// Broadcast AI response via WebSocket to subscribed clients
broadcastAIResponse(patientId, { query, response: aiText, news2Score: vitals.news2Score });

res.json({ success: true, data: { response: aiText, news2Score: vitals.news2Score } });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// GET AI interaction history for a patient
router.get('/ai/:patientId/history', async (req, res) => {
try {
const logs = await AILog.find({ patientId: req.params.patientId })
.sort({ timestamp: -1 }).limit(20).lean();
res.json({ success: true, data: logs });
} catch (err) {
res.status(500).json({ success: false, error: err.message });
}
});

// ── WEBSOCKET STATS ─────────────────────────────────────────────────
router.get('/ws/stats', (req, res) => {
const { getStats } = require('../core/websocket');
res.json({ success: true, data: getStats() });
});

module.exports = router;