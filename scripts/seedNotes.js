require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const COLLEGE_ID = 5;

const DATA = [
  // CSE Notes
  { type:'note', subject:'Data Structures', semester:3, title:'Linked List - Complete Notes', content:'A linked list is a linear data structure where elements are stored in nodes. Each node contains data and a pointer to the next node. Types: Singly, Doubly, Circular. Operations: Insertion (O(1) at head), Deletion, Traversal (O(n)). Applications: Implementation of stacks, queues, graphs adjacency list.' },
  { type:'note', subject:'Operating Systems', semester:5, title:'Process Scheduling Algorithms', content:'CPU Scheduling algorithms: FCFS (First Come First Serve) - non-preemptive, simple but convoy effect. SJF (Shortest Job First) - optimal average waiting time. Round Robin - preemptive, time quantum based, good for time-sharing. Priority Scheduling - can cause starvation, solved by aging.' },
  { type:'note', subject:'Computer Networks', semester:5, title:'OSI Model - 7 Layers Explained', content:'Physical Layer: Transmission of raw bits. Data Link Layer: Node-to-node delivery, MAC address. Network Layer: Routing, IP address. Transport Layer: End-to-end delivery, TCP/UDP. Session Layer: Session management. Presentation Layer: Data translation, encryption. Application Layer: HTTP, FTP, SMTP.' },
  { type:'note', subject:'Database Management', semester:4, title:'Normalization - 1NF to BCNF', content:'1NF: Atomic values, no repeating groups. 2NF: 1NF + no partial dependency. 3NF: 2NF + no transitive dependency. BCNF: Stronger version of 3NF. Normalization reduces data redundancy and improves data integrity. Denormalization is done for performance optimization.' },
  { type:'note', subject:'Theory of Computation', semester:5, title:'Finite Automata and Regular Languages', content:'DFA: Deterministic Finite Automaton - exactly one transition per input symbol per state. NFA: Non-deterministic - multiple transitions allowed. Both accept same class of languages (Regular). Regular expressions describe regular languages. Pumping Lemma used to prove a language is not regular.' },
  { type:'note', subject:'Software Engineering', semester:6, title:'SDLC Models - Waterfall to Agile', content:'Waterfall: Sequential phases, rigid, good for well-defined requirements. Spiral: Risk-driven, iterative. Agile: Iterative, flexible, customer collaboration. Scrum: Agile framework with sprints (2-4 weeks), daily standups, sprint review. Kanban: Visual workflow management.' },
  { type:'note', subject:'Web Technologies', semester:5, title:'REST API Design Principles', content:'REST (Representational State Transfer): Stateless, Client-Server, Cacheable, Uniform Interface. HTTP Methods: GET (read), POST (create), PUT (update), DELETE (remove). Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error.' },
  { type:'note', subject:'Artificial Intelligence', semester:6, title:'Search Algorithms in AI', content:'Uninformed Search: BFS (complete, optimal for unit cost), DFS (space efficient, not optimal), UCS. Informed Search: A* (uses heuristic f(n)=g(n)+h(n), optimal if h is admissible), Greedy Best First. Heuristic functions: Manhattan distance, Euclidean distance. Adversarial Search: Minimax, Alpha-Beta pruning.' },

  // Assignments
  { type:'assignment', subject:'Data Structures', semester:3, title:'Implement Stack using Linked List', content:'Implement a stack data structure using singly linked list in C/C++. Operations required: push(), pop(), peek(), isEmpty(), display(). Submit source code with output screenshots. Marks: 10. Submission format: PDF with code and output.', deadline: daysFromNow(7) },
  { type:'assignment', subject:'Database Management', semester:4, title:'ER Diagram for Hospital Management System', content:'Design a complete ER diagram for a Hospital Management System. Include entities: Patient, Doctor, Nurse, Ward, Medicine, Appointment. Show all relationships with cardinality. Convert ER diagram to relational schema. Submit as PDF.', deadline: daysFromNow(5) },
  { type:'assignment', subject:'Computer Networks', semester:5, title:'Subnetting Practice Problems', content:'Solve the following subnetting problems:\n1. Divide 192.168.1.0/24 into 8 equal subnets\n2. Find subnet mask for 500 hosts\n3. VLSM assignment for given network topology\nShow all calculations. Submit handwritten or typed PDF.', deadline: daysFromNow(4) },
  { type:'assignment', subject:'Operating Systems', semester:5, title:'Simulate Round Robin Scheduling', content:'Write a program in C to simulate Round Robin CPU scheduling algorithm. Input: Process ID, Arrival Time, Burst Time, Time Quantum. Output: Gantt chart, Waiting Time, Turnaround Time, Average WT and TAT. Submit code + output.', deadline: daysFromNow(10) },
  { type:'assignment', subject:'Web Technologies', semester:5, title:'Build a Responsive Portfolio Website', content:'Create a responsive personal portfolio website using HTML5, CSS3, and JavaScript. Must include: Navigation bar, Hero section, Skills section, Projects section, Contact form. Use CSS Grid/Flexbox. No frameworks allowed. Submit GitHub link + hosted URL.', deadline: daysFromNow(14) },
  { type:'assignment', subject:'Software Engineering', semester:6, title:'SRS Document for Library Management System', content:'Prepare a complete Software Requirements Specification (SRS) document for a Library Management System following IEEE 830 standard. Include: Introduction, Overall Description, Functional Requirements, Non-functional Requirements, Use Case Diagrams. Min 15 pages.', deadline: daysFromNow(8) },

  // Projects
  { type:'project', subject:'Data Structures', semester:3, title:'Mini Project: Student Record Management System', content:'Develop a Student Record Management System using C++ with file handling. Features: Add/Delete/Search/Update student records, Sort by roll number or name, Generate reports. Use linked list or BST for storage. Team size: 2-3 students. Viva on submission date.', deadline: daysFromNow(21) },
  { type:'project', subject:'Database Management', semester:4, title:'Major Project: Online Examination System', content:'Build a complete Online Examination System with MySQL backend. Features: Admin panel (add questions, set timer), Student login, Auto-evaluation, Result generation, Report export. Use PHP/Python for backend. Frontend: HTML/CSS/JS. Team: 3-4 students. Demo required.', deadline: daysFromNow(30) },
  { type:'project', subject:'Web Technologies', semester:5, title:'Full Stack Web Application', content:'Develop a full-stack web application of your choice using React.js (frontend) and Node.js/Express (backend) with MySQL/MongoDB. Must have: Authentication, CRUD operations, Responsive design, REST API. Deploy on any free hosting. Team: 2-3 students. Code review + demo.', deadline: daysFromNow(35) },
  { type:'project', subject:'Artificial Intelligence', semester:6, title:'ML Model: Student Performance Prediction', content:'Build a machine learning model to predict student academic performance. Dataset: Use provided CSV with 500+ records. Algorithms to compare: Linear Regression, Decision Tree, Random Forest, SVM. Use Python (scikit-learn, pandas, matplotlib). Submit Jupyter notebook + report. Individual project.', deadline: daysFromNow(28) },
  { type:'project', subject:'Computer Networks', semester:5, title:'Network Simulation using Cisco Packet Tracer', content:'Design and simulate a campus network for a 3-floor building using Cisco Packet Tracer. Include: VLANs, Inter-VLAN routing, DHCP server, DNS, Web server, ACLs. Configure RIP/OSPF routing protocol. Submit .pkt file + documentation. Team: 2 students.', deadline: daysFromNow(18) },
];

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'college_erp',
  });

  // Get CGU faculty IDs
  const [faculty] = await conn.query('SELECT id, department FROM faculty WHERE college_id=?', [COLLEGE_ID]);
  if (!faculty.length) { console.error('No faculty found for CGU'); process.exit(1); }

  const byDept = {};
  faculty.forEach(f => { if (!byDept[f.department]) byDept[f.department] = []; byDept[f.department].push(f.id); });
  const cseFaculty = byDept['CSE'] || faculty.map(f => f.id);

  let inserted = 0;
  for (const item of DATA) {
    // Pick a CSE faculty for CSE subjects, else any
    const pool = byDept[item.subject?.includes('AI') || item.subject?.includes('Artificial') ? 'CSE' : 'CSE'] || cseFaculty;
    const facultyId = pool[Math.floor(Math.random() * pool.length)];
    await conn.query(
      `INSERT INTO notes (faculty_id, college_id, title, content, subject, semester, type, deadline) VALUES (?,?,?,?,?,?,?,?)`,
      [facultyId, COLLEGE_ID, item.title, item.content, item.subject, item.semester, item.type, item.deadline || null]
    );
    inserted++;
  }

  await conn.end();
  const notes = DATA.filter(d=>d.type==='note').length;
  const asgn  = DATA.filter(d=>d.type==='assignment').length;
  const proj  = DATA.filter(d=>d.type==='project').length;
  console.log(`\n✅ Study content seeded for CGU`);
  console.log(`   📝 Notes       : ${notes}`);
  console.log(`   📋 Assignments : ${asgn}`);
  console.log(`   🚀 Projects    : ${proj}`);
  console.log(`   Total          : ${inserted}\n`);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
