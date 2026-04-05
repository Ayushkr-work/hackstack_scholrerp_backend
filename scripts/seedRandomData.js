require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const COLLEGE_ID = 5;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];

const SUBJECTS   = ['Data Structures','Operating Systems','Mathematics III','Computer Networks','Database Management','Software Engineering','Theory of Computation','Elective: AI & ML','Digital Electronics','Web Technologies'];
const GRADES     = ['O','A+','A','B+','B','C'];
const COMPANIES  = ['TCS','Infosys','Wipro','HCL Technologies','Tech Mahindra','Cognizant','Accenture','Capgemini','IBM','Oracle'];
const ROLES      = ['Software Engineer','Systems Engineer','Associate Engineer','Graduate Trainee','Junior Developer','Data Analyst','QA Engineer','DevOps Engineer'];
const PACKAGES   = ['3.5 LPA','4 LPA','4.5 LPA','5 LPA','6 LPA','6.5 LPA','7 LPA','8 LPA','10 LPA','12 LPA'];
const LEAVE_REASONS = ['Medical emergency','Family function','Personal work','Attending seminar','Home town visit','Health checkup','Relative marriage','Sports event'];
const NOTICE_TITLES = [
  'End Semester Exam Schedule Released',
  'Annual Sports Meet 2024',
  'Library Timing Update',
  'Campus Placement Drive - TCS & Infosys',
  'Holiday Notice - Diwali Break',
  'Workshop on Cloud Computing',
  'Fee Payment Deadline Reminder',
  'Anti-Ragging Committee Meeting',
  'Guest Lecture on AI & Machine Learning',
  'Cultural Fest Registration Open',
];
const NOTICE_DESCS = [
  'Students are advised to check the notice board regularly for updates.',
  'All students must carry their ID cards during the event.',
  'Registration is mandatory. Last date is mentioned below.',
  'Eligible students with CGPA >= 6.5 can apply through the placement cell.',
  'The college will remain closed on the mentioned dates.',
  'Attendance is compulsory for all final year students.',
  'Please clear all dues before the deadline to avoid fine.',
  'Students are requested to cooperate with the committee.',
  'Industry experts will be sharing insights on latest technologies.',
  'Teams of 3-5 members can register at the student affairs office.',
];
const FEE_DESCS  = ['Semester 5 Tuition Fee','Library & Lab Fee','Hostel Fee','Examination Fee','Development Fee','Sports Fee'];
const STATUSES   = ['pending','approved','rejected'];
const FEE_STATUS = ['pending','paid'];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'college_erp',
    multipleStatements: true,
  });

  // Get all CGU student IDs
  const [students] = await conn.query('SELECT id FROM students WHERE college_id=?', [COLLEGE_ID]);
  const ids = students.map(s => s.id);
  console.log(`\n📋 Found ${ids.length} CGU students. Inserting random data...\n`);

  // ── 1. RESULTS ─────────────────────────────────────────────────────────
  let resultCount = 0;
  for (const id of ids) {
    const sems = [rand(3,4), 5];
    for (const sem of sems) {
      const subjectCount = rand(4, 6);
      const usedSubjects = [...SUBJECTS].sort(() => Math.random() - 0.5).slice(0, subjectCount);
      for (const subject of usedSubjects) {
        const marks = rand(45, 98);
        const grade = marks >= 90 ? 'O' : marks >= 80 ? 'A+' : marks >= 70 ? 'A' : marks >= 60 ? 'B+' : marks >= 50 ? 'B' : 'C';
        await conn.query(
          'INSERT IGNORE INTO results (student_id, semester, subject, marks, max_marks, grade) VALUES (?,?,?,?,100,?)',
          [id, sem, subject, marks, grade]
        );
        resultCount++;
      }
    }
  }
  console.log(`  ✔ Results     : ${resultCount} records inserted`);

  // ── 2. FEES ────────────────────────────────────────────────────────────
  let feeCount = 0;
  for (const id of ids) {
    const numFees = rand(1, 3);
    for (let i = 0; i < numFees; i++) {
      const desc   = pick(FEE_DESCS);
      const amount = pick([15000, 20000, 25000, 30000, 45000, 5000, 8000, 10000]);
      const status = pick(FEE_STATUS);
      const due    = `2024-${String(rand(10,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`;
      const paid_at = status === 'paid' ? `2024-${String(rand(10,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')} 10:00:00` : null;
      await conn.query(
        'INSERT INTO fees (student_id, amount, description, status, due_date, paid_at) VALUES (?,?,?,?,?,?)',
        [id, amount, desc, status, due, paid_at]
      );
      feeCount++;
    }
  }
  console.log(`  ✔ Fees        : ${feeCount} records inserted`);

  // ── 3. LEAVES ──────────────────────────────────────────────────────────
  let leaveCount = 0;
  const leaveStudents = [...ids].sort(() => Math.random() - 0.5).slice(0, Math.floor(ids.length * 0.6));
  for (const id of leaveStudents) {
    const fromDay  = rand(1, 25);
    const toDay    = fromDay + rand(1, 4);
    const month    = rand(10, 12);
    const from     = `2024-${String(month).padStart(2,'0')}-${String(fromDay).padStart(2,'0')}`;
    const to       = `2024-${String(month).padStart(2,'0')}-${String(Math.min(toDay,28)).padStart(2,'0')}`;
    const status   = pick(STATUSES);
    const remark   = status === 'approved' ? 'Approved.' : status === 'rejected' ? 'Insufficient reason.' : '';
    await conn.query(
      'INSERT INTO leaves (student_id, reason, from_date, to_date, status, admin_remark) VALUES (?,?,?,?,?,?)',
      [id, pick(LEAVE_REASONS), from, to, status, remark]
    );
    leaveCount++;
  }
  console.log(`  ✔ Leaves      : ${leaveCount} records inserted`);

  // ── 4. NOTICES ─────────────────────────────────────────────────────────
  let noticeCount = 0;
  for (let i = 0; i < NOTICE_TITLES.length; i++) {
    const priority = pick(['low','medium','high']);
    await conn.query(
      'INSERT INTO notices (title, description, college_id, priority) VALUES (?,?,?,?)',
      [NOTICE_TITLES[i], NOTICE_DESCS[i], COLLEGE_ID, priority]
    );
    noticeCount++;
  }
  console.log(`  ✔ Notices     : ${noticeCount} records inserted`);

  // ── 5. PLACEMENTS ──────────────────────────────────────────────────────
  let placementCount = 0;
  for (let i = 0; i < 8; i++) {
    const company  = pick(COMPANIES);
    const role     = pick(ROLES);
    const pkg      = pick(PACKAGES);
    const deadline = `2024-${String(rand(11,12)).padStart(2,'0')}-${String(rand(5,28)).padStart(2,'0')}`;
    const eligibility = `CGPA >= ${pick(['6.0','6.5','7.0','7.5'])}, ${pick(['All branches','CSE/IT only','CSE/ECE','All branches except ME'])}`;
    await conn.query(
      'INSERT INTO placements (company_name, role, description, eligibility, package, deadline, college_id) VALUES (?,?,?,?,?,?,?)',
      [company, role, `${company} is hiring ${role}s for their ${pick(['Bhubaneswar','Pune','Bangalore','Hyderabad','Chennai'])} office.`, eligibility, pkg, deadline, COLLEGE_ID]
    );
    placementCount++;
  }
  console.log(`  ✔ Placements  : ${placementCount} records inserted`);

  await conn.end();
  console.log('\n✅ All random data inserted successfully for C.V Raman Global University!\n');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
