-- ============================================================
-- FahrDoc — Schüler-Stammdaten erweitern
-- 2026-06-08
-- Zusätzliche Felder für manuelle Schüler-Anlage durch Fahrschule
-- ============================================================

-- 1) Neue Spalten an students anhängen (idempotent, kein Datenverlust)
ALTER TABLE students ADD COLUMN IF NOT EXISTS registered_at DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS bf17 BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2) password_hash darf NULL sein (manuell angelegte Schüler haben noch kein Passwort)
ALTER TABLE students ALTER COLUMN password_hash DROP NOT NULL;

-- 3) Setup-Token-Typ in verification_codes erlauben
-- Hinweis: Der CHECK-Constraint in supabase-email-tables.sql erlaubt nur
-- 'email_verify' und 'password_reset'. Wir erweitern um 'password_set'.
-- (Verträgt sich mit der bestehenden Magic-Link-Logik)
DO $$
BEGIN
  -- alter constraint falls vorhanden
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='verification_codes' AND constraint_type='CHECK'
      AND constraint_name LIKE '%type_check%'
  ) THEN
    EXECUTE 'ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_type_check';
  END IF;
  EXECUTE 'ALTER TABLE verification_codes ADD CONSTRAINT verification_codes_type_check
    CHECK (type IN (''email_verify'', ''password_reset'', ''password_set''))';
EXCEPTION WHEN OTHERS THEN
  -- Falls Constraint anders heißt oder bereits gesetzt ist, ignorieren
  NULL;
END $$;

-- 4) Komfort-Index: Setup-Token-Lookup
CREATE INDEX IF NOT EXISTS idx_verification_codes_code
  ON verification_codes(code, type, used);
