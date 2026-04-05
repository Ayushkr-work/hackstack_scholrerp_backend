require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const FILE = path.join(require('os').homedir(), 'Downloads', 'CGUStudentsData.txt');

const COLLEGE_ID = 5;
const DEPARTMENT = 'CSE';
const SEMESTER = 5;
const DEFAULT_PASS = '123456';

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'college_erp',
  });

  const hashed = await bcrypt.hash(DEFAULT_PASS, 10);

  const raw = fs.readFileSync(FILE, 'utf8');
  const lines = raw.split('\n').map(l => l.replace(/\r/g, '').trim()).filter(Boolean);

  // skip header
  const rows = lines.slice(1);

  let inserted = 0;
  let skipped = 0;

  for (const line of rows) {
    const parts = line.split('\t');
    if (parts.length < 3) { skipped++; continue; }

    const name = parts[0].trim();
    const roll_no = parts[1].trim();
    const email = parts[2].trim().toLowerCase();

    if (!name || !email || !roll_no) { skipped++; continue; }

    try {
      const [result] = await conn.query(
        `INSERT IGNORE INTO students (name, email, password, roll_no, department, semester, college_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, hashed, roll_no, DEPARTMENT, SEMESTER, COLLEGE_ID]
      );
      if (result.affectedRows > 0) inserted++;
      else skipped++;
    } catch (err) {
      console.error(`  ✗ Error inserting ${email}:`, err.message);
      skipped++;
    }
  }

  await conn.end();

  console.log('\n✅ Import complete!');
  console.log(`   ✔ Inserted : ${inserted} students`);
  console.log(`   ⊘ Skipped  : ${skipped} (duplicates or bad rows)`);
  console.log(`   🔑 Default password: ${DEFAULT_PASS}`);
}

run().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
