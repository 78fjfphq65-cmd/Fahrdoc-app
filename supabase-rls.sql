-- ============================================
-- FahrDoc — Row Level Security (RLS) Policies
-- ============================================
-- Since FahrDoc uses a custom session system (not Supabase Auth),
-- we enable RLS but grant full access to the service_role key.
-- The Express server validates auth via session tokens and enforces
-- access control at the application level.
-- 
-- This setup ensures:
-- 1. The anon key CANNOT access any data directly
-- 2. Only the service_role key (used by our server) can read/write
-- 3. All access control is handled by our Express middleware

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically in Supabase,
-- so we only need policies for the anon role (block everything).
-- No policies = no access for anon. RLS enabled + no policies = denied.

-- Done! The service_role key used by our Express server
-- automatically bypasses all RLS policies.
