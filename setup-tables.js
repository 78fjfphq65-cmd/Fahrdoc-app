/* ============================================
   FahrDoc — Setup Tables for Theory Planning & Recurring Appointments
   Run once: node setup-tables.js
   ============================================ */
const { Client } = require('pg');

const DB_PASSWORD = 'Yoengel.1fahrdoc';
const PROJECT_REF = 'tjqobyorudyvgmqwfpox';

const TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS recurring_groups (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    instructor_id TEXT NOT NULL,
    student_id TEXT,
    vehicle_id TEXT,
    license_class TEXT DEFAULT 'B',
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    type TEXT DEFAULT 'Übungsfahrt',
    frequency TEXT DEFAULT 'weekly',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS theory_rooms (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    seat_limit INTEGER DEFAULT 25,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS theory_topics (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    topic_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_basic BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS theory_schedule (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    room_id TEXT,
    topic_id TEXT,
    topic_number INTEGER,
    instructor_id TEXT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'geplant',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS theory_attendance (
    id TEXT PRIMARY KEY,
    theory_schedule_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    is_present BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS theory_rotation (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    room_id TEXT,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    start_topic_number INTEGER DEFAULT 1,
    frequency_weeks INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
];

async function createTables() {
  console.log('=== FahrDoc Table Setup ===\n');

  const client = new Client({
    host: 'db.' + PROJECT_REF + '.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database!\n');

    for (const sql of TABLES_SQL) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      await client.query(sql);
      console.log('  [OK] Table "' + tableName + '" created/verified');
    }

    console.log('\nAll tables created successfully!');
  } catch (err) {
    console.error('Database error:', err.message);
    console.log('\nIf direct connection fails, run this SQL in the Supabase Dashboard SQL Editor:');
    console.log(TABLES_SQL.join(';\n') + ';');
  } finally {
    await client.end();
  }
}

createTables();
