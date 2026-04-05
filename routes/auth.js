const router = require('express').Router();
const c    = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/admin/login',           c.adminLogin);
router.post('/student/login',         c.studentLogin);
router.post('/faculty/login',         c.facultyLogin);
router.get('/me',                     auth(['admin','student','faculty']), c.getMe);
router.post('/forgot-password',       c.forgotPassword);
router.post('/validate-reset-token',  c.validateResetToken);
router.post('/reset-password',        c.resetPassword);
router.get('/reset-logs',             auth(['admin']), c.getResetLogs);

module.exports = router;
