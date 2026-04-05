const pool = require('../config/db');

exports.getLeaves = async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query(
        `SELECT l.*, s.name as student_name, s.roll_no FROM leaves l
         JOIN students s ON l.student_id=s.id
         WHERE s.college_id=? ORDER BY l.created_at DESC`,
        [req.user.college_id]
      );
    } else {
      [rows] = await pool.query(
        'SELECT * FROM leaves WHERE student_id=? ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.applyLeave = async (req, res) => {
  const { reason, from_date, to_date } = req.body;
  if (!reason || !from_date || !to_date) return res.status(400).json({ message: 'All fields required' });

  try {
    const [result] = await pool.query(
      'INSERT INTO leaves (student_id,reason,from_date,to_date) VALUES (?,?,?,?)',
      [req.user.id, reason, from_date, to_date]
    );
    res.status(201).json({ message: 'Leave applied', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  const { status, admin_remark } = req.body;
  if (!['approved', 'rejected'].includes(status))
    return res.status(400).json({ message: 'Invalid status' });

  try {
    await pool.query(
      'UPDATE leaves SET status=?, admin_remark=? WHERE id=?',
      [status, admin_remark, req.params.id]
    );
    res.json({ message: `Leave ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
