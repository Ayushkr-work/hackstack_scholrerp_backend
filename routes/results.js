const router = require('express').Router();
const c = require('../controllers/resultController');
const auth = require('../middleware/auth');

router.get('/student/:studentId', auth(['admin']), c.getResults);
router.get('/my', auth(['student']), c.getResults);
router.post('/', auth(['admin']), c.uploadResults);
router.delete('/:id', auth(['admin']), c.deleteResult);

module.exports = router;
