const pool = require('../config/db');

exports.getMyTickets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM helpdesk WHERE student_id=? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getAllTickets = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT h.*, s.name as student_name, s.roll_no
       FROM helpdesk h JOIN students s ON h.student_id=s.id
       WHERE s.college_id=? ORDER BY h.created_at DESC`,
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createTicket = async (req, res) => {
  const { subject, category, priority, description } = req.body;
  if (!subject || !description) return res.status(400).json({ message: 'Subject and description required' });
  try {
    const [r] = await pool.query(
      'INSERT INTO helpdesk (student_id,subject,category,priority,description,status) VALUES (?,?,?,?,?,?)',
      [req.user.id, subject, category||'General', priority||'medium', description, 'open']
    );
    res.status(201).json({ message: 'Ticket created', id: r.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.replyTicket = async (req, res) => {
  const { admin_reply, status } = req.body;
  try {
    await pool.query(
      'UPDATE helpdesk SET admin_reply=?, status=?, resolved_at=? WHERE id=?',
      [admin_reply, status||'in-progress', status==='resolved' ? new Date() : null, req.params.id]
    );
    res.json({ message: 'Reply sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
