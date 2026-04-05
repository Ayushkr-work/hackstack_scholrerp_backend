require('dotenv').config();
const mysql = require('mysql2/promise');

const subjectsBySem = {
  1: ['Mathematics I','Physics','English','Programming Fundamentals','Engineering Drawing'],
  2: ['Mathematics II','Chemistry','Data Structures','Digital Electronics','Communication Skills'],
  3: ['Algorithms','Database Systems','Operating Systems','Computer Networks','Discrete Math'],
  4: ['Software Engineering','Web Technologies','Theory of Computation','Compiler Design','Statistics'],
  5: ['Machine Learning','Cloud Computing','Mobile Development','Cryptography','Project Management'],
  6: ['Deep Learning','Distributed Systems','Big Data','Elective I','Elective II'],
  7: ['Research Methodology','Elective III','Elective IV','Internship','Seminar'],
  8: ['Project Work','Elective V','Industrial Training','Viva','Dissertation'],
};

async function seed() {
  const conn = await mysql.createConnection({ host:'localhost', user:'root', password:'Ayush003@', database:'college_erp' });

  const [students] = await conn.query('SELECT id, semester FROM students WHERE college_id=5');
  const [existing] = await conn.query('SELECT DISTINCT student_id FROM attendance WHERE college_id=5');
  const done    = new Set(existing.map(r => r.student_id));
  const toSeed  = students.filter(s => !done.has(s.id));

  console.log('Total students:', students.length);
  console.log('Already seeded:', done.size);
  console.log('To seed now:',   toSeed.length);

  let inserted = 0;
  for (const s of toSeed) {
    const sem      = s.semester || 1;
    const subjects = subjectsBySem[sem] || subjectsBySem[1];
    for (const subject of subjects) {
      const total    = Math.floor(Math.random() * 20) + 40;
      const minAtt   = Math.floor(total * 0.55);
      const attended = Math.floor(Math.random() * (total - minAtt + 1)) + minAtt;
      await conn.query(
        'INSERT INTO attendance (student_id, subject, semester, total_classes, attended, college_id) VALUES (?,?,?,?,?,5)',
        [s.id, subject, sem, total, attended]
      );
      inserted++;
    }
  }

  console.log('Inserted:', inserted, 'records');
  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) as cnt FROM attendance WHERE college_id=5');
  console.log('Total attendance records now:', cnt);
  await conn.end();
}

seed().catch(e => { console.error(e.message); process.exit(1); });
