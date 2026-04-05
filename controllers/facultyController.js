const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// ── Get all faculty (admin) ───────────────────────────────────────────────
exports.getFaculty = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,name,email,department,phone,college_id,created_at FROM faculty WHERE college_id=?',
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Create faculty (admin) ────────────────────────────────────────────────
exports.createFaculty = async (req, res) => {
  const { name, email, password, department, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'name, email, password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO faculty (name,email,password,department,phone,college_id) VALUES (?,?,?,?,?,?)',
      [name, email.trim().toLowerCase(), hashed, department, phone, req.user.college_id]
    );
    res.status(201).json({ message: 'Faculty created', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: err.message });
  }
};

// ── Update faculty (admin) ────────────────────────────────────────────────
exports.updateFaculty = async (req, res) => {
  const { name, email, department, phone } = req.body;
  try {
    await pool.query(
      'UPDATE faculty SET name=?,email=?,department=?,phone=? WHERE id=? AND college_id=?',
      [name, email, department, phone, req.params.id, req.user.college_id]
    );
    res.json({ message: 'Faculty updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Delete faculty (admin) ────────────────────────────────────────────────
exports.deleteFaculty = async (req, res) => {
  try {
    await pool.query('DELETE FROM faculty WHERE id=? AND college_id=?', [req.params.id, req.user.college_id]);
    res.json({ message: 'Faculty deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Notes (faculty) ──────────────────────────────────────────────────────
exports.getNotes = async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'student') {
      // Get student's department, then return notes from same department faculty only
      const [stu] = await pool.query('SELECT department FROM students WHERE id=?', [req.user.id]);
      const dept  = stu[0]?.department || '';
      [rows] = await pool.query(
        `SELECT n.*, f.name AS faculty_name, f.department AS faculty_department
         FROM notes n
         JOIN faculty f ON n.faculty_id=f.id
         WHERE n.college_id=? AND f.department=?
         ORDER BY n.created_at DESC`,
        [req.user.college_id, dept]
      );
    } else {
      // Faculty sees only their own notes
      [rows] = await pool.query(
        `SELECT n.*, f.name AS faculty_name, f.department AS faculty_department
         FROM notes n
         JOIN faculty f ON n.faculty_id=f.id
         WHERE n.faculty_id=? ORDER BY n.created_at DESC`,
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createNote = async (req, res) => {
  const { title, content, subject, semester, type, deadline } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });
  try {
    // Auto-use faculty's own department
    const [fac] = await pool.query('SELECT department FROM faculty WHERE id=?', [req.user.id]);
    const department = fac[0]?.department || '';
    const [result] = await pool.query(
      `INSERT INTO notes (faculty_id, college_id, title, content, subject, department, semester, type, deadline)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.user.id, req.user.college_id, title, content || '', subject || '', department, semester || null, type || 'note', deadline || null]
    );
    res.status(201).json({ message: 'Note created', id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteNote = async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id=? AND faculty_id=?', [req.params.id, req.user.id]);
    res.json({ message: 'Note deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Get my timetable (faculty) ────────────────────────────────────────────
exports.getMyTimetable = async (req, res) => {
  try {
    const [me] = await pool.query('SELECT name FROM faculty WHERE id=?', [req.user.id]);
    if (!me.length) return res.status(404).json({ message: 'Faculty not found' });
    const [rows] = await pool.query(
      `SELECT * FROM timetable WHERE college_id=? AND teacher=?
       ORDER BY FIELD(day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time`,
      [req.user.college_id, me[0].name]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Add marks (faculty) ───────────────────────────────────────────────────
exports.addMarks = async (req, res) => {
  const { student_id, semester, results } = req.body;
  if (!student_id || !semester || !results?.length)
    return res.status(400).json({ message: 'student_id, semester, and results array required' });
  try {
    // Verify student belongs to same college
    const [stu] = await pool.query('SELECT id FROM students WHERE id=? AND college_id=?', [student_id, req.user.college_id]);
    if (!stu.length) return res.status(403).json({ message: 'Student not in your college' });

    await pool.query('DELETE FROM results WHERE student_id=? AND semester=?', [student_id, semester]);
    const values = results.map(r => [student_id, semester, r.subject, r.marks, r.max_marks || 100, r.grade]);
    await pool.query('INSERT INTO results (student_id,semester,subject,marks,max_marks,grade) VALUES ?', [values]);
    res.json({ message: 'Marks uploaded successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Get students list (faculty) ───────────────────────────────────────────
exports.getStudents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,name,roll_no,department,semester FROM students WHERE college_id=? ORDER BY name',
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Get student results (faculty) ─────────────────────────────────────────
exports.getStudentResults = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM results WHERE student_id=? ORDER BY semester, subject',
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
