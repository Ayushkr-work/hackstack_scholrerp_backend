const router = require('express').Router();
const c    = require('../controllers/facultyController');
const auth = require('../middleware/auth');

// Admin manages faculty
router.get('/',      auth(['admin']),   c.getFaculty);
router.post('/',     auth(['admin']),   c.createFaculty);
router.put('/:id',   auth(['admin']),   c.updateFaculty);
router.delete('/:id',auth(['admin']),   c.deleteFaculty);

// Faculty-specific routes
router.get('/my/timetable',              auth(['faculty']), c.getMyTimetable);
router.get('/my/students',               auth(['faculty']), c.getStudents);
router.get('/my/results/:studentId',     auth(['faculty']), c.getStudentResults);
router.post('/my/marks',                 auth(['faculty']), c.addMarks);

// Notes routes (faculty creates, students read)
router.get('/notes',        auth(['faculty','student']), c.getNotes);
router.post('/notes',       auth(['faculty']),           c.createNote);
router.delete('/notes/:id', auth(['faculty']),           c.deleteNote);

module.exports = router;
