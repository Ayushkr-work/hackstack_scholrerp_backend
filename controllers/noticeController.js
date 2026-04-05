const pool = require('../config/db');

exports.getNotices = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM notices WHERE college_id=? ORDER BY created_at DESC',
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createNotice = async (req, res) => {
  const { title, description, priority } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'Title and description required' });

  try {
    const [result] = await pool.query(
      'INSERT INTO notices (title,description,priority,college_id) VALUES (?,?,?,?)',
      [title, description, priority || 'medium', req.user.college_id]
    );
    res.status(201).json({ message: 'Notice created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateNotice = async (req, res) => {
  const { title, description, priority } = req.body;
  try {
    await pool.query(
      'UPDATE notices SET title=?,description=?,priority=? WHERE id=? AND college_id=?',
      [title, description, priority, req.params.id, req.user.college_id]
    );
    res.json({ message: 'Notice updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteNotice = async (req, res) => {
  try {
    await pool.query('DELETE FROM notices WHERE id=? AND college_id=?', [req.params.id, req.user.college_id]);
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
