require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const COLLEGE_ID = 5;

function daysFromNow(d) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split('T')[0];
}

// Timetable: teacher name must match faculty.name exactly for getMyTimetable to work
const TIMETABLE = [
  // Monday
  { day:'Monday',    subject:'Data Structures',        teacher:'Dr. Rajesh Kumar Panda',   start:'09:00', end:'10:00', room:'CS-101' },
  { day:'Monday',    subject:'Operating Systems',      teacher:'Prof. Sunita Mishra',       start:'10:15', end:'11:15', room:'CS-102' },
  { day:'Monday',    subject:'Computer Networks',      teacher:'Dr. Amit Kumar Sahoo',      start:'11:30', end:'12:30', room:'CS-103' },
  { day:'Monday',    subject:'Digital Electronics',    teacher:'Dr. Sanjay Behera',         start:'09:00', end:'10:00', room:'EC-201' },
  { day:'Monday',    subject:'Circuit Theory',         teacher:'Dr. Bibhuti Bhusan Das',    start:'10:15', end:'11:15', room:'EE-301' },
  { day:'Monday',    subject:'Engineering Mathematics',teacher:'Prof. Soumya Ranjan Patra', start:'11:30', end:'12:30', room:'CV-101' },
  // Tuesday
  { day:'Tuesday',   subject:'Database Management',    teacher:'Prof. Priya Nayak',         start:'09:00', end:'10:00', room:'CS-104' },
  { day:'Tuesday',   subject:'Software Engineering',   teacher:'Dr. Prasanta Kumar Bal',    start:'10:15', end:'11:15', room:'CS-105' },
  { day:'Tuesday',   subject:'Signals & Systems',      teacher:'Prof. Mamata Rath',         start:'09:00', end:'10:00', room:'EC-202' },
  { day:'Tuesday',   subject:'Thermodynamics',         teacher:'Dr. Subhashree Mohanty',    start:'10:15', end:'11:15', room:'ME-101' },
  { day:'Tuesday',   subject:'Fluid Mechanics',        teacher:'Prof. Deepak Ranjan Nath',  start:'11:30', end:'12:30', room:'ME-102' },
  { day:'Tuesday',   subject:'Structural Analysis',    teacher:'Dr. Anita Pradhan',         start:'09:00', end:'10:00', room:'CV-201' },
  // Wednesday
  { day:'Wednesday', subject:'Web Technologies',       teacher:'Dr. Rajesh Kumar Panda',    start:'09:00', end:'10:00', room:'CS-Lab1' },
  { day:'Wednesday', subject:'Theory of Computation',  teacher:'Prof. Sunita Mishra',       start:'10:15', end:'11:15', room:'CS-101' },
  { day:'Wednesday', subject:'Artificial Intelligence',teacher:'Dr. Amit Kumar Sahoo',      start:'11:30', end:'12:30', room:'CS-102' },
  { day:'Wednesday', subject:'VLSI Design',            teacher:'Dr. Sanjay Behera',         start:'09:00', end:'10:00', room:'EC-Lab1' },
  { day:'Wednesday', subject:'Power Systems',          teacher:'Dr. Bibhuti Bhusan Das',    start:'10:15', end:'11:15', room:'EE-302' },
  { day:'Wednesday', subject:'Business Management',    teacher:'Dr. Nirmal Kumar Swain',    start:'09:00', end:'10:00', room:'MBA-101' },
  // Thursday
  { day:'Thursday',  subject:'Data Structures Lab',    teacher:'Prof. Priya Nayak',         start:'09:00', end:'11:00', room:'CS-Lab2' },
  { day:'Thursday',  subject:'Machine Learning',       teacher:'Dr. Prasanta Kumar Bal',    start:'11:15', end:'12:15', room:'CS-103' },
  { day:'Thursday',  subject:'Microprocessors',        teacher:'Prof. Mamata Rath',         start:'09:00', end:'10:00', room:'EC-203' },
  { day:'Thursday',  subject:'CAD/CAM',                teacher:'Dr. Subhashree Mohanty',    start:'10:15', end:'11:15', room:'ME-Lab1' },
  { day:'Thursday',  subject:'Advanced Java',          teacher:'Prof. Sasmita Kumari Jena', start:'09:00', end:'10:00', room:'MCA-101' },
  // Friday
  { day:'Friday',    subject:'Computer Networks Lab',  teacher:'Dr. Amit Kumar Sahoo',      start:'09:00', end:'11:00', room:'CS-Lab3' },
  { day:'Friday',    subject:'Operating Systems Lab',  teacher:'Prof. Sunita Mishra',       start:'11:15', end:'13:15', room:'CS-Lab1' },
  { day:'Friday',    subject:'Embedded Systems',       teacher:'Dr. Sanjay Behera',         start:'09:00', end:'10:00', room:'EC-204' },
  { day:'Friday',    subject:'Surveying',              teacher:'Dr. Anita Pradhan',         start:'10:15', end:'11:15', room:'CV-Lab1' },
  { day:'Friday',    subject:'Financial Accounting',   teacher:'Dr. Nirmal Kumar Swain',    start:'11:30', end:'12:30', room:'MBA-102' },
  // Saturday
  { day:'Saturday',  subject:'Project Work',           teacher:'Dr. Rajesh Kumar Panda',    start:'09:00', end:'12:00', room:'CS-Lab2' },
  { day:'Saturday',  subject:'Seminar',                teacher:'Dr. Prasanta Kumar Bal',    start:'10:00', end:'11:00', room:'Seminar Hall' },
  { day:'Saturday',  subject:'Workshop',               teacher:'Prof. Deepak Ranjan Nath',  start:'09:00', end:'12:00', room:'ME-Workshop' },
];

