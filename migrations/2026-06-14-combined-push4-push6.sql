-- ============================================================
-- FahrDoc — Kombinierte Migration (Push 4 + Push 6)
-- 2026-06-14
--
-- Push 4:
--   (a) lessons.billing_category   — regular / free / trial
--   (b) Soft-Delete: deleted_at, deleted_by, deleted_by_role
--       → Stunden aus Fahrschul-Sicht verstecken, Schüler sieht sie weiter
--
-- Push 6:
--   (c) schools.price_categories   — JSONB-Array Label-Liste pro Schule
--       Defaults: Normal / Family & Friends / Mitarbeiter
--   (d) students.price_category    — TEXT (id-Referenz auf price_categories)
-- ============================================================

-- ============================================================
-- PUSH 4 — Fahrstunden: Verrechnungs-Kategorie + Soft-Delete
-- ============================================================

-- 1) Verrechnungs-Kategorie
--    'regular'  → erzeugt Soll-Position, Soft-Delete
--    'free'     → kein Soll, aber zählt für Ausbildungsnachweis, Soft-Delete
--    'trial'    → Schnupperfahrt, kein Vertrag/Nachweis, Hard-Delete möglich
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS billing_category TEXT NOT NULL DEFAULT 'regular';

-- 2) Soft-Delete-Felder
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS deleted_by_role TEXT;

-- 3) Index für schnelles Filtern aktiver Stunden
CREATE INDEX IF NOT EXISTS idx_lessons_active
  ON lessons(school_id, date) WHERE deleted_at IS NULL;

-- 4) Constraint: billing_category muss einer der erlaubten Werte sein
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='lessons' AND constraint_name='lessons_billing_category_check'
  ) THEN
    ALTER TABLE lessons ADD CONSTRAINT lessons_billing_category_check
      CHECK (billing_category IN ('regular','free','trial'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- PUSH 6 — Preiskategorien pro Schüler (nur Labels, keine Preise)
-- ============================================================

-- 5) Preiskategorien pro Fahrschule (JSONB-Array)
--    Struktur: [{"id":"normal","label":"Normal"}, ...]
--    Defaults: Normal / Family & Friends / Mitarbeiter
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS price_categories JSONB NOT NULL
  DEFAULT '[
    {"id":"normal","label":"Normal"},
    {"id":"ff","label":"Family & Friends"},
    {"id":"mitarbeiter","label":"Mitarbeiter"}
  ]'::jsonb;

-- 6) Preiskategorie pro Schüler (Verweis auf price_categories[].id)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS price_category TEXT;

-- 7) Index für schnelles Filtern/Gruppieren nach Kategorie
CREATE INDEX IF NOT EXISTS idx_students_price_category
  ON students(school_id, price_category);
