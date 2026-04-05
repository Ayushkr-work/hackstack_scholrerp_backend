const mysql  = require('mysql2/promise');
require('dotenv').config();

const initDB = async () => {
  const dbName = process.env.DB_NAME || 'college_erp';

  const conn = await mysql.createConnection({
    host:               process.env.DB_HOST     || 'localhost',
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    port:               process.env.DB_PORT     || 3306,
    multipleStatements: true,
    connectTimeout:     30000,
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS colleges (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        address    TEXT,
        phone      VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        college_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS students (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        roll_no    VARCHAR(50),
        department VARCHAR(100),
        semester   INT DEFAULT 1,
        phone      VARCHAR(20),
        address    TEXT,
        avatar     VARCHAR(255),
        college_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS results (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        semester   INT NOT NULL,
        subject    VARCHAR(255) NOT NULL,
        marks      INT NOT NULL,
        max_marks  INT DEFAULT 100,
        grade      VARCHAR(5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        subject    VARCHAR(255) NOT NULL,
        semester   INT NOT NULL,
        total_classes INT DEFAULT 0,
        attended   INT DEFAULT 0,
        college_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        college_id  INT NOT NULL,
        priority    ENUM('low','medium','high') DEFAULT 'medium',
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        student_id   INT NOT NULL,
        reason       TEXT NOT NULL,
        from_date    DATE NOT NULL,
        to_date      DATE NOT NULL,
        status       ENUM('pending','approved','rejected') DEFAULT 'pending',
        admin_remark TEXT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS fees (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        student_id  INT NOT NULL,
        amount      DECIMAL(10,2) NOT NULL,
        description VARCHAR(255),
        status      ENUM('pending','paid','failed') DEFAULT 'pending',
        payment_id  VARCHAR(255),
        order_id    VARCHAR(255),
        due_date    DATE,
        paid_at     TIMESTAMP NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS placements (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        role         VARCHAR(255) NOT NULL,
        description  TEXT,
        eligibility  TEXT,
        package      VARCHAR(100),
        deadline     DATE,
        college_id   INT NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS placement_applications (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        student_id   INT NOT NULL,
        placement_id INT NOT NULL,
        status       ENUM('applied','shortlisted','rejected','selected') DEFAULT 'applied',
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id)   REFERENCES students(id)   ON DELETE CASCADE,
        FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE CASCADE,
        UNIQUE KEY unique_app (student_id, placement_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS helpdesk (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        student_id  INT NOT NULL,
        subject     VARCHAR(255) NOT NULL,
        category    VARCHAR(100) DEFAULT 'General',
        priority    ENUM('low','medium','high') DEFAULT 'medium',
        description TEXT NOT NULL,
        status      ENUM('open','in-progress','resolved') DEFAULT 'open',
        admin_reply TEXT,
        resolved_at TIMESTAMP NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        token      VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used       TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS password_reset_logs (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        student_id   INT NOT NULL,
        student_name VARCHAR(255),
        email        VARCHAR(255),
        reset_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS faculty (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        phone      VARCHAR(20),
        college_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS xerox_requests (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        student_id  INT NOT NULL,
        college_id  INT NOT NULL,
        file_name   VARCHAR(255) NOT NULL,
        file_path   VARCHAR(500) NOT NULL,
        copies      INT DEFAULT 1,
        color       ENUM('bw','color') DEFAULT 'bw',
        sides       ENUM('single','double') DEFAULT 'single',
        note        TEXT,
        status      ENUM('pending','processing','ready','collected') DEFAULT 'pending',
        admin_note  TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        faculty_id   INT NOT NULL,
        college_id   INT NOT NULL,
        title        VARCHAR(255) NOT NULL,
        content      TEXT,
        subject      VARCHAR(100),
        department   VARCHAR(100),
        semester     INT,
        type         ENUM('note','assignment') DEFAULT 'note',
        deadline     DATE NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS library_books (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        student_id  INT NOT NULL,
        book_name   VARCHAR(255) NOT NULL,
        book_author VARCHAR(255),
        issue_date  DATE NOT NULL,
        due_date    DATE NOT NULL,
        return_date DATE NULL,
        fine_per_day DECIMAL(6,2) DEFAULT 5.00,
        college_id  INT NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ DB Init Error:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
};

module.exports = initDB;
