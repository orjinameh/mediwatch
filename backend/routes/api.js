const router = require('express').Router();
const auth   = require('../core/auth');
const { calcNEWS2 } = require('../core/news2');
const { processVitals } = require('../core/processVitals');
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
      { $match: { patientId: { $in: ids } } },
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
    const vitals = await Vitals.find({ patientId: req.params.patientId }).select('-ecgWaveform').sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ success: true, data: vitals });
  } catch (e) { fail(res, e); }
});

router.get('/vitals/:patientId/latest', auth, async (req, res) => {
  try {
    const v = await Vitals.findOne({ patientId: req.params.patientId }).sort({ timestamp: -1 }).lean();
    if (!v) return res.status(404).json({ success: false, error: 'No vitals found' });
    res.json({ success: true, data: v });
  } catch (e) { fail(res, e); }
});

// Manual vitals entry (same pipeline as MQTT: validate, score, store, broadcast, alert)
router.post('/vitals/:patientId', auth, async (req, res) => {
  try {
    const r = await processVitals(req.params.patientId, req.body);
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
    const vitals = await Vitals.findOne({ patientId }).sort({ timestamp: -1 }).lean();
    if (!vitals) return res.status(404).json({ success: false, error: 'No vitals found for patient' });

    const news2 = calcNEWS2(vitals);
    const ageMin = Math.round((Date.now() - new Date(vitals.timestamp).getTime()) / 60000);
    const show = (x, unit) => (typeof x === 'number' ? `${x}${unit}` : 'not measured');

    const systemPrompt = `You are the AI Assistant Doctor in MediWatch, a hospital patient monitoring system. You provide clinical decision support to nursing staff when a doctor is not immediately available.

Patient: ${patient.name} | Condition: ${patient.condition || 'Unknown'} | Age: ${patient.age || 'unknown'} | Gender: ${patient.gender || 'unknown'}

Latest vitals (recorded ${ageMin} minute${ageMin === 1 ? '' : 's'} ago${ageMin > 5 ? ' - THESE READINGS MAY BE OUT OF DATE, tell the nurse to check the patient and the device' : ''}):
- Heart Rate: ${show(vitals.heartRate, ' bpm')}
- SpO2: ${show(vitals.spo2, '%')}
- Blood Pressure: ${show(vitals.systolic, '')}/${show(vitals.diastolic, '')} mmHg
- Respiratory Rate: ${show(vitals.respRate, ' breaths/min')}
- Temperature: ${show(vitals.temperature, '°C')}
- NEWS2 Score: ${news2.total} (${news2.level})
- Abnormal Parameters: ${news2.abnormal.length ? news2.abnormal.join(', ') : 'None'}

Rules:
- Be concise and clinically accurate
- Give actionable first-response guidance appropriate for nursing staff
- Always recommend contacting a doctor urgently for NEWS2 >= 7
- Never prescribe medications or make definitive diagnoses
- If NEWS2 is CRITICAL, start your response with "URGENT:"`;

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
