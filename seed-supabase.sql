-- ============================================
-- FahrDoc — Demo-Daten für Supabase
-- ============================================
-- Passwort für alle Demo-Accounts: demo123
-- bcrypt hash von 'demo123' (10 rounds):
-- $2a$10$XQxBj8qXqM0vJxKG8zJHGeYFO.Hh9HfEjXqmrHBfGdYkqxKXxKKm6

-- Zuerst: bcrypt hash generieren wir im seed-script
-- Hier nutzen wir einen vorgenerierten Hash

-- ============================================
-- SCHOOLS
-- ============================================
INSERT INTO schools (id, name, admin_name, email, password_hash, phone, address, verified) VALUES
  ('sch1', 'Fahrschule Weber', 'Markus Weber', 'admin@fahrschule-weber.de', '$placeholder$', '030 1234567', 'Berliner Str. 50, 10115 Berlin', 1),
  ('sch2', 'Fahrschule Müller', 'Anna Müller', 'admin@fahrschule-mueller.de', '$placeholder$', '030 9876543', 'Hauptstr. 22, 10827 Berlin', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
INSERT INTO subscriptions (id, school_id, max_seats, trial_start, trial_end, is_active) VALUES
  ('sub1', 'sch1', 10, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 1),
  ('sub2', 'sch2', 5, '2026-02-01', CURRENT_DATE - INTERVAL '7 days', 1)
ON CONFLICT (school_id) DO NOTHING;

-- ============================================
-- INSTRUCTORS
-- ============================================
INSERT INTO instructors (id, name, email, password_hash, phone, school_id, verified) VALUES
  ('i1', 'Thomas Weber', 'thomas@fahrschule-weber.de', '$placeholder$', '0170 1234567', 'sch1', 1),
  ('i2', 'Lisa Müller', 'lisa@fahrschule-mueller.de', '$placeholder$', '0171 9876543', 'sch2', 1),
  ('i3', 'Sarah Klein', 'sarah@fahrschule-weber.de', '$placeholder$', '0173 5556789', 'sch1', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STUDENTS
-- ============================================
INSERT INTO students (id, name, email, password_hash, phone, birthdate, address, license_class, school_id, status, verified) VALUES
  ('s1', 'Max Schneider', 'max@email.de', '$placeholder$', '0152 1111111', '2006-05-15', 'Berliner Str. 12, 10115 Berlin', 'B', 'sch1', 'active', 1),
  ('s2', 'Sophie Becker', 'sophie@email.de', '$placeholder$', '0152 2222222', '2007-02-20', 'Hauptstr. 45, 10827 Berlin', 'B', 'sch1', 'active', 1),
  ('s3', 'Jonas Fischer', 'jonas@email.de', '$placeholder$', '0152 3333333', '2006-11-03', 'Schönhauser Allee 78, 10439 Berlin', 'A1', 'sch2', 'active', 1),
  ('s4', 'Emma Wagner', 'emma@email.de', '$placeholder$', '0152 4444444', '2005-08-22', 'Friedrichstr. 100, 10117 Berlin', 'B', 'sch2', 'completed', 1),
  ('s5', 'Lena Hoffmann', 'lena@email.de', '$placeholder$', '0152 5555555', '2007-09-10', 'Alexanderplatz 3, 10178 Berlin', 'B', 'sch1', 'active', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STUDENT-INSTRUCTOR LINKS
-- ============================================
INSERT INTO student_instructors (student_id, instructor_id) VALUES
  ('s1', 'i1'), ('s2', 'i1'), ('s3', 'i2'), ('s4', 'i2'), ('s1', 'i3')
ON CONFLICT DO NOTHING;

-- ============================================
-- INVITE CODES
-- ============================================
INSERT INTO invite_codes (id, code, school_id, type, status, used_by, used_by_id) VALUES
  ('ic1', 'FL-WEBER-01', 'sch1', 'instructor', 'verwendet', 'Thomas Weber', 'i1'),
  ('ic2', 'FL-WEBER-02', 'sch1', 'instructor', 'verwendet', 'Sarah Klein', 'i3'),
  ('ic3', 'FL-WEBER-03', 'sch1', 'instructor', 'offen', NULL, NULL),
  ('ic4', 'FS-WEBER-001', 'sch1', 'student', 'verwendet', 'Max Schneider', 's1'),
  ('ic5', 'FS-WEBER-002', 'sch1', 'student', 'verwendet', 'Sophie Becker', 's2'),
  ('ic6', 'FS-WEBER-003', 'sch1', 'student', 'offen', NULL, NULL),
  ('ic7', 'FL-MUELL-01', 'sch2', 'instructor', 'verwendet', 'Lisa Müller', 'i2'),
  ('ic8', 'FS-MUELL-001', 'sch2', 'student', 'verwendet', 'Jonas Fischer', 's3'),
  ('ic9', 'FS-MUELL-002', 'sch2', 'student', 'verwendet', 'Emma Wagner', 's4')
ON CONFLICT (id) DO NOTHING;
