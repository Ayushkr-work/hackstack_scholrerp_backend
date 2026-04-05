const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getStudents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,name,email,roll_no,department,semester,phone,created_at FROM students WHERE college_id=?',
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStudent = async (req, res) => {
  try {
    const id = req.user.role === 'student' ? req.user.id : req.params.id;
    const [rows] = await pool.query(
      'SELECT id,name,email,roll_no,department,semester,phone,address,college_id,created_at FROM students WHERE id=?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createStudent = async (req, res) => {
  const { name, email, password, roll_no, department, semester, phone, address } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Required fields missing' });

  try {
    const [existing] = await pool.query('SELECT id FROM students WHERE email=?', [email]);
    if (existing.length) return res.status(409).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO students (name,email,password,roll_no,department,semester,phone,address,college_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, email, hashed, roll_no, department, semester || 1, phone, address, req.user.college_id]
    );
    res.status(201).json({ message: 'Student created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  const { name, roll_no, department, semester, phone, address } = req.body;
  const id = req.user.role === 'student' ? req.user.id : req.params.id;

  try {
    await pool.query(
      'UPDATE students SET name=?,roll_no=?,department=?,semester=?,phone=?,address=? WHERE id=?',
      [name, roll_no, department, semester, phone, address, id]
    );
    res.json({ message: 'Student updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id=? AND college_id=?', [req.params.id, req.user.college_id]);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDepartmentStats = async (req, res) => {
  try {
    const cid = req.user.college_id;
    const [rows] = await pool.query(
      'SELECT department, COUNT(*) as count FROM students WHERE college_id=? GROUP BY department',
      [cid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAvgCgpa = async (req, res) => {
  try {
    const cid = req.user.college_id;
    const [rows] = await pool.query(
      `SELECT s.department,
        ROUND(AVG(r.marks),1) as avg_marks,
        ROUND(AVG(r.marks)/10,2) as avg_cgpa
       FROM results r
       JOIN students s ON r.student_id=s.id
       WHERE s.college_id=?
       GROUP BY s.department`,
      [cid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getSubjectAttendance = async (req, res) => {
  try {
    const cid = req.user.college_id;
    const [rows] = await pool.query(
      `SELECT r.subject,
        ROUND(AVG(r.marks),1) as avg_marks,
        COUNT(DISTINCT r.student_id) as students
       FROM results r
       JOIN students s ON r.student_id=s.id
       WHERE s.college_id=?
       GROUP BY r.subject
       ORDER BY avg_marks DESC`,
      [cid]
    );
    // simulate attendance as percentage based on avg marks performance
    const data = rows.map(r => ({
      subject: r.subject,
      attendance: Math.min(99, Math.round(60 + (r.avg_marks / 100) * 35)),
      students: r.students,
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT subject, semester, total_classes, attended FROM attendance WHERE student_id=? ORDER BY semester, subject',
      [req.user.id]
    );
    const data = rows.map(r => ({
      ...r,
      percentage: r.total_classes > 0 ? Math.round((r.attended / r.total_classes) * 100) : 0,
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const cid = req.user.college_id;
    const [[{ total_students }]] = await pool.query('SELECT COUNT(*) as total_students FROM students WHERE college_id=?', [cid]);
    const [[{ fees_collected }]] = await pool.query(
      'SELECT COALESCE(SUM(f.amount),0) as fees_collected FROM fees f JOIN students s ON f.student_id=s.id WHERE s.college_id=? AND f.status="paid"',
      [cid]
    );
    const [[{ pending_leaves }]] = await pool.query(
      'SELECT COUNT(*) as pending_leaves FROM leaves l JOIN students s ON l.student_id=s.id WHERE s.college_id=? AND l.status="pending"',
      [cid]
    );
    const [[{ total_notices }]] = await pool.query('SELECT COUNT(*) as total_notices FROM notices WHERE college_id=?', [cid]);
    const [[{ total_placements }]] = await pool.query('SELECT COUNT(*) as total_placements FROM placements WHERE college_id=?', [cid]);
    res.json({ total_students, fees_collected, pending_leaves, total_notices, total_placements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
