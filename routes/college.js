const router = require('express').Router();
const { getColleges, registerCollege, deleteCollege } = require('../controllers/collegeController');
const auth = require('../middleware/auth');

router.get('/', getColleges);
router.post('/register', registerCollege);
router.delete('/:id', auth(['admin']), deleteCollege);

module.exports = router;
