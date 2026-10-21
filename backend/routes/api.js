const router = require('express').Router();
const auth   = require('../core/auth');
const { calcNEWS2 } = require('../core/news2');
const { processVitals, sanitize, NOT_DEVICE_OFF } = require('../core/processVitals');
const { broadcastAIResponse } = require('../core/websocket');
const { Patient, Vitals, Alert, AILog } = require('../db/models');

const PATIENT_FIELDS = ['name', 'age', 'gender', 'condition', 'ward', 'roomNumber', 'phone', 'emergencyContact', 'bloodGroup'];
const pick = (obj = {}, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));
const fail = (res, e, status = 500) => res.status(status).json({ success: false, error: e.message });

// ── PATIENTS ───────────────────────────────────────────────────────
router.get('/patients', auth, async (req, res) => {
  try {
    const patients = await Patient.find({ active: true }).lean();
    const ids = patients.map(p => p.patientId);
    const latest = await Vitals.aggregate([
      { $match: { patientId: { $in: ids }, ...NOT_DEVICE_OFF } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$patientId', doc: { $first: '$$ROOT' } } },
      { $project: { 'doc.ecgWaveform': 0 } },
    ]);
    const byId = Object.fromEntries(latest.map(l => [l._id, l.doc]));
    res.json({ success: true, data: patients.map(p => ({ ...p, latestVitals: byId[p.patientId] || null })) });
  } catch (e) { fail(res, e); }
});

router.post('/patients', auth, async (req, res) => {
  try {
    const body = pick(req.body, PATIENT_FIELDS);
    if (!String(body.name || '').trim()) return res.status(400).json({ success: false, error: 'Patient name is required' });
    const patientId = `P${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10)}`;
    const patient = await Patient.create({ ...body, name: String(body.name).trim(), patientId, assignedDoctor: req.user.id });
    res.status(201).json({ success: true, data: patient });
  } catch (e) { fail(res, e, 400); }
});

router.get('/patients/:patientId', auth, async (req, res) => {
  try {
    const p = await Patient.findOne({ patientId: req.params.patientId, active: true }).lean();
    if (!p) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, data: p });
  } catch (e) { fail(res, e); }
});

router.put('/patients/:patientId', auth, async (req, res) => {
  try {
    const p = await Patient.findOneAndUpdate({ patientId: req.params.patientId, active: true }, pick(req.body, PATIENT_FIELDS), { new: true, runValidators: true });
    if (!p) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, data: p });
  } catch (e) { fail(res, e, 400); }
});

router.delete('/patients/:patientId', auth, async (req, res) => {
  try {
    await Patient.findOneAndUpdate({ patientId: req.params.patientId }, { active: false });
    res.json({ success: true, message: 'Patient deactivated' });
  } catch (e) { fail(res, e); }
});

// ── VITALS ─────────────────────────────────────────────────────────
router.get('/vitals/:patientId', auth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);
    const vitals = await Vitals.find({ patientId: req.params.patientId, ...NOT_DEVICE_OFF }).select('-ecgWaveform').sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ success: true, data: vitals });
  } catch (e) { fail(res, e); }
});

router.get('/vitals/:patientId/latest', auth, async (req, res) => {
  try {
    const v = await Vitals.findOne({ patientId: req.params.patientId, ...NOT_DEVICE_OFF }).sort({ timestamp: -1 }).lean();
    if (!v) return res.status(404).json({ success: false, error: 'No vitals found' });
    res.json({ success: true, data: v });
  } catch (e) { fail(res, e); }
});

// Manual vitals entry (same pipeline as MQTT: validate, score, store, broadcast, alert)
router.post('/vitals/:patientId', auth, async (req, res) => {
  try {
    const r = await processVitals(req.params.patientId, req.body);
    if (r.offline) return res.json({ success: true, offline: true, message: 'All probes read 0: device treated as offline, reading not stored' });
    if (r.error) return res.status(r.status).json({ success: false, error: r.error });
    res.status(201).json({ success: true, data: r.reading, news2: r.news2 });
  } catch (e) { fail(res, e, 400); }
});

// ── ALERTS ─────────────────────────────────────────────────────────
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = await Alert.find({ acknowledged: false }).sort({ timestamp: -1 }).limit(100).lean();
    res.json({ success: true, data: alerts });
  } catch (e) { fail(res, e); }
});

router.get('/alerts/:patientId', auth, async (req, res) => {
  try {
    const alerts = await Alert.find({ patientId: req.params.patientId }).sort({ timestamp: -1 }).limit(50).lean();
    res.json({ success: true, data: alerts });
  } catch (e) { fail(res, e); }
});

router.patch('/alerts/:alertId/acknowledge', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.alertId,
      { acknowledged: true, acknowledgedBy: req.user.name, acknowledgedAt: new Date() },
      { new: true });
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (e) { fail(res, e, 400); }
});

