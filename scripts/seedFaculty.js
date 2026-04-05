require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const COLLEGE_ID = 5;
const DEFAULT_PASS = 'faculty123';

const FACULTY = [
  { name:'Dr. Rajesh Kumar Panda',    email:'rajesh.panda@cgu.edu.in',    department:'CSE',   phone:'9861001001' },
  { name:'Prof. Sunita Mishra',        email:'sunita.mishra@cgu.edu.in',   department:'CSE',   phone:'9861001002' },
  { name:'Dr. Amit Kumar Sahoo',       email:'amit.sahoo@cgu.edu.in',      department:'CSE',   phone:'9861001003' },
  { name:'Prof. Priya Nayak',          email:'priya.nayak@cgu.edu.in',     department:'CSE',   phone:'9861001004' },
  { name:'Dr. Sanjay Behera',          email:'sanjay.behera@cgu.edu.in',   department:'ECE',   phone:'9861001005' },
  { name:'Prof. Mamata Rath',          email:'mamata.rath@cgu.edu.in',     department:'ECE',   phone:'9861001006' },
  { name:'Dr. Bibhuti Bhusan Das',     email:'bibhuti.das@cgu.edu.in',     department:'EEE',   phone:'9861001007' },
  { name:'Prof. Lipsa Dash',           email:'lipsa.dash@cgu.edu.in',      department:'EEE',   phone:'9861001008' },
  { name:'Dr. Subhashree Mohanty',     email:'subhashree.m@cgu.edu.in',    department:'MECH',  phone:'9861001009' },
  { name:'Prof. Deepak Ranjan Nath',   email:'deepak.nath@cgu.edu.in',     department:'MECH',  phone:'9861001010' },
  { name:'Dr. Anita Pradhan',          email:'anita.pradhan@cgu.edu.in',   department:'CIVIL', phone:'9861001011' },
  { name:'Prof. Soumya Ranjan Patra',  email:'soumya.patra@cgu.edu.in',    department:'CIVIL', phone:'9861001012' },
  { name:'Dr. Nirmal Kumar Swain',     email:'nirmal.swain@cgu.edu.in',    department:'MBA',   phone:'9861001013' },
  { name:'Prof. Sasmita Kumari Jena',  email:'sasmita.jena@cgu.edu.in',    department:'MCA',   phone:'9861001014' },
  { name:'Dr. Prasanta Kumar Bal',     email:'prasanta.bal@cgu.edu.in',    department:'CSE',   phone:'9861001015' },
];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'college_erp',
  });

  const hashed = await bcrypt.hash(DEFAULT_PASS, 10);
  let inserted = 0, skipped = 0;

  for (const f of FACULTY) {
    try {
      const [r] = await conn.query(
        `INSERT IGNORE INTO faculty (name, email, password, department, phone, college_id)
         VALUES (?,?,?,?,?,?)`,
        [f.name, f.email, hashed, f.department, f.phone, COLLEGE_ID]
      );
      if (r.affectedRows > 0) inserted++;
      else skipped++;
    } catch (err) {
      console.error(`  ✗ ${f.email}:`, err.message);
      skipped++;
    }
  }

  await conn.end();
  console.log(`\n✅ Faculty seeded for C.V Raman Global University`);
  console.log(`   ✔ Inserted : ${inserted}`);
  console.log(`   ⊘ Skipped  : ${skipped} (duplicates)`);
  console.log(`   🔑 Default password: ${DEFAULT_PASS}\n`);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
