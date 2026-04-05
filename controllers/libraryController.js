const pool   = require('../config/db');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Multer setup for xerox uploads ───────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/xerox')),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${req.user.id}-${file.originalname}`),
});
exports.upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

exports.getLibrary = async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'student') {
      [rows] = await pool.query(
        `SELECT l.*, s.name as student_name, s.roll_no
         FROM library_books l JOIN students s ON l.student_id=s.id
         WHERE l.student_id=? ORDER BY l.created_at DESC`,
        [req.user.id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT l.*, s.name as student_name, s.roll_no
         FROM library_books l JOIN students s ON l.student_id=s.id
         WHERE l.college_id=? ORDER BY l.created_at DESC`,
        [req.user.college_id]
      );
    }
    const today = new Date();
    rows = rows.map(r => {
      const due = new Date(r.due_date);
      const returned = r.return_date ? new Date(r.return_date) : null;
      const checkDate = returned || today;
      const overdueDays = Math.max(0, Math.floor((checkDate - due) / (1000 * 60 * 60 * 24)));
      const fine = overdueDays * Number(r.fine_per_day);
      return { ...r, overdue_days: overdueDays, fine_amount: fine, is_returned: !!r.return_date };
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.issueBook = async (req, res) => {
  const { student_id, book_name, book_author, issue_date, due_date, fine_per_day } = req.body;
  if (!student_id || !book_name || !issue_date || !due_date)
    return res.status(400).json({ message: 'student_id, book_name, issue_date, due_date required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO library_books (student_id,book_name,book_author,issue_date,due_date,fine_per_day,college_id) VALUES (?,?,?,?,?,?,?)',
      [student_id, book_name, book_author || null, issue_date, due_date, fine_per_day || 5.00, req.user.college_id]
    );
    res.status(201).json({ message: 'Book issued', id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.returnBook = async (req, res) => {
  try {
    await pool.query(
      'UPDATE library_books SET return_date=CURDATE() WHERE id=? AND college_id=?',
      [req.params.id, req.user.college_id]
    );
    res.json({ message: 'Book returned' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteRecord = async (req, res) => {
  try {
    await pool.query('DELETE FROM library_books WHERE id=? AND college_id=?', [req.params.id, req.user.college_id]);
    res.json({ message: 'Record deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Xerox ──────────────────────────────────────────────────────────────────
exports.submitXerox = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'PDF file is required' });
  const { copies = 1, color = 'bw', sides = 'single', note = '' } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO xerox_requests (student_id, college_id, file_name, file_path, copies, color, sides, note)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.id, req.user.college_id, req.file.originalname, req.file.filename, copies, color, sides, note]
    );
    res.status(201).json({ message: 'Xerox request submitted', id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getXeroxRequests = async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'student') {
      [rows] = await pool.query(
        `SELECT x.*, s.name as student_name, s.roll_no FROM xerox_requests x
         JOIN students s ON x.student_id=s.id
         WHERE x.student_id=? ORDER BY x.created_at DESC`,
        [req.user.id]
      );
    } else {
      [rows] = await pool.query(
        `SELECT x.*, s.name as student_name, s.roll_no FROM xerox_requests x
         JOIN students s ON x.student_id=s.id
         WHERE x.college_id=? ORDER BY x.created_at DESC`,
        [req.user.college_id]
      );
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateXeroxStatus = async (req, res) => {
  const { status, admin_note } = req.body;
  try {
    await pool.query(
      'UPDATE xerox_requests SET status=?, admin_note=? WHERE id=? AND college_id=?',
      [status, admin_note || null, req.params.id, req.user.college_id]
    );
    res.json({ message: 'Status updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.downloadXerox = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM xerox_requests WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const r = rows[0];
    if (req.user.role === 'student' && r.student_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden' });
    if (req.user.role !== 'student' && r.college_id !== req.user.college_id)
      return res.status(403).json({ message: 'Forbidden' });
    const filePath = path.join(__dirname, '../uploads/xerox', r.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });
    res.download(filePath, r.file_name);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
