-- ============================================================
-- FahrDoc — Schueler-Adresse aufteilen
-- 2026-06-08 (v2)
-- Aufgeteilte Adressfelder; altes 'address' bleibt fuer Backward-Compat
-- (wird vom Server automatisch aus street/postal_code/city komponiert).
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS city TEXT;
