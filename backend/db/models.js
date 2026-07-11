const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (e) {
    console.error('❌ MongoDB Error:', e.message);
    process.exit(1);
  }
};

// ── DOCTOR / USER ─────────────────────────────────────────────────
const DoctorSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['doctor', 'nurse', 'admin'], default: 'doctor' },
  avatar:   { type: String },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

// ── PATIENT ───────────────────────────────────────────────────────
const PatientSchema = new mongoose.Schema({
  patientId:   { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  age:         { type: Number },
  gender:      { type: String, enum: ['Male', 'Female', 'Other'] },
  condition:   { type: String, default: 'General Admission' },
  ward:        { type: String, default: 'General' },
  roomNumber:  { type: String },
  phone:       { type: String },
  emergencyContact: { type: String },
  bloodGroup:  { type: String },
  admitted:    { type: Date, default: Date.now },
  active:      { type: Boolean, default: true },
  assignedDoctor: { type: String },
}, { timestamps: true });

// ── VITALS ────────────────────────────────────────────────────────
const VitalsSchema = new mongoose.Schema({
  patientId:   { type: String, required: true, index: true },
  timestamp:   { type: Date, default: Date.now, index: true },
  heartRate:   { type: Number },
  spo2:        { type: Number },
  temperature: { type: Number },
  respRate:    { type: Number },
  systolic:    { type: Number },
  diastolic:   { type: Number },
  ecgWaveform: { type: [Number], default: [] },
  news2Score:  { type: Number },
  news2Level:  { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
});

// ── ALERT ─────────────────────────────────────────────────────────
const AlertSchema = new mongoose.Schema({
  patientId:    { type: String, required: true, index: true },
  timestamp:    { type: Date, default: Date.now },
  level:        { type: String, enum: ['MEDIUM', 'HIGH', 'CRITICAL'] },
  news2Score:   { type: Number },
  triggerVital: { type: String },
  message:      { type: String },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date },
});

// ── AI LOG ────────────────────────────────────────────────────────
const AILogSchema = new mongoose.Schema({
  patientId:      { type: String, required: true, index: true },
  timestamp:      { type: Date, default: Date.now },
  query:          { type: String },
  response:       { type: String },
  vitalsSnapshot: { type: Object },
  news2Score:     { type: Number },
  queryBy:        { type: String, default: 'nurse' },
});

module.exports = {
  connectDB,
  Doctor:  mongoose.models.Doctor  || mongoose.model('Doctor', DoctorSchema),
  Patient: mongoose.models.Patient || mongoose.model('Patient', PatientSchema),
  Vitals:  mongoose.models.Vitals  || mongoose.model('Vitals', VitalsSchema),
  Alert:   mongoose.models.Alert   || mongoose.model('Alert', AlertSchema),
  AILog:   mongoose.models.AILog   || mongoose.model('AILog', AILogSchema),
};
