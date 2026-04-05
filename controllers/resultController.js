const pool = require('../config/db');

exports.getResults = async (req, res) => {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : req.params.studentId;
    const [rows] = await pool.query(
      'SELECT * FROM results WHERE student_id=? ORDER BY semester, subject',
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadResults = async (req, res) => {
  const { student_id, semester, results } = req.body;
  if (!student_id || !semester || !results?.length)
    return res.status(400).json({ message: 'student_id, semester, and results array required' });

  try {
    await pool.query('DELETE FROM results WHERE student_id=? AND semester=?', [student_id, semester]);
    const values = results.map(r => [student_id, semester, r.subject, r.marks, r.max_marks || 100, r.grade]);
    await pool.query(
      'INSERT INTO results (student_id,semester,subject,marks,max_marks,grade) VALUES ?',
      [values]
    );
    res.json({ message: 'Results uploaded successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteResult = async (req, res) => {
  try {
    await pool.query('DELETE FROM results WHERE id=?', [req.params.id]);
    res.json({ message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
