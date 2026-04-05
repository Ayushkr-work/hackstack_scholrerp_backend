const router = require('express').Router();
const c = require('../controllers/noticeController');
const auth = require('../middleware/auth');

router.get('/', auth(['admin', 'student']), c.getNotices);
router.post('/', auth(['admin']), c.createNotice);
router.put('/:id', auth(['admin']), c.updateNotice);
router.delete('/:id', auth(['admin']), c.deleteNotice);

module.exports = router;
