const mongoose = require('mongoose');

// ── Patient ────────────────────────────────────────────────────────
const PatientSchema = new mongoose.Schema({
patientId: { type: String, required: true, unique: true },
name: { type: String, required: true },
age: { type: Number },
condition: { type: String, default: 'General Admission' },
ward: { type: String, default: 'General' },
admitted: { type: Date, default: Date.now },
active: { type: Boolean, default: true },
}, { timestamps: true });

// ── Vitals Reading ─────────────────────────────────────────────────
const VitalsSchema = new mongoose.Schema({
patientId: { type: String, required: true, index: true },
timestamp: { type: Date, default: Date.now, index: true },
heartRate: { type: Number }, // bpm
spo2: { type: Number }, // %
temperature: { type: Number }, // °C
respRate: { type: Number }, // breaths/min
systolic: { type: Number }, // mmHg
diastolic: { type: Number }, // mmHg
ecgWaveform: { type: [Number], default: [] }, // raw ECG samples
news2Score: { type: Number },
news2Level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
}, { timestamps: false });

// ── Alert ──────────────────────────────────────────────────────────
const AlertSchema = new mongoose.Schema({
patientId: { type: String, required: true, index: true },
timestamp: { type: Date, default: Date.now },
level: { type: String, enum: ['MEDIUM', 'HIGH', 'CRITICAL'] },
news2Score: { type: Number },
triggerVital:{ type: String }, // which vital triggered it
message: { type: String },
acknowledged:{ type: Boolean, default: false },
acknowledgedBy: { type: String },
acknowledgedAt: { type: Date },
}, { timestamps: false });

// ── AI Interaction Log ─────────────────────────────────────────────
const AILogSchema = new mongoose.Schema({
patientId: { type: String, required: true, index: true },
timestamp: { type: Date, default: Date.now },
query: { type: String },
response: { type: String },
vitalsSnapshot: { type: Object }, // vitals at time of query
news2Score: { type: Number },
queryBy: { type: String, default: 'nurse' },
}, { timestamps: false });

module.exports = {
Patient: mongoose.model('Patient', PatientSchema),
Vitals: mongoose.model('Vitals', VitalsSchema),
Alert: mongoose.model('Alert', AlertSchema),
AILog: mongoose.model('AILog', AILogSchema),
};