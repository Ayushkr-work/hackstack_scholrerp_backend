const router = require('express').Router();
const c = require('../controllers/placementController');
const auth = require('../middleware/auth');

router.get('/', auth(['admin', 'student']), c.getPlacements);
router.post('/', auth(['admin']), c.createPlacement);
router.put('/:id', auth(['admin']), c.updatePlacement);
router.delete('/:id', auth(['admin']), c.deletePlacement);
router.post('/:id/apply', auth(['student']), c.applyPlacement);
router.get('/applications/all', auth(['admin']), c.getApplications);
router.put('/applications/:id/status', auth(['admin']), c.updateApplicationStatus);

module.exports = router;
