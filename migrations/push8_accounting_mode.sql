-- Push 8: GoBD-konformer Buchhaltungs-Modus pro Fahrschule
-- Fahrschulen können wählen: 'gobd' (Default, volle Buchhaltung in FahrDoc)
-- oder 'external' (Buchhaltung extern, FahrDoc nur als Tätigkeitsnachweis)

-- 1) Spalten an schools-Tabelle
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS accounting_mode TEXT NOT NULL DEFAULT 'gobd'
    CHECK (accounting_mode IN ('gobd','external'));

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS accounting_mode_changed_at TIMESTAMPTZ;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS accounting_mode_disclaimer_accepted_at TIMESTAMPTZ;

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS accounting_mode_disclaimer_accepted_by TEXT;

-- 2) Audit-Log-Tabelle für Modus-Wechsel (GoBD: Nachvollziehbarkeit)
CREATE TABLE IF NOT EXISTS accounting_mode_changes (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  changed_by_id   TEXT NOT NULL,
  from_mode       TEXT NOT NULL,
  to_mode         TEXT NOT NULL,
  disclaimer_text TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acc_mode_changes_school
  ON accounting_mode_changes(school_id, created_at DESC);
