const pool = require('../config/db');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getFees = async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query(
        `SELECT f.*, s.name as student_name, s.roll_no FROM fees f
         JOIN students s ON f.student_id=s.id
         WHERE s.college_id=? ORDER BY f.created_at DESC`,
        [req.user.college_id]
      );
    } else {
      [rows] = await pool.query(
        'SELECT * FROM fees WHERE student_id=? ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createFee = async (req, res) => {
  const { student_id, amount, description, due_date } = req.body;
  if (!student_id || !amount) return res.status(400).json({ message: 'student_id and amount required' });

  try {
    const [result] = await pool.query(
      'INSERT INTO fees (student_id,amount,description,due_date) VALUES (?,?,?,?)',
      [student_id, amount, description, due_date]
    );
    res.status(201).json({ message: 'Fee record created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createOrder = async (req, res) => {
  const { fee_id } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM fees WHERE id=? AND student_id=?', [fee_id, req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Fee not found' });

    const fee = rows[0];
    const order = await razorpay.orders.create({
      amount: Math.round(fee.amount * 100),
      currency: 'INR',
      receipt: `fee_${fee_id}`,
    });

    await pool.query('UPDATE fees SET order_id=? WHERE id=?', [order.id, fee_id]);
    res.json({ order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Simulate Pay (demo mode - no real payment) ───────────────────────────
exports.simulatePay = async (req, res) => {
  const { fee_id } = req.body;
  if (!fee_id) return res.status(400).json({ message: 'fee_id required' });
  try {
    const [rows] = await pool.query('SELECT * FROM fees WHERE id=? AND student_id=?', [fee_id, req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Fee not found' });
    await pool.query('UPDATE fees SET status="paid", paid_at=NOW() WHERE id=?', [fee_id]);
    res.json({ message: 'Payment simulated successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fee_id } = req.body;

  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(sign)
    .digest('hex');

  if (expectedSign !== razorpay_signature)
    return res.status(400).json({ message: 'Payment verification failed' });

  try {
    await pool.query(
      'UPDATE fees SET status="paid", payment_id=?, paid_at=NOW() WHERE id=?',
      [razorpay_payment_id, fee_id]
    );
    res.json({ message: 'Payment verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
