require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const COLLEGE_ID = 5;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];

const HELPDESK_SUBJECTS = [
  'Fee receipt not generated', 'Unable to access results portal', 'Library book not returned properly',
  'Timetable clash in semester 5', 'Hostel room maintenance issue', 'ID card not received',
  'Scholarship form submission help', 'Exam hall ticket issue', 'Wi-Fi not working in block C',
  'Request for bonafide certificate', 'Attendance discrepancy', 'Lab access denied',
];
const HELPDESK_DESCS = [
  'I paid the fee but the receipt was not generated. Please look into this.',
  'The results portal shows an error when I try to log in.',
  'The book I returned is still showing as issued in my account.',
  'Two subjects are scheduled at the same time in my timetable.',
  'The fan in my hostel room is not working since last week.',
  'I have not received my college ID card yet even after 2 months.',
  'I need help filling out the scholarship form for this semester.',
  'My exam hall ticket is not available on the portal.',
  'Wi-Fi connectivity is very poor in block C hostel.',
  'I need a bonafide certificate for bank account opening.',
  'My attendance is showing 60% but I have attended all classes.',
  'I am unable to access the computer lab with my ID card.',
];
const CATEGORIES = ['Fee', 'Technical', 'Library', 'Academic', 'Hostel', 'General', 'Exam', 'Infrastructure'];
const ADMIN_REPLIES = [
  'We have noted your issue and will resolve it within 2 working days.',
  'Please visit the admin office with your fee receipt for verification.',
  'The issue has been escalated to the IT department.',
  'Kindly contact your class coordinator for timetable issues.',
  'Maintenance team has been informed. It will be fixed shortly.',
  'Your ID card is ready. Please collect it from the admin office.',
  'Please submit the required documents to the scholarship cell.',
  'Hall ticket has been generated. Please check again.',
];

const BOOKS = [
  ['Data Structures and Algorithms', 'Thomas H. Cormen'],
  ['Operating System Concepts', 'Abraham Silberschatz'],
  ['Computer Networks', 'Andrew S. Tanenbaum'],
  ['Database System Concepts', 'Abraham Silberschatz'],
  ['Introduction to Algorithms', 'Thomas H. Cormen'],
  ['Software Engineering', 'Ian Sommerville'],
  ['Digital Electronics', 'Morris Mano'],
  ['Engineering Mathematics', 'B.S. Grewal'],
  ['Object Oriented Programming', 'E. Balagurusamy'],
  ['Web Technologies', 'Chris Bates'],
  ['Artificial Intelligence', 'Stuart Russell'],
  ['Computer Organization', 'Carl Hamacher'],
];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'college_erp',
  });

  const [students] = await conn.query('SELECT id FROM students WHERE college_id=?', [COLLEGE_ID]);
  const ids = students.map(s => s.id);
  console.log(`\n📋 Found ${ids.length} CGU students. Seeding missing data...\n`);

  // ── HELPDESK ──────────────────────────────────────────────────────────
  let helpdeskCount = 0;
  const helpdeskStudents = [...ids].sort(() => Math.random() - 0.5).slice(0, Math.floor(ids.length * 0.55));
  for (const id of helpdeskStudents) {
    const idx      = rand(0, HELPDESK_SUBJECTS.length - 1);
    const status   = pick(['open', 'in-progress', 'resolved']);
    const priority = pick(['low', 'medium', 'high']);
    const category = pick(CATEGORIES);
    const reply    = status !== 'open' ? pick(ADMIN_REPLIES) : null;
    const resolved = status === 'resolved' ? `2024-${String(rand(10,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')} 10:00:00` : null;
    await conn.query(
      `INSERT INTO helpdesk (student_id, subject, category, priority, description, status, admin_reply, resolved_at) VALUES (?,?,?,?,?,?,?,?)`,
      [id, HELPDESK_SUBJECTS[idx], category, priority, HELPDESK_DESCS[idx], status, reply, resolved]
    );
    helpdeskCount++;
  }
  console.log(`  ✔ Helpdesk tickets : ${helpdeskCount} records inserted`);

  // ── LIBRARY ───────────────────────────────────────────────────────────
  let libraryCount = 0;
  const libraryStudents = [...ids].sort(() => Math.random() - 0.5).slice(0, Math.floor(ids.length * 0.65));
  for (const id of libraryStudents) {
    const [bookName, bookAuthor] = pick(BOOKS);
    const issueDay   = rand(1, 20);
    const issueMonth = rand(9, 11);
    const issueDate  = `2024-${String(issueMonth).padStart(2,'0')}-${String(issueDay).padStart(2,'0')}`;
    const dueDate    = `2024-${String(issueMonth + 1 > 12 ? 12 : issueMonth + 1).padStart(2,'0')}-${String(issueDay).padStart(2,'0')}`;
    const returned   = Math.random() > 0.4;
    const returnDate = returned ? `2024-${String(issueMonth + 1 > 12 ? 12 : issueMonth + 1).padStart(2,'0')}-${String(rand(issueDay, 28)).padStart(2,'0')}` : null;
    await conn.query(
      `INSERT INTO library_books (student_id, book_name, book_author, issue_date, due_date, return_date, fine_per_day, college_id) VALUES (?,?,?,?,?,?,5.00,?)`,
      [id, bookName, bookAuthor, issueDate, dueDate, returnDate, COLLEGE_ID]
    );
    libraryCount++;
  }
  console.log(`  ✔ Library books    : ${libraryCount} records inserted`);

  // ── PLACEMENT APPLICATIONS ────────────────────────────────────────────
  const [placements] = await conn.query('SELECT id FROM placements WHERE college_id=?', [COLLEGE_ID]);
  const placementIds = placements.map(p => p.id);
  let appCount = 0;
  if (placementIds.length > 0) {
    const appStudents = [...ids].sort(() => Math.random() - 0.5).slice(0, Math.floor(ids.length * 0.70));
    for (const sid of appStudents) {
      const numApps = rand(1, Math.min(3, placementIds.length));
      const chosen  = [...placementIds].sort(() => Math.random() - 0.5).slice(0, numApps);
      for (const pid of chosen) {
        const status = pick(['applied', 'shortlisted', 'rejected', 'selected']);
        try {
          await conn.query(
            `INSERT IGNORE INTO placement_applications (student_id, placement_id, status) VALUES (?,?,?)`,
            [sid, pid, status]
          );
          appCount++;
        } catch (_) {}
      }
    }
  }
  console.log(`  ✔ Placement apps   : ${appCount} records inserted`);

  await conn.end();
  console.log('\n✅ All missing data seeded for C.V Raman Global University!\n');
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
