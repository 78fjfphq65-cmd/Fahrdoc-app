-- ============================================
-- FahrDoc — PostgreSQL Schema for Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schools (Fahrschulen)
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  name TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified INTEGER DEFAULT 0
);

-- Subscriptions (per school)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  school_id TEXT NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  plan_name TEXT DEFAULT 'Basis',
  max_seats INTEGER DEFAULT 10,
  price_per_seat REAL DEFAULT 4.90,
  trial_start DATE DEFAULT CURRENT_DATE,
  trial_end DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  is_active INTEGER DEFAULT 1,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Instructors (Fahrlehrer)
CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified INTEGER DEFAULT 0
);

-- Students (Fahrschüler)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  birthdate TEXT,
  address TEXT,
  license_class TEXT DEFAULT 'B',
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  verified INTEGER DEFAULT 0
);

-- Student-Instructor junction table (many-to-many)
CREATE TABLE IF NOT EXISTS student_instructors (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (student_id, instructor_id)
);

-- Invitation Codes
CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  code TEXT UNIQUE NOT NULL,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('instructor', 'student')),
  status TEXT DEFAULT 'offen' CHECK(status IN ('offen', 'verwendet')),
  used_by TEXT,
  used_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lessons (documented driving lessons — no cost field)
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  instructor_id TEXT NOT NULL REFERENCES instructors(id),
  school_id TEXT NOT NULL REFERENCES schools(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  notes TEXT,
  license_class TEXT DEFAULT 'B',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lesson Images (base64 data for now, migrate to Storage later)
CREATE TABLE IF NOT EXISTS lesson_images (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Skill Ratings (per lesson)
CREATE TABLE IF NOT EXISTS skill_ratings (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 4),
  UNIQUE(lesson_id, skill_name)
);

-- Scheduled Lessons (Fahrstundenplanung)
CREATE TABLE IF NOT EXISTS scheduled_lessons (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Übungsfahrt',
  license_class TEXT DEFAULT 'B',
  status TEXT NOT NULL DEFAULT 'offen' CHECK(status IN ('offen', 'geplant', 'bestätigt', 'abgeschlossen')),
  notes TEXT,
  created_by_role TEXT NOT NULL DEFAULT 'instructor' CHECK(created_by_role IN ('instructor', 'school')),
  created_by_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK(user_role IN ('school', 'instructor', 'student')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK(user_role IN ('school', 'instructor', 'student')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Privacy/DSGVO consents
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT
);

-- Route tracking data per lesson
CREATE TABLE IF NOT EXISTS lesson_routes (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  route_data TEXT NOT NULL,
  markers TEXT,
  distance_km REAL DEFAULT 0,
  avg_speed_kmh REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback / Support
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK(user_role IN ('school', 'instructor')),
  user_name TEXT,
  user_email TEXT,
  category TEXT NOT NULL DEFAULT 'feedback',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_instructor_date ON scheduled_lessons(instructor_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_school_date ON scheduled_lessons(school_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_role, is_read);
CREATE INDEX IF NOT EXISTS idx_student_instructors_student ON student_instructors(student_id);
CREATE INDEX IF NOT EXISTS idx_student_instructors_instructor ON student_instructors(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lesson_images_lesson ON lesson_images(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_routes_lesson ON lesson_routes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_student ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_instructor ON lessons(instructor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_school ON lessons(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_instructors_school ON instructors(school_id);
