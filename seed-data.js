/* ============================================
   FahrDoc — Seed Demo Data into Supabase
   ============================================ */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const pw = bcrypt.hashSync('demo123', 10);

function genId() { return crypto.randomBytes(8).toString('hex'); }

async function seed() {
  console.log('[SEED] Starting...');

  // Check if already seeded
  const { data: existing } = await supabase.from('schools').select('id').limit(1);
  if (existing && existing.length > 0) {
    console.log('[SEED] Data already exists, skipping.');
    return;
  }

  // === SCHOOLS ===
  console.log('[SEED] Schools...');
  await supabase.from('schools').insert([
    { id: 'sch1', name: 'Fahrschule Weber', admin_name: 'Markus Weber', email: 'admin@fahrschule-weber.de', password_hash: pw, phone: '030 1234567', address: 'Berliner Str. 50, 10115 Berlin', verified: 1 },
    { id: 'sch2', name: 'Fahrschule Müller', admin_name: 'Anna Müller', email: 'admin@fahrschule-mueller.de', password_hash: pw, phone: '030 9876543', address: 'Hauptstr. 22, 10827 Berlin', verified: 1 },
  ]);

  // === SUBSCRIPTIONS ===
  console.log('[SEED] Subscriptions...');
  const now = new Date();
  const trialEnd1 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const trialEnd2 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  await supabase.from('subscriptions').insert([
    { id: 'sub1', school_id: 'sch1', max_seats: 10, trial_start: now.toISOString().split('T')[0], trial_end: trialEnd1, is_active: 1 },
    { id: 'sub2', school_id: 'sch2', max_seats: 5, trial_start: '2026-02-01', trial_end: trialEnd2, is_active: 1 },
  ]);

  // === INSTRUCTORS ===
  console.log('[SEED] Instructors...');
  await supabase.from('instructors').insert([
    { id: 'i1', name: 'Thomas Weber', email: 'thomas@fahrschule-weber.de', password_hash: pw, phone: '0170 1234567', school_id: 'sch1', verified: 1 },
    { id: 'i2', name: 'Lisa Müller', email: 'lisa@fahrschule-mueller.de', password_hash: pw, phone: '0171 9876543', school_id: 'sch2', verified: 1 },
    { id: 'i3', name: 'Sarah Klein', email: 'sarah@fahrschule-weber.de', password_hash: pw, phone: '0173 5556789', school_id: 'sch1', verified: 1 },
  ]);

  // === STUDENTS ===
  console.log('[SEED] Students...');
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('students').insert([
    { id: 's1', name: 'Max Schneider', email: 'max@email.de', password_hash: pw, phone: '0152 1111111', birthdate: '2006-05-15', address: 'Berliner Str. 12, 10115 Berlin', license_class: 'B', school_id: 'sch1', status: 'active', verified: 1 },
    { id: 's2', name: 'Sophie Becker', email: 'sophie@email.de', password_hash: pw, phone: '0152 2222222', birthdate: '2007-02-20', address: 'Hauptstr. 45, 10827 Berlin', license_class: 'B', school_id: 'sch1', status: 'active', verified: 1 },
    { id: 's3', name: 'Jonas Fischer', email: 'jonas@email.de', password_hash: pw, phone: '0152 3333333', birthdate: '2006-11-03', address: 'Schönhauser Allee 78, 10439 Berlin', license_class: 'A1', school_id: 'sch2', status: 'active', verified: 1 },
    { id: 's4', name: 'Emma Wagner', email: 'emma@email.de', password_hash: pw, phone: '0152 4444444', birthdate: '2005-08-22', address: 'Friedrichstr. 100, 10117 Berlin', license_class: 'B', school_id: 'sch2', status: 'completed', verified: 1 },
    { id: 's5', name: 'Lena Hoffmann', email: 'lena@email.de', password_hash: pw, phone: '0152 5555555', birthdate: '2007-09-10', address: 'Alexanderplatz 3, 10178 Berlin', license_class: 'B', school_id: 'sch1', status: 'active', created_at: twoDaysAgo, verified: 1 },
  ]);

  // === STUDENT-INSTRUCTOR LINKS ===
  console.log('[SEED] Student-Instructor links...');
  await supabase.from('student_instructors').insert([
    { student_id: 's1', instructor_id: 'i1' },
    { student_id: 's2', instructor_id: 'i1' },
    { student_id: 's3', instructor_id: 'i2' },
    { student_id: 's4', instructor_id: 'i2' },
    { student_id: 's1', instructor_id: 'i3' },
  ]);

  // === INVITE CODES ===
  console.log('[SEED] Invite codes...');
  await supabase.from('invite_codes').insert([
    { id: genId(), code: 'FL-WEBER-01', school_id: 'sch1', type: 'instructor', status: 'verwendet', used_by: 'Thomas Weber', used_by_id: 'i1' },
    { id: genId(), code: 'FL-WEBER-02', school_id: 'sch1', type: 'instructor', status: 'verwendet', used_by: 'Sarah Klein', used_by_id: 'i3' },
    { id: genId(), code: 'FL-WEBER-03', school_id: 'sch1', type: 'instructor', status: 'offen', used_by: null, used_by_id: null },
    { id: genId(), code: 'FS-WEBER-001', school_id: 'sch1', type: 'student', status: 'verwendet', used_by: 'Max Schneider', used_by_id: 's1' },
    { id: genId(), code: 'FS-WEBER-002', school_id: 'sch1', type: 'student', status: 'verwendet', used_by: 'Sophie Becker', used_by_id: 's2' },
    { id: genId(), code: 'FS-WEBER-003', school_id: 'sch1', type: 'student', status: 'offen', used_by: null, used_by_id: null },
    { id: genId(), code: 'FL-MUELL-01', school_id: 'sch2', type: 'instructor', status: 'verwendet', used_by: 'Lisa Müller', used_by_id: 'i2' },
    { id: genId(), code: 'FS-MUELL-001', school_id: 'sch2', type: 'student', status: 'verwendet', used_by: 'Jonas Fischer', used_by_id: 's3' },
    { id: genId(), code: 'FS-MUELL-002', school_id: 'sch2', type: 'student', status: 'verwendet', used_by: 'Emma Wagner', used_by_id: 's4' },
  ]);

  // === LESSONS ===
  console.log('[SEED] Lessons + Skill Ratings...');
  const SKILL_TASKS = ['Abbiegen', 'Spurwechsel', 'Vorfahrt', 'Einparken', 'Geschwindigkeit', 'Verkehrszeichen', 'Schulterblick', 'Allgemeines Fahrverhalten'];
  const types = ['Übungsfahrt', 'Übungsfahrt', 'Überlandfahrt', 'Autobahnfahrt', 'Nachtfahrt', 'Prüfungsvorbereitung'];
  const notesArr = ['Generell gute Fahrstunde. Noch an Schulterblick arbeiten.', 'Generell gute Fahrstunde. Einparken verbessert sich.'];

  const studentLessons = [
    { id: 's1', instId: 'i1', schoolId: 'sch1', count: 7, cls: 'B' },
    { id: 's2', instId: 'i1', schoolId: 'sch1', count: 6, cls: 'B' },
    { id: 's3', instId: 'i2', schoolId: 'sch2', count: 8, cls: 'A1' },
    { id: 's4', instId: 'i2', schoolId: 'sch2', count: 5, cls: 'B' },
    { id: 's1', instId: 'i3', schoolId: 'sch1', count: 2, cls: 'B' },
  ];

  const allLessons = [];
  const allRatings = [];

  for (const sl of studentLessons) {
    for (let i = 0; i < sl.count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const duration = 45 + Math.floor(Math.random() * 50);
      const dayOffset = (sl.count - i) * (3 + Math.floor(Math.random() * 4));
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      const lessonId = `l${sl.id}_${sl.instId}_${i}`;
      const dateStr = d.toISOString().split('T')[0];

      allLessons.push({
        id: lessonId, student_id: sl.id, instructor_id: sl.instId,
        school_id: sl.schoolId, date: dateStr, type, duration,
        notes: notesArr[i % 2], license_class: sl.cls
      });

      for (const task of SKILL_TASKS) {
        const rating = 1 + Math.floor(Math.random() * 4);
        allRatings.push({
          id: genId(), lesson_id: lessonId, student_id: sl.id,
          skill_name: task, rating
        });
      }
    }
  }

  // Insert in batches
  for (let i = 0; i < allLessons.length; i += 50) {
    const { error } = await supabase.from('lessons').insert(allLessons.slice(i, i + 50));
    if (error) console.error('Lesson insert error:', error.message);
  }
  for (let i = 0; i < allRatings.length; i += 100) {
    const { error } = await supabase.from('skill_ratings').insert(allRatings.slice(i, i + 100));
    if (error) console.error('Rating insert error:', error.message);
  }

  // === SCHEDULED LESSONS ===
  console.log('[SEED] Scheduled lessons...');
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  function getDateStr(dayOffset) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
  }

  const scheduledSlots = [
    // Thomas Weber (i1)
    { id: 'sched_t_0', inst: 'i1', school: 'sch1', stu: 's1', day: 0, start: '08:00', end: '09:30', type: 'Übungsfahrt', status: 'bestätigt', cls: 'B' },
    { id: 'sched_t_1', inst: 'i1', school: 'sch1', stu: 's2', day: 0, start: '10:00', end: '11:30', type: 'Übungsfahrt', status: 'bestätigt', cls: 'B' },
    { id: 'sched_t_2', inst: 'i1', school: 'sch1', stu: null, day: 0, start: '14:00', end: '15:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    { id: 'sched_t_3', inst: 'i1', school: 'sch1', stu: 's1', day: 1, start: '09:00', end: '10:30', type: 'Prüfungsvorbereitung', status: 'geplant', cls: 'B' },
    { id: 'sched_t_4', inst: 'i1', school: 'sch1', stu: null, day: 1, start: '11:00', end: '12:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    { id: 'sched_t_5', inst: 'i1', school: 'sch1', stu: 's2', day: 1, start: '14:00', end: '17:45', type: 'Überlandfahrt', status: 'bestätigt', cls: 'B' },
    { id: 'sched_t_6', inst: 'i1', school: 'sch1', stu: 's2', day: 2, start: '08:00', end: '09:30', type: 'Übungsfahrt', status: 'geplant', cls: 'B' },
    { id: 'sched_t_7', inst: 'i1', school: 'sch1', stu: 's1', day: 2, start: '10:00', end: '11:30', type: 'Übungsfahrt', status: 'bestätigt', cls: 'B' },
    { id: 'sched_t_8', inst: 'i1', school: 'sch1', stu: null, day: 2, start: '15:00', end: '16:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    { id: 'sched_t_9', inst: 'i1', school: 'sch1', stu: 's1', day: 3, start: '09:00', end: '12:00', type: 'Autobahnfahrt', status: 'geplant', cls: 'B' },
    { id: 'sched_t_10', inst: 'i1', school: 'sch1', stu: null, day: 3, start: '14:00', end: '15:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    { id: 'sched_t_11', inst: 'i1', school: 'sch1', stu: 's2', day: 4, start: '08:00', end: '09:30', type: 'Übungsfahrt', status: 'bestätigt', cls: 'B' },
    { id: 'sched_t_12', inst: 'i1', school: 'sch1', stu: 's1', day: 4, start: '10:00', end: '10:55', type: 'Praktische Prüfung', status: 'bestätigt', cls: 'B' },
    { id: 'sched_t_13', inst: 'i1', school: 'sch1', stu: 's2', day: 4, start: '14:00', end: '16:15', type: 'Nachtfahrt', status: 'geplant', cls: 'B' },
    { id: 'sched_t_14', inst: 'i1', school: 'sch1', stu: null, day: 5, start: '09:00', end: '10:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    // Sarah Klein (i3)
    { id: 'sched_s_0', inst: 'i3', school: 'sch1', stu: null, day: 0, start: '09:00', end: '10:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    { id: 'sched_s_1', inst: 'i3', school: 'sch1', stu: 's1', day: 1, start: '10:00', end: '11:30', type: 'Übungsfahrt', status: 'geplant', cls: 'B' },
    { id: 'sched_s_2', inst: 'i3', school: 'sch1', stu: null, day: 3, start: '14:00', end: '15:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    { id: 'sched_s_3', inst: 'i3', school: 'sch1', stu: 's2', day: 4, start: '08:00', end: '09:30', type: 'Übungsfahrt', status: 'bestätigt', cls: 'B' },
    // Lisa Müller (i2)
    { id: 'sched_l_0', inst: 'i2', school: 'sch2', stu: 's3', day: 0, start: '08:00', end: '09:30', type: 'Übungsfahrt', status: 'bestätigt', cls: 'A1' },
    { id: 'sched_l_1', inst: 'i2', school: 'sch2', stu: 's3', day: 1, start: '10:00', end: '11:30', type: 'Übungsfahrt', status: 'geplant', cls: 'A1' },
    { id: 'sched_l_2', inst: 'i2', school: 'sch2', stu: null, day: 2, start: '09:00', end: '10:30', type: 'Übungsfahrt', status: 'offen', cls: 'B' },
    { id: 'sched_l_3', inst: 'i2', school: 'sch2', stu: 's3', day: 3, start: '14:00', end: '15:30', type: 'Prüfungsvorbereitung', status: 'bestätigt', cls: 'A1' },
    { id: 'sched_l_4', inst: 'i2', school: 'sch2', stu: 's3', day: 4, start: '08:00', end: '08:55', type: 'Praktische Prüfung', status: 'geplant', cls: 'A1' },
  ];

  const schedRows = scheduledSlots.map(s => ({
    id: s.id, instructor_id: s.inst, school_id: s.school,
    student_id: s.stu, date: getDateStr(s.day),
    start_time: s.start, end_time: s.end, type: s.type,
    license_class: s.cls, status: s.status,
    created_by_role: 'instructor', created_by_id: s.inst
  }));

  const { error: schedErr } = await supabase.from('scheduled_lessons').insert(schedRows);
  if (schedErr) console.error('Schedule insert error:', schedErr.message);

  // === NOTIFICATIONS ===
  console.log('[SEED] Notifications...');
  await supabase.from('notifications').insert([
    { id: genId(), user_id: 'i1', user_role: 'instructor', type: 'schedule_created', title: 'Neuer Termin', message: 'Admin hat einen Termin für Freitag 08:00 erstellt', reference_id: 'sched_t_11', is_read: 0 },
    { id: genId(), user_id: 'i1', user_role: 'instructor', type: 'schedule_updated', title: 'Termin geändert', message: 'Übungsfahrt am Mittwoch wurde auf 10:00 verschoben', reference_id: 'sched_t_7', is_read: 1 },
    { id: genId(), user_id: 'i3', user_role: 'instructor', type: 'schedule_created', title: 'Neuer Termin', message: 'Admin hat einen Termin für Donnerstag 14:00 erstellt', reference_id: 'sched_s_2', is_read: 0 },
  ]);

  console.log('[SEED] Done! All demo data inserted.');
}

seed().catch(err => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
