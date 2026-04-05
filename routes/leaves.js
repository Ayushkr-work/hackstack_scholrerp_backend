const router = require('express').Router();
const c = require('../controllers/leaveController');
const auth = require('../middleware/auth');

router.get('/', auth(['admin', 'student']), c.getLeaves);
router.post('/', auth(['student']), c.applyLeave);
router.put('/:id/status', auth(['admin']), c.updateLeaveStatus);

module.exports = router;
