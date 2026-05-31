-- ============================================================
-- FahrDoc Buchhaltung Phase 1 — Soll/Ist pro Schüler
-- 2026-05-31
-- ============================================================

-- 1) Preisliste (Templates pro Fahrschule)
--    Fahrschulen legen ihre Preise einmal an, danach Auto-Verrechnung.
CREATE TABLE IF NOT EXISTS pricing_templates (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  -- category Werte (lose): grundbetrag, uebungsfahrt, sonderfahrt_autobahn,
  --                       sonderfahrt_ueberland, sonderfahrt_nacht, theorie_einheit,
  --                       theorieprüfung, praxisprüfung, lernmaterial, sonstiges
  price_cents INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  auto_apply BOOLEAN NOT NULL DEFAULT true,
  -- mapping zur Fahrstunden-Auto-Erzeugung
  lesson_type_match TEXT,
  -- z.B. 'Übungsfahrt' / 'Autobahnfahrt' — case-insensitive Vergleich gegen lessons.type
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_templates_school ON pricing_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_lesson_type ON pricing_templates(school_id, lesson_type_match);

-- 2) Soll-Positionen (was der Schüler schuldet)
CREATE TABLE IF NOT EXISTS student_charges (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  pricing_template_id TEXT REFERENCES pricing_templates(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT,
  unit_price_cents INTEGER NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,
  charge_date TEXT NOT NULL,
  -- Bezug zur Fahrstunde (verhindert Duplikate beim Auto-Hook)
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  -- Wer hat die Position angelegt?
  created_by_role TEXT NOT NULL DEFAULT 'school',
  created_by_id TEXT,
  -- Auto = vom System erzeugt; Manual = vom Nutzer eingegeben
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('auto', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_charges_school ON student_charges(school_id);
CREATE INDEX IF NOT EXISTS idx_student_charges_student ON student_charges(student_id);
-- Doppelte Auto-Erzeugung pro Fahrstunde verhindern
CREATE UNIQUE INDEX IF NOT EXISTS uniq_student_charges_lesson_auto
  ON student_charges(lesson_id) WHERE source = 'auto';

-- 3) Ist-Zahlungen (was bezahlt wurde)
CREATE TABLE IF NOT EXISTS student_payments (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bar' CHECK(payment_method IN ('bar', 'überweisung', 'ec', 'paypal', 'sonstiges')),
  reference TEXT,
  -- Optional: spezifisch einer Position zuzuordnen
  charge_id TEXT REFERENCES student_charges(id) ON DELETE SET NULL,
  created_by_role TEXT NOT NULL DEFAULT 'school',
  created_by_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_payments_school ON student_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_student ON student_payments(student_id);
