const router = require('express').Router();
const c = require('../controllers/timetableController');
const auth = require('../middleware/auth');

router.get('/',      auth(['admin','student','faculty']), c.getTimetable);
router.post('/',     auth(['admin']),           c.createEntry);
router.put('/:id',   auth(['admin']),           c.updateEntry);
router.delete('/:id',auth(['admin']),           c.deleteEntry);

module.exports = router;
