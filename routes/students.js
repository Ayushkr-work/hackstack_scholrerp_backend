const router = require('express').Router();
const c = require('../controllers/studentController');
const auth = require('../middleware/auth');

router.get('/attendance',            auth(['student']), c.getMyAttendance);
router.get('/dashboard/stats',      auth(['admin']), c.getDashboardStats);
router.get('/dashboard/departments', auth(['admin']), c.getDepartmentStats);
router.get('/dashboard/cgpa',        auth(['admin']), c.getAvgCgpa);
router.get('/dashboard/attendance',  auth(['admin']), c.getSubjectAttendance);
router.get('/', auth(['admin']), c.getStudents);
router.get('/profile', auth(['student']), c.getStudent);
router.get('/:id', auth(['admin']), c.getStudent);
router.post('/', auth(['admin']), c.createStudent);
router.put('/profile', auth(['student']), c.updateStudent);
router.put('/:id', auth(['admin']), c.updateStudent);
router.delete('/:id', auth(['admin']), c.deleteStudent);

module.exports = router;
