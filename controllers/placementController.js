const pool = require('../config/db');

exports.getPlacements = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM placements WHERE college_id=? ORDER BY created_at DESC',
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPlacement = async (req, res) => {
  const { company_name, role, description, eligibility, package: pkg, deadline } = req.body;
  if (!company_name || !role) return res.status(400).json({ message: 'company_name and role required' });

  try {
    const [result] = await pool.query(
      'INSERT INTO placements (company_name,role,description,eligibility,package,deadline,college_id) VALUES (?,?,?,?,?,?,?)',
      [company_name, role, description, eligibility, pkg, deadline, req.user.college_id]
    );
    res.status(201).json({ message: 'Placement created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePlacement = async (req, res) => {
  const { company_name, role, description, eligibility, package: pkg, deadline } = req.body;
  try {
    await pool.query(
      'UPDATE placements SET company_name=?,role=?,description=?,eligibility=?,package=?,deadline=? WHERE id=? AND college_id=?',
      [company_name, role, description, eligibility, pkg, deadline, req.params.id, req.user.college_id]
    );
    res.json({ message: 'Placement updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deletePlacement = async (req, res) => {
  try {
    await pool.query('DELETE FROM placements WHERE id=? AND college_id=?', [req.params.id, req.user.college_id]);
    res.json({ message: 'Placement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.applyPlacement = async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO placement_applications (student_id,placement_id) VALUES (?,?)',
      [req.user.id, req.params.id]
    );
    res.status(201).json({ message: 'Applied successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Already applied' });
    res.status(500).json({ message: err.message });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pa.*, s.name as student_name, s.roll_no, p.company_name, p.role
       FROM placement_applications pa
       JOIN students s ON pa.student_id=s.id
       JOIN placements p ON pa.placement_id=p.id
       WHERE p.college_id=? ORDER BY pa.created_at DESC`,
      [req.user.college_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE placement_applications SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
