const router = require('express').Router();
const auth   = require('../core/auth');
const { calcNEWS2 } = require('../core/news2');
const { broadcastAIResponse } = require('../core/websocket');
const { Patient, Vitals, Alert, AILog } = require('../db/models');
const { randomUUID } = require('crypto');

// ── PATIENTS ───────────────────────────────────────────────────────
router.get('/patients', auth, async (req, res) => {
  try {
    const patients = await Patient.find({ active: true }).lean();
    const withVitals = await Promise.all(patients.map(async p => {
      const latest = await Vitals.findOne({ patientId: p.patientId }).sort({ timestamp: -1 }).lean();
      return { ...p, latestVitals: latest };
    }));
    res.json({ success: true, data: withVitals });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/patients', auth, async (req, res) => {
  try {
    const patientId = `P${Date.now().toString().slice(-6)}`;
    const patient = await Patient.create({ ...req.body, patientId, assignedDoctor: req.user.id });
    res.status(201).json({ success: true, data: patient });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/patients/:patientId', auth, async (req, res) => {
  try {
    const p = await Patient.findOne({ patientId: req.params.patientId }).lean();
    if (!p) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, data: p });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/patients/:patientId', auth, async (req, res) => {
  try {
    const p = await Patient.findOneAndUpdate({ patientId: req.params.patientId }, req.body, { new: true });
    if (!p) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, data: p });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/patients/:patientId', auth, async (req, res) => {
  try {
    await Patient.findOneAndUpdate({ patientId: req.params.patientId }, { active: false });
    res.json({ success: true, message: 'Patient deactivated' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── VITALS ─────────────────────────────────────────────────────────
router.get('/vitals/:patientId', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const vitals = await Vitals.find({ patientId: req.params.patientId }).sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ success: true, data: vitals });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/vitals/:patientId/latest', auth, async (req, res) => {
  try {
    const v = await Vitals.findOne({ patientId: req.params.patientId }).sort({ timestamp: -1 }).lean();
    if (!v) return res.status(404).json({ success: false, error: 'No vitals found' });
    res.json({ success: true, data: v });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Manual vitals entry (for testing without ESP32)
router.post('/vitals/:patientId', auth, async (req, res) => {
  try {
    const news2 = calcNEWS2(req.body);
    const v = await Vitals.create({ patientId: req.params.patientId, ...req.body, news2Score: news2.total, news2Level: news2.level });
    res.status(201).json({ success: true, data: v, news2 });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

// ── ALERTS ─────────────────────────────────────────────────────────
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = await Alert.find({ acknowledged: false }).sort({ timestamp: -1 }).limit(100).lean();
    res.json({ success: true, data: alerts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/alerts/:patientId', auth, async (req, res) => {
  try {
    const alerts = await Alert.find({ patientId: req.params.patientId }).sort({ timestamp: -1 }).limit(50).lean();
    res.json({ success: true, data: alerts });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch('/alerts/:alertId/acknowledge', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.alertId,
      { acknowledged: true, acknowledgedBy: req.user.name, acknowledgedAt: new Date() },
      { new: true });
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── AI ASSISTANT DOCTOR ────────────────────────────────────────────
router.post('/ai/:patientId', auth, async (req, res) => {
  try {
    const { query, askedBy } = req.body;
    const { patientId } = req.params;
    const vitals  = await Vitals.findOne({ patientId }).sort({ timestamp: -1 }).lean();
    const patient = await Patient.findOne({ patientId }).lean();
    if (!vitals) return res.status(404).json({ success: false, error: 'No vitals found for patient' });
    const news2 = calcNEWS2(vitals);

    const systemPrompt = `You are the AI Assistant Doctor in MediWatch, a hospital patient monitoring system. You provide clinical decision support to nursing staff when a doctor is not immediately available.

Patient: ${patient?.name || patientId} | Condition: ${patient?.condition || 'Unknown'} | Age: ${patient?.age || '—'} | Gender: ${patient?.gender || '—'}

Current Vitals:
- Heart Rate: ${vitals.heartRate} bpm
- SpO2: ${vitals.spo2}%
- Blood Pressure: ${vitals.systolic}/${vitals.diastolic} mmHg
- Respiratory Rate: ${vitals.respRate} breaths/min
- Temperature: ${vitals.temperature}°C
- NEWS2 Score: ${vitals.news2Score} (${vitals.news2Level})
- Abnormal Parameters: ${news2.abnormal.length ? news2.abnormal.join(', ') : 'None'}

Rules:
- Be concise and clinically accurate
- Give actionable first-response guidance appropriate for nursing staff
- Always recommend contacting doctor urgently for NEWS2 ≥ 7
- Never prescribe medications or make definitive diagnoses
- If NEWS2 is CRITICAL, start your response with ⚠️ URGENT`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: systemPrompt, messages: [{ role: 'user', content: query }] }),
    });
    const aiData = await response.json();
    let aiText = aiData.content?.[0]?.text;

    // Fallback to Groq
    if (!aiText && process.env.GROQ_API_KEY) {
      const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }] }),
      });
      const grData = await gr.json();
      aiText = grData.choices?.[0]?.message?.content;
    }

    aiText = aiText || 'Unable to get AI response. Please contact the doctor directly.';
    await AILog.create({ patientId, query, response: aiText, vitalsSnapshot: vitals, news2Score: vitals.news2Score, queryBy: askedBy || 'nurse' });
    broadcastAIResponse(patientId, { query, response: aiText, news2Score: vitals.news2Score });
    res.json({ success: true, data: { response: aiText, news2Score: vitals.news2Score } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/ai/:patientId/history', auth, async (req, res) => {
  try {
    const logs = await AILog.find({ patientId: req.params.patientId }).sort({ timestamp: -1 }).limit(20).lean();
    res.json({ success: true, data: logs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
