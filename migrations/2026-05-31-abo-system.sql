-- =====================================================
-- FahrDoc Abo-System Migration
-- Datum: 31.05.2026
-- Ausfuehren in: Supabase SQL Editor
-- =====================================================

-- 1) Neue Spalten fuer Tarif-Modell
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'classic';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_extended_until TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS free_subscription BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS free_subscription_until TIMESTAMPTZ;

-- 2) Bestandsschutz: Alle bestehenden Fahrschulen bekommen +14 Tage Trial ab heute
UPDATE subscriptions
SET trial_extended_until = (NOW() + INTERVAL '14 days')
WHERE trial_extended_until IS NULL
  AND stripe_subscription_id IS NULL;

-- 3) Schulen-Tabelle: created_at falls noch nicht vorhanden
ALTER TABLE schools ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4) Sicher gehen, dass jede bestehende Schule ein subscriptions-Row hat
INSERT INTO subscriptions (id, school_id, trial_extended_until)
SELECT
  gen_random_uuid()::text,
  s.id,
  NOW() + INTERVAL '14 days'
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions sub WHERE sub.school_id = s.id
);

-- 5) Index fuer schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);

-- 6) KI-Briefings-Tabelle (Verlauf, Caching)
CREATE TABLE IF NOT EXISTS ai_briefings (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  instructor_id TEXT,
  content TEXT NOT NULL,
  lesson_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_briefings_student ON ai_briefings(student_id, created_at DESC);

-- =====================================================
-- FERTIG. Pruefen:
-- SELECT id, school_id, plan, trial_extended_until, free_subscription FROM subscriptions LIMIT 10;
-- =====================================================
