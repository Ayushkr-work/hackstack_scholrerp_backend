const pool = require('../config/db');

exports.getTimetable = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM timetable WHERE college_id=? ORDER BY FIELD(day,"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"), start_time',
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createEntry = async (req, res) => {
  const { day, subject, teacher, start_time, end_time, room } = req.body;
  if (!day || !subject || !start_time || !end_time)
    return res.status(400).json({ message: 'day, subject, start_time, end_time required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO timetable (college_id,day,subject,teacher,start_time,end_time,room) VALUES (?,?,?,?,?,?,?)',
      [req.user.college_id, day, subject, teacher, start_time, end_time, room]
    );
    res.status(201).json({ message: 'Entry created', id: result.insertId });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateEntry = async (req, res) => {
  const { day, subject, teacher, start_time, end_time, room } = req.body;
  try {
    await pool.query(
      'UPDATE timetable SET day=?,subject=?,teacher=?,start_time=?,end_time=?,room=? WHERE id=? AND college_id=?',
      [day, subject, teacher, start_time, end_time, room, req.params.id, req.user.college_id]
    );
    res.json({ message: 'Entry updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteEntry = async (req, res) => {
  try {
    await pool.query('DELETE FROM timetable WHERE id=? AND college_id=?', [req.params.id, req.user.college_id]);
    res.json({ message: 'Entry deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
