const router = require('express').Router();
const { chatHandler } = require('../controllers/aiController');
const auth = require('../middleware/auth');

router.post('/chat', auth(['admin', 'student', 'faculty']), chatHandler);

module.exports = router;