// ── AI ASSISTANT (Groq) ────────────────────────────────────────────
router.post('/ai/:patientId', auth, async (req, res) => {
  try {
    const query = String(req.body.query || '').trim().slice(0, 1000);
    if (!query) return res.status(400).json({ success: false, error: 'A question is required' });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ success: false, error: 'AI is not configured (GROQ_API_KEY missing)' });

    const { patientId } = req.params;
    const patient = await Patient.findOne({ patientId, active: true }).lean();
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    const vitals = await Vitals.findOne({ patientId, ...NOT_DEVICE_OFF }).sort({ timestamp: -1 }).lean();
    if (!vitals) return res.status(404).json({ success: false, error: 'No vitals found for patient' });

    // Readings stored before validation existed (or sensor faults) can contain impossible values such as 0 bpm.
    // Score only plausible values and tell the model which ones were rejected.
    const { data: plausible, invalid } = sanitize(vitals);
    const news2 = calcNEWS2(plausible);
    const ageMs = Date.now() - new Date(vitals.timestamp).getTime();
    const deviceOffline = ageMs > 15000;   // same rule as the apps: no new reading for 15s = offline
    const ageMin = Math.round(ageMs / 60000);
    const show = (x, unit) => (typeof x === 'number' ? `${x}${unit}` : 'not measured');

    const systemPrompt = `You are the AI Assistant Doctor in MediWatch, a hospital patient monitoring system. You provide clinical decision support to nursing staff when a doctor is not immediately available.

Patient: ${patient.name} | Condition: ${patient.condition || 'Unknown'} | Age: ${patient.age || 'unknown'} | Gender: ${patient.gender || 'unknown'}

${deviceOffline ? `DEVICE STATUS: OFFLINE. The monitoring device is not sending data (last valid reading ${ageMin < 1 ? 'under a minute' : `${ageMin} minute${ageMin === 1 ? '' : 's'}`} ago). The patient's current condition is UNKNOWN. Say this clearly at the start of your answer, do not describe the patient as stable or in danger based on old numbers, and tell the nurse to assess the patient at the bedside, take manual measurements and check that the device is on and the probes are attached.\n\n` : 'DEVICE STATUS: ONLINE\n\n'}${deviceOffline ? 'Last valid vitals' : 'Latest vitals'}:
- Heart Rate: ${show(plausible.heartRate, ' bpm')}
- SpO2: ${show(plausible.spo2, '%')}
- Blood Pressure: ${show(plausible.systolic, '')}/${show(plausible.diastolic, '')} mmHg
- Respiratory Rate: ${show(plausible.respRate, ' breaths/min')}
- Temperature: ${show(plausible.temperature, '°C')}
- NEWS2 Score: ${news2.total} (${news2.level})
- Abnormal Parameters: ${news2.abnormal.length ? news2.abnormal.join(', ') : 'None'}
${invalid.length ? `- IMPLAUSIBLE VALUES IGNORED (${invalid.map(f => `${f}=${vitals[f]}`).join(', ')}): treat these as a probe fault, not as real patient values, and tell the nurse to check that probe.\n` : ''}
Rules:
- Be concise and clinically accurate
- Give actionable first-response guidance appropriate for nursing staff
- Always recommend contacting a doctor urgently for NEWS2 >= 7
- Never prescribe medications or make definitive diagnoses
- If the device is OFFLINE, start your response with "DEVICE OFFLINE:" and do not give a risk assessment from the old numbers
- If NEWS2 is CRITICAL and the device is ONLINE, start your response with "URGENT:"
- Format: short sections, each with a bold heading line, then bullet points. No tables. Keep it under 250 words.`;

    const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        reasoning_effort: 'low',
        max_tokens: 2000,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }],
      }),
    });
    const grData = await gr.json().catch(() => ({}));
    if (!gr.ok) {
      console.error('[ai] Groq error:', gr.status, JSON.stringify(grData));
      return res.status(502).json({ success: false, error: grData?.error?.message || 'AI service error' });
    }
    const aiText = grData.choices?.[0]?.message?.content?.trim();
    if (!aiText) return res.status(502).json({ success: false, error: 'AI returned an empty response. Please try again or contact the doctor directly.' });

    await AILog.create({ patientId, query, response: aiText, vitalsSnapshot: vitals, news2Score: news2.total, queryBy: req.user.name || req.user.role || 'staff' });
    broadcastAIResponse(patientId, { query, response: aiText, news2Score: news2.total });
    res.json({ success: true, data: { response: aiText, news2Score: news2.total } });
  } catch (e) { fail(res, e); }
});

router.get('/ai/:patientId/history', auth, async (req, res) => {
  try {
    const logs = await AILog.find({ patientId: req.params.patientId }).select('-vitalsSnapshot').sort({ timestamp: -1 }).limit(20).lean();
    res.json({ success: true, data: logs });
  } catch (e) { fail(res, e); }
});

module.exports = router;
