const pool   = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// ── Admin Login ───────────────────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  const { email, password, college_id } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email=?', [email.trim().toLowerCase()]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const admin = rows[0];
    if (college_id && Number(college_id) !== admin.college_id)
      return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken({ id: admin.id, role: 'admin', college_id: admin.college_id });
    const { password: _, ...adminData } = admin;
    res.json({ token, user: adminData, role: 'admin' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Student Login ─────────────────────────────────────────────────────────
exports.studentLogin = async (req, res) => {
  const { email, password, college_id } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const [rows] = await pool.query('SELECT * FROM students WHERE email=?', [email.trim().toLowerCase()]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const student = rows[0];
    if (college_id && Number(college_id) !== student.college_id)
      return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, student.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken({ id: student.id, role: 'student', college_id: student.college_id });
    const { password: _, ...studentData } = student;
    res.json({ token, user: studentData, role: 'student' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Faculty Login ────────────────────────────────────────────────────────
exports.facultyLogin = async (req, res) => {
  const { email, password, college_id } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const [rows] = await pool.query('SELECT * FROM faculty WHERE email=?', [email.trim().toLowerCase()]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const faculty = rows[0];
    if (college_id && Number(college_id) !== faculty.college_id)
      return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, faculty.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signToken({ id: faculty.id, role: 'faculty', college_id: faculty.college_id });
    const { password: _, ...facultyData } = faculty;
    res.json({ token, user: facultyData, role: 'faculty' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Get Me ────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const table = req.user.role === 'admin' ? 'admins' : req.user.role === 'faculty' ? 'faculty' : 'students';
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id=?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    const { password: _, ...userData } = rows[0];
    res.json({ user: userData, role: req.user.role });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Forgot Password ───────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const [rows] = await pool.query('SELECT id, name, email FROM students WHERE email=?', [email.trim().toLowerCase()]);
    if (!rows.length) return res.status(404).json({ message: 'No student found with this email' });
    const student = rows[0];

    // Delete old tokens for this student
    await pool.query('DELETE FROM password_reset_tokens WHERE student_id=?', [student.id]);

    // Create new token (expires in 15 min)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query(
      'INSERT INTO password_reset_tokens (student_id, token, expires_at) VALUES (?,?,?)',
      [student.id, token, expiresAt]
    );

    res.json({ token, studentName: student.name, email: student.email });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Validate Reset Token ──────────────────────────────────────────────────
exports.validateResetToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token required' });
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s.email FROM password_reset_tokens t
       JOIN students s ON t.student_id=s.id
       WHERE t.token=? AND t.used=0 AND t.expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired reset link' });
    res.json({ valid: true, email: rows[0].email, studentId: rows[0].student_id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Reset Password ────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s.name, s.email FROM password_reset_tokens t
       JOIN students s ON t.student_id=s.id
       WHERE t.token=? AND t.used=0 AND t.expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired reset link' });
    const { student_id, name, email } = rows[0];

    const hashed = await bcrypt.hash(password, 10);
    await pool.query('UPDATE students SET password=? WHERE id=?', [hashed, student_id]);
    await pool.query('UPDATE password_reset_tokens SET used=1 WHERE token=?', [token]);

    // Log the reset
    await pool.query(
      'INSERT INTO password_reset_logs (student_id, student_name, email) VALUES (?,?,?)',
      [student_id, name, email]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Reset Logs (admin) ────────────────────────────────────────────────────
exports.getResetLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.* FROM password_reset_logs l
       JOIN students s ON l.student_id=s.id
       WHERE s.college_id=? ORDER BY l.reset_at DESC`,
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
