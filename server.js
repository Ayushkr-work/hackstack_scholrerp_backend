require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const initDB  = require('./config/initDB');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

app.use('/api/colleges',   require('./routes/college'));
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/results',    require('./routes/results'));
app.use('/api/notices',    require('./routes/notices'));
app.use('/api/leaves',     require('./routes/leaves'));
app.use('/api/fees',       require('./routes/fees'));
app.use('/api/placements', require('./routes/placements'));
app.use('/api/helpdesk',   require('./routes/helpdesk'));
app.use('/api/ai',         require('./routes/ai'));
app.use('/api/timetable',  require('./routes/timetable'));
app.use('/api/faculty',    require('./routes/faculty'));
app.use('/api/library',    require('./routes/library'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

(async () => {
  try {
    await initDB();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ SERVER STARTUP ERROR:', err.message);
    process.exit(1);
  }
})();
