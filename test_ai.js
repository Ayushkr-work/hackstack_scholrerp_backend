require('dotenv').config();
const { chat } = require('./services/aiService');
const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({ host:'localhost', user:'root', password:'Ayush003@', database:'college_erp' });
  const [[s]] = await conn.query('SELECT id, college_id FROM students WHERE college_id=5 LIMIT 1');
  await conn.end();
  console.log('Student id:', s.id, 'College:', s.college_id);
  const reply = await chat({ message: 'What are my results and attendance?', userId: s.id, role: 'student', collegeId: s.college_id, history: [] });
  console.log('\nREPLY:\n', reply);
}
test().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
