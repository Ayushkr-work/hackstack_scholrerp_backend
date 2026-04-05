const pool = require('../config/db');

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const BASE   = 'https://generativelanguage.googleapis.com/v1/models';

function getKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here')
    throw Object.assign(new Error('GEMINI_API_KEY not configured'), { code: 'NO_KEY' });
  return key;
}

async function callGemini(key, model, contents) {
  const res  = await fetch(`${BASE}/${model}:generateContent?key=${key}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = Object.assign(new Error(data.error?.message || 'Gemini error'), { status: res.status });
    throw err;
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response.';
}

// ── Student context ───────────────────────────────────────────────────────
async function buildStudentContext(userId, collegeId) {
  const [[student]] = await pool.query(
    'SELECT name, roll_no, department, semester FROM students WHERE id=?', [userId]
  );
  if (!student) throw new Error('Student not found');

  const [results]      = await pool.query('SELECT semester, subject, marks, max_marks, grade FROM results WHERE student_id=? ORDER BY semester, subject', [userId]);
  const [fees]         = await pool.query('SELECT description, amount, status, due_date FROM fees WHERE student_id=? ORDER BY created_at DESC', [userId]);
  const [leaves]       = await pool.query('SELECT reason, from_date, to_date, status, admin_remark FROM leaves WHERE student_id=? ORDER BY created_at DESC LIMIT 5', [userId]);
  const [notices]      = await pool.query('SELECT title, description, priority FROM notices WHERE college_id=? ORDER BY created_at DESC LIMIT 5', [collegeId]);
  const [placements]   = await pool.query('SELECT company_name, role, package, deadline FROM placements WHERE college_id=? ORDER BY created_at DESC LIMIT 5', [collegeId]);
  const [applications] = await pool.query(`SELECT p.company_name, p.role, pa.status FROM placement_applications pa JOIN placements p ON pa.placement_id=p.id WHERE pa.student_id=?`, [userId]);
  const [attendance]   = await pool.query('SELECT subject, semester, total_classes, attended FROM attendance WHERE student_id=? ORDER BY semester, subject', [userId]);
  const [timetable]    = await pool.query(`SELECT day, start_time, end_time, subject, teacher, room FROM timetable WHERE college_id=? ORDER BY FIELD(day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time`, [collegeId]);
  const [notes]        = await pool.query(`SELECT n.title, n.subject, n.type, n.deadline, f.name as faculty FROM notes n JOIN faculty f ON n.faculty_id=f.id WHERE n.college_id=? AND n.department=? ORDER BY n.created_at DESC LIMIT 10`, [collegeId, student.department]);
  const [helpdesk]     = await pool.query('SELECT subject, status FROM helpdesk WHERE student_id=? ORDER BY created_at DESC LIMIT 5', [userId]);
  const [library]      = await pool.query('SELECT book_name, issue_date, due_date, return_date FROM library_books WHERE student_id=? ORDER BY created_at DESC LIMIT 5', [userId]);

  const bySem = results.reduce((acc, r) => {
    const k = `Sem ${r.semester}`;
    (acc[k] = acc[k] || []).push(`${r.subject}: ${r.marks}/${r.max_marks} (${r.grade || '-'})`);
    return acc;
  }, {});

  const attLines = attendance.map(a => {
    const pct = a.total_classes > 0 ? Math.round((a.attended / a.total_classes) * 100) : 0;
    return `${a.subject} (Sem ${a.semester}): ${a.attended}/${a.total_classes} = ${pct}%${pct < 75 ? ' WARNING:LOW' : ''}`;
  });

  return `STUDENT: ${student.name} | Roll: ${student.roll_no || 'N/A'} | Dept: ${student.department || 'N/A'} | Sem: ${student.semester}

RESULTS:
${Object.entries(bySem).map(([s, r]) => `${s}: ${r.join(', ')}`).join('\n') || 'No results.'}

ATTENDANCE:
${attLines.join('\n') || 'No attendance records.'}

TIMETABLE:
${timetable.map(t => `${t.day} ${t.start_time?.slice(0,5)}-${t.end_time?.slice(0,5)}: ${t.subject} (${t.teacher || 'TBA'})${t.room ? ' Room ' + t.room : ''}`).join('\n') || 'No timetable.'}

STUDY MATERIALS:
${notes.map(n => `[${n.type.toUpperCase()}] ${n.title} - ${n.subject} by ${n.faculty}${n.deadline ? ' | Due: ' + new Date(n.deadline).toLocaleDateString() : ''}`).join('\n') || 'None.'}

FEES:
${fees.map(f => `${f.description || 'Fee'}: Rs.${f.amount} - ${f.status}${f.due_date ? ' (due ' + new Date(f.due_date).toLocaleDateString() + ')' : ''}`).join('\n') || 'No fees.'}

LEAVES:
${leaves.map(l => `${l.from_date} to ${l.to_date} | ${l.status} | ${l.reason}${l.admin_remark ? ' | Remark: ' + l.admin_remark : ''}`).join('\n') || 'None.'}

HELPDESK:
${helpdesk.map(h => `${h.subject} - ${h.status}`).join('\n') || 'None.'}

LIBRARY:
${library.map(b => `${b.book_name} | Due: ${b.due_date}${b.return_date ? ' | Returned' : ' | Not returned'}`).join('\n') || 'None.'}

NOTICES:
${notices.map(n => `[${n.priority.toUpperCase()}] ${n.title}: ${n.description}`).join('\n') || 'None.'}

PLACEMENTS:
${placements.map(p => `${p.company_name} - ${p.role} | Pkg: ${p.package || 'N/A'} | Deadline: ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A'}`).join('\n') || 'None.'}

MY APPLICATIONS:
${applications.length ? applications.map(a => `${a.company_name} (${a.role}): ${a.status}`).join('\n') : 'None.'}`;
}

// ── Admin context ─────────────────────────────────────────────────────────
async function buildAdminContext(collegeId) {
  const [[{ total_students }]]  = await pool.query('SELECT COUNT(*) as total_students FROM students WHERE college_id=?', [collegeId]);
  const [[{ fees_collected }]]  = await pool.query(`SELECT COALESCE(SUM(f.amount),0) as fees_collected FROM fees f JOIN students s ON f.student_id=s.id WHERE s.college_id=? AND f.status='paid'`, [collegeId]);
  const [[{ pending_fees_amt }]]= await pool.query(`SELECT COALESCE(SUM(f.amount),0) as pending_fees_amt FROM fees f JOIN students s ON f.student_id=s.id WHERE s.college_id=? AND f.status='pending'`, [collegeId]);
  const [[{ pending_leaves }]]  = await pool.query(`SELECT COUNT(*) as pending_leaves FROM leaves l JOIN students s ON l.student_id=s.id WHERE s.college_id=? AND l.status='pending'`, [collegeId]);
  const [[{ total_faculty }]]   = await pool.query('SELECT COUNT(*) as total_faculty FROM faculty WHERE college_id=?', [collegeId]);
  const [[{ open_tickets }]]    = await pool.query(`SELECT COUNT(*) as open_tickets FROM helpdesk h JOIN students s ON h.student_id=s.id WHERE s.college_id=? AND h.status='open'`, [collegeId]);
  const [[{ total_placements }]]= await pool.query('SELECT COUNT(*) as total_placements FROM placements WHERE college_id=?', [collegeId]);
  const [deptStats]             = await pool.query('SELECT department, COUNT(*) as count FROM students WHERE college_id=? GROUP BY department', [collegeId]);
  const [recentLeaves]          = await pool.query(`SELECT l.reason, l.from_date, l.to_date, l.status, s.name as student_name FROM leaves l JOIN students s ON l.student_id=s.id WHERE s.college_id=? ORDER BY l.created_at DESC LIMIT 5`, [collegeId]);
  const [recentTickets]         = await pool.query(`SELECT h.subject, h.status, h.priority, s.name as student_name FROM helpdesk h JOIN students s ON h.student_id=s.id WHERE s.college_id=? ORDER BY h.created_at DESC LIMIT 5`, [collegeId]);

  return `COLLEGE DASHBOARD:
Total Students: ${total_students} | Faculty: ${total_faculty}
Fees Collected: Rs.${Number(fees_collected).toLocaleString()} | Pending: Rs.${Number(pending_fees_amt).toLocaleString()}
Pending Leaves: ${pending_leaves} | Open Tickets: ${open_tickets} | Placements: ${total_placements}

DEPARTMENTS:
${deptStats.map(d => `${d.department}: ${d.count} students`).join('\n') || 'None.'}

RECENT LEAVES:
${recentLeaves.map(l => `${l.student_name}: ${l.from_date} to ${l.to_date} - ${l.status} | ${l.reason}`).join('\n') || 'None.'}

RECENT HELPDESK:
${recentTickets.map(t => `${t.student_name}: "${t.subject}" - ${t.status} [${t.priority}]`).join('\n') || 'None.'}`;
}

// ── Faculty context ───────────────────────────────────────────────────────
async function buildFacultyContext(userId, collegeId) {
  const [[faculty]] = await pool.query('SELECT name, department FROM faculty WHERE id=?', [userId]);
  if (!faculty) throw new Error('Faculty not found');

  const [timetable]     = await pool.query(`SELECT day, start_time, end_time, subject, room FROM timetable WHERE college_id=? AND teacher=? ORDER BY FIELD(day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), start_time`, [collegeId, faculty.name]);
  const [notes]         = await pool.query('SELECT title, subject, type, deadline, semester FROM notes WHERE faculty_id=? ORDER BY created_at DESC LIMIT 10', [userId]);
  const [[{ cnt }]]     = await pool.query('SELECT COUNT(*) as cnt FROM students WHERE college_id=? AND department=?', [collegeId, faculty.department]);
  const [pendingLeaves] = await pool.query(`SELECT l.reason, l.from_date, l.to_date, s.name, s.roll_no FROM leaves l JOIN students s ON l.student_id=s.id WHERE s.college_id=? AND s.department=? AND l.status='pending' ORDER BY l.created_at DESC LIMIT 5`, [collegeId, faculty.department]);

  return `FACULTY: ${faculty.name} | Dept: ${faculty.department} | Students: ${cnt}

TIMETABLE:
${timetable.map(t => `${t.day} ${t.start_time?.slice(0,5)}-${t.end_time?.slice(0,5)}: ${t.subject}${t.room ? ' Room ' + t.room : ''}`).join('\n') || 'No timetable.'}

POSTED MATERIALS:
${notes.map(n => `[${n.type.toUpperCase()}] ${n.title} - ${n.subject} Sem ${n.semester}${n.deadline ? ' | Due: ' + new Date(n.deadline).toLocaleDateString() : ''}`).join('\n') || 'None.'}

PENDING LEAVES IN DEPT:
${pendingLeaves.map(l => `${l.name} (${l.roll_no}): ${l.from_date} to ${l.to_date} | ${l.reason}`).join('\n') || 'None.'}`;
}

// ── Main chat ─────────────────────────────────────────────────────────────
async function chat({ message, userId, role, collegeId, history = [] }) {
  const key = getKey();

  let context = '';
  if (role === 'student')      context = await buildStudentContext(userId, collegeId);
  else if (role === 'faculty') context = await buildFacultyContext(userId, collegeId);
  else                         context = await buildAdminContext(collegeId);

  const systemPrompt = role === 'student'
    ? `You are ScholrERP AI, a friendly assistant for college students. Use the student's real ERP data to answer questions about results, attendance, fees, leaves, timetable, study materials, placements, helpdesk, and library. Be concise and warm. Use bullet points for lists. Address the student by first name. Warn about subjects with WARNING:LOW attendance. Only answer ERP or academic questions. Today: ${new Date().toLocaleDateString()}.\n\nDATA:\n${context}`
    : role === 'faculty'
    ? `You are ScholrERP AI, a professional assistant for college faculty. Use the faculty's real ERP data to answer questions about timetable, posted materials, students, and leaves. Be concise. Today: ${new Date().toLocaleDateString()}.\n\nDATA:\n${context}`
    : `You are ScholrERP AI, a smart assistant for college admins. Use the real ERP data to answer questions about students, fees, leaves, placements, and helpdesk. Be concise and use numbers. Today: ${new Date().toLocaleDateString()}.\n\nDATA:\n${context}`;

  // Build contents array: system prompt as first user turn, then history, then current message
  const contents = [
    { role: 'user',  parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am ScholrERP AI, ready to help.' }] },
    ...history.slice(-8).map(h => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  let lastErr;
  for (const model of MODELS) {
    try {
      return await callGemini(key, model, contents);
    } catch (e) {
      lastErr = e;
      if (e.status === 429 || e.status === 404) continue;
      throw e;
    }
  }
  throw lastErr;
}

module.exports = { chat };
