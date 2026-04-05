const router = require('express').Router();
const c = require('../controllers/feeController');
const auth = require('../middleware/auth');

router.get('/', auth(['admin', 'student']), c.getFees);
router.post('/', auth(['admin']), c.createFee);
router.post('/simulate-pay', auth(['student']), c.simulatePay);
router.post('/create-order', auth(['student']), c.createOrder);
router.post('/verify-payment', auth(['student']), c.verifyPayment);

module.exports = router;
