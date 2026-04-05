const pool   = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getColleges = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, email, address, phone FROM colleges');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.registerCollege = async (req, res) => {
  const { name, email, password, address, phone, adminName } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'College name, email and password are required' });

  try {
    const [existing] = await pool.query('SELECT id FROM colleges WHERE email=?', [email]);
    if (existing.length) return res.status(409).json({ message: 'A college with this email already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO colleges (name, email, password, address, phone) VALUES (?,?,?,?,?)',
      [name, email, hashed, address || '', phone || '']
    );
    const collegeId = result.insertId;

    await pool.query(
      'INSERT INTO admins (name, email, password, college_id) VALUES (?,?,?,?)',
      [adminName || name, email, hashed, collegeId]
    );

    res.status(201).json({ message: 'College registered successfully', collegeId, adminEmail: email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCollege = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id FROM colleges WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'College not found' });
    await pool.query('DELETE FROM colleges WHERE id=?', [id]);
    res.json({ message: 'College deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
