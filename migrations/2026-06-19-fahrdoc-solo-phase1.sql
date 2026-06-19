-- FahrDoc Solo Phase 1 Migration
-- Datum: 2026-06-19
-- Zweck: Solo-Fahrlehrer-Accounts ohne Fahrschule ermöglichen

-- instructors: school_id optional, Solo-Account-Felder
ALTER TABLE instructors ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'employed'
  CHECK (account_type IN ('employed','solo'));
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE instructors ADD COLUMN IF NOT EXISTS solo_trial_ends_at TIMESTAMPTZ;

-- students: school_id optional, Owner-Verknüpfung für Solo
ALTER TABLE students ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS owner_instructor_id TEXT REFERENCES instructors(id);
CREATE INDEX IF NOT EXISTS idx_students_owner_instructor ON students(owner_instructor_id);

-- lessons: school_id optional (Solo-Fahrlehrer hat keine Schule)
ALTER TABLE lessons ALTER COLUMN school_id DROP NOT NULL;