// Additional notes/assignments/projects
const NOTES = [
  // ECE Notes
  { type:'note', subject:'Digital Electronics', semester:3, faculty:'Dr. Sanjay Behera',
    title:'Boolean Algebra & Logic Gates', content:'Boolean Algebra laws: Identity, Null, Idempotent, Complement, Commutative, Associative, Distributive, De Morgan\'s. Logic Gates: AND, OR, NOT, NAND, NOR, XOR, XNOR. Universal gates: NAND and NOR can implement any Boolean function. Karnaugh Map (K-Map): Used for simplification of Boolean expressions up to 4 variables.' },
  { type:'note', subject:'Signals & Systems', semester:4, faculty:'Prof. Mamata Rath',
    title:'Fourier Transform - Properties & Applications', content:'Fourier Transform converts time-domain signal to frequency domain. Properties: Linearity, Time Shifting, Frequency Shifting, Scaling, Duality, Convolution. Applications: Signal filtering, Image processing, Communication systems. DFT and FFT: Discrete Fourier Transform, Fast Fourier Transform (O(N log N) complexity).' },
  // EEE Notes
  { type:'note', subject:'Circuit Theory', semester:2, faculty:'Dr. Bibhuti Bhusan Das',
    title:'Thevenin & Norton Theorems', content:'Thevenin\'s Theorem: Any linear circuit can be replaced by a voltage source Vth in series with resistance Rth. Norton\'s Theorem: Any linear circuit can be replaced by a current source In in parallel with resistance Rn. Rth = Rn. Source Transformation: Convert between Thevenin and Norton equivalents. Maximum Power Transfer: Load resistance = Thevenin resistance.' },
  // MECH Notes
  { type:'note', subject:'Thermodynamics', semester:3, faculty:'Dr. Subhashree Mohanty',
    title:'Laws of Thermodynamics', content:'Zeroth Law: If A is in thermal equilibrium with B, and B with C, then A is in equilibrium with C. First Law: Energy cannot be created or destroyed (dU = dQ - dW). Second Law: Heat flows from hot to cold spontaneously. Entropy always increases in isolated system. Third Law: Entropy of perfect crystal at 0K is zero. Carnot Cycle: Most efficient heat engine cycle.' },
  // MBA Notes
  { type:'note', subject:'Business Management', semester:1, faculty:'Dr. Nirmal Kumar Swain',
    title:'Management Functions - POLCA', content:'Planning: Setting objectives and determining course of action. Organizing: Arranging resources and tasks. Leading: Directing and motivating employees. Controlling: Monitoring performance against plans. Coordinating: Ensuring all activities work together. Management levels: Top (strategic), Middle (tactical), Lower (operational).' },
  // MCA Notes
  { type:'note', subject:'Advanced Java', semester:2, faculty:'Prof. Sasmita Kumari Jena',
    title:'Java Collections Framework', content:'Collection interfaces: List (ArrayList, LinkedList), Set (HashSet, TreeSet), Map (HashMap, TreeMap). Iterator pattern for traversal. Comparable vs Comparator for sorting. Generics: Type safety at compile time. Stream API (Java 8+): filter(), map(), reduce(), collect(). Lambda expressions and functional interfaces.' },

  // Assignments
  { type:'assignment', subject:'Digital Electronics', semester:3, faculty:'Dr. Sanjay Behera',
    title:'K-Map Simplification Problems', content:'Solve the following using Karnaugh Map:\n1. Simplify F(A,B,C,D) = Σm(0,1,3,7,8,9,11,15)\n2. Simplify F(A,B,C) = Σm(0,2,4,6) with don\'t care d(1,3)\n3. Design a 2-bit comparator circuit\nDraw logic circuit for each. Submit PDF.', deadline: daysFromNow(6) },
  { type:'assignment', subject:'Thermodynamics', semester:3, faculty:'Dr. Subhashree Mohanty',
    title:'Carnot Cycle Efficiency Problems', content:'Solve the following thermodynamics problems:\n1. A Carnot engine operates between 800K and 300K. Find efficiency and work output for 500kJ heat input.\n2. A refrigerator has COP of 4. Find heat rejected to hot reservoir if work input is 2kW.\n3. Calculate entropy change for 2kg water heated from 20°C to 100°C.\nShow all steps. Submit handwritten.', deadline: daysFromNow(5) },
  { type:'assignment', subject:'Advanced Java', semester:2, faculty:'Prof. Sasmita Kumari Jena',
    title:'Implement Generic Stack & Queue', content:'Implement generic Stack<T> and Queue<T> classes in Java using ArrayList internally. Stack: push(), pop(), peek(), isEmpty(), size(). Queue: enqueue(), dequeue(), front(), isEmpty(), size(). Write JUnit test cases for all methods. Submit as .zip with src and test folders.', deadline: daysFromNow(9) },
  { type:'assignment', subject:'Business Management', semester:1, faculty:'Dr. Nirmal Kumar Swain',
    title:'Case Study: Tata Motors Business Strategy', content:'Analyze Tata Motors\' business strategy using:\n1. SWOT Analysis (min 4 points each)\n2. Porter\'s Five Forces Model\n3. BCG Matrix for their product portfolio\n4. Recommendations for next 5 years\nMin 8 pages, Times New Roman 12pt, 1.5 line spacing. Submit PDF.', deadline: daysFromNow(12) },

  // Projects
  { type:'project', subject:'Digital Electronics', semester:3, faculty:'Dr. Sanjay Behera',
    title:'Design & Simulate ALU using Logisim', content:'Design a 4-bit Arithmetic Logic Unit (ALU) that performs: ADD, SUB, AND, OR, XOR, NOT, Left Shift, Right Shift. Use Logisim software for simulation. Document: Circuit diagram, truth tables, test cases, simulation screenshots. Team: 2 students. Demo + viva on submission day.', deadline: daysFromNow(25) },
  { type:'project', subject:'Advanced Java', semester:2, faculty:'Prof. Sasmita Kumari Jena',
    title:'Desktop Library Management System', content:'Build a Java Swing desktop application for Library Management. Features: Book catalog (add/search/delete), Member management, Issue/Return tracking, Fine calculation, Reports. Use MySQL for storage (JDBC). Apply MVC pattern. Team: 2-3 students. Submit JAR + source + documentation.', deadline: daysFromNow(32) },
  { type:'project', subject:'Business Management', semester:1, faculty:'Dr. Nirmal Kumar Swain',
    title:'Business Plan for a Startup', content:'Prepare a complete business plan for a startup of your choice. Include: Executive Summary, Company Description, Market Analysis, Organization Structure, Product/Service Line, Marketing Strategy, Financial Projections (3 years), Funding Requirements. Present as 15-slide PowerPoint + 20-page report. Team: 4-5 students.', deadline: daysFromNow(40) },
];

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'college_erp',
  });

  // Get faculty map: name -> id
  const [faculty] = await conn.query('SELECT id, name FROM faculty WHERE college_id=?', [COLLEGE_ID]);
  const facultyMap = {};
  faculty.forEach(f => { facultyMap[f.name] = f.id; });

  // ── Timetable ──────────────────────────────────────────────────────────
  let ttInserted = 0, ttSkipped = 0;
  for (const t of TIMETABLE) {
    // Check duplicate
    const [exists] = await conn.query(
      'SELECT id FROM timetable WHERE college_id=? AND day=? AND teacher=? AND subject=?',
      [COLLEGE_ID, t.day, t.teacher, t.subject]
    );
    if (exists.length) { ttSkipped++; continue; }
    await conn.query(
      'INSERT INTO timetable (college_id, day, subject, teacher, start_time, end_time, room) VALUES (?,?,?,?,?,?,?)',
      [COLLEGE_ID, t.day, t.subject, t.teacher, t.start, t.end, t.room]
    );
    ttInserted++;
  }
  console.log(`  ✔ Timetable : ${ttInserted} inserted, ${ttSkipped} skipped`);

  // ── Notes / Assignments / Projects ────────────────────────────────────
  let notesInserted = 0;
  for (const n of NOTES) {
    const facultyId = facultyMap[n.faculty];
    if (!facultyId) { console.warn(`  ⚠ Faculty not found: ${n.faculty}`); continue; }
    await conn.query(
      'INSERT INTO notes (faculty_id, college_id, title, content, subject, semester, type, deadline) VALUES (?,?,?,?,?,?,?,?)',
      [facultyId, COLLEGE_ID, n.title, n.content, n.subject, n.semester, n.type, n.deadline || null]
    );
    notesInserted++;
  }
  console.log(`  ✔ Notes/Assignments/Projects : ${notesInserted} inserted`);

  await conn.end();

  const noteCount = NOTES.filter(n=>n.type==='note').length;
  const asgn      = NOTES.filter(n=>n.type==='assignment').length;
  const proj      = NOTES.filter(n=>n.type==='project').length;
  console.log(`\n✅ Faculty dummy data seeded for CGU`);
  console.log(`   📅 Timetable slots : ${ttInserted}`);
  console.log(`   📝 Notes           : ${noteCount}`);
  console.log(`   📋 Assignments     : ${asgn}`);
  console.log(`   🚀 Projects        : ${proj}\n`);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
