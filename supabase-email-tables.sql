-- ============================================
-- FahrDoc — E-Mail Verifizierung & Passwort-Reset Tabellen
-- ============================================

-- Verification codes (for email verification after signup)
CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK(user_role IN ('school', 'instructor', 'student')),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email_verify' CHECK(type IN ('email_verify', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email, type, used);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id, type);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
