const router = require('express').Router();
const c    = require('../controllers/libraryController');
const auth = require('../middleware/auth');

// Book routes
router.get('/',           auth(['admin','student']), c.getLibrary);
router.post('/',          auth(['admin']),           c.issueBook);
router.put('/:id/return', auth(['admin']),           c.returnBook);
router.delete('/:id',     auth(['admin']),           c.deleteRecord);

// Xerox routes
router.post('/xerox',            auth(['student']),          c.upload.single('pdf'), c.submitXerox);
router.get('/xerox',             auth(['admin','student']),  c.getXeroxRequests);
router.put('/xerox/:id/status',  auth(['admin']),            c.updateXeroxStatus);
router.get('/xerox/:id/download',auth(['admin','student']),  c.downloadXerox);

module.exports = router;
