const router = require('express').Router();
const c    = require('../controllers/helpdeskController');
const auth = require('../middleware/auth');

router.get('/',          auth(['student']), c.getMyTickets);
router.get('/all',       auth(['admin']),   c.getAllTickets);
router.post('/',         auth(['student']), c.createTicket);
router.put('/:id/reply', auth(['admin']),   c.replyTicket);

module.exports = router;
