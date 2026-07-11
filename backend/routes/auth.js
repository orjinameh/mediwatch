const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { Doctor } = require('../db/models');

const sign = (doc) => jwt.sign(
  { id: doc._id, email: doc.email, name: doc.name, role: doc.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    const exists = await Doctor.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const doc = await Doctor.create({ name, email: email.toLowerCase(), password: hashed, role: role || 'doctor' });
    const token = sign(doc);
    res.status(201).json({ success: true, data: { token, user: { id: doc._id, name: doc.name, email: doc.email, role: doc.role } } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });
    const doc = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doc) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, doc.password);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid email or password' });
    const token = sign(doc);
    res.json({ success: true, data: { token, user: { id: doc._id, name: doc.name, email: doc.email, role: doc.role } } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/auth/me  (verify token)
router.get('/me', require('../core/auth'), async (req, res) => {
  try {
    const doc = await Doctor.findById(req.user.id).select('-password').lean();
    if (!doc) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: doc });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/auth/change-password
router.post('/change-password', require('../core/auth'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    const doc = await Doctor.findById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, doc.password);
    if (!valid) return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    doc.password = await bcrypt.hash(newPassword, 10);
    await doc.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
