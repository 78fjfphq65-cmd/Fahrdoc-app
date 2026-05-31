-- ============================================================
-- FahrDoc Buchhaltung Phase 2 — Rechnungen & Zahlungseingänge
-- 2026-05-31
-- ============================================================

-- 0) Schule erweitern: USt-Modus + Adress-Felder (für Rechnungs-Briefkopf)
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'kleinunternehmer'
    CHECK (tax_mode IN ('kleinunternehmer', 'regelbesteuerung')),
  ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT, -- USt-IdNr (optional)
  ADD COLUMN IF NOT EXISTS bank_info TEXT; -- Freitext für IBAN/BIC

-- 1) Rechnungen (Header)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  -- Rechnungsnummer: '2026-0001' (jahresweise fortlaufend pro Schule)
  invoice_number TEXT NOT NULL,
  invoice_year INTEGER NOT NULL,
  invoice_seq  INTEGER NOT NULL,
  invoice_date TEXT NOT NULL, -- ISO-Datum
  due_date TEXT,              -- optional
  status TEXT NOT NULL DEFAULT 'offen'
    CHECK (status IN ('offen', 'teilbezahlt', 'bezahlt', 'storniert')),
  -- USt-Modus zum Erstellungszeitpunkt einfrieren (GoBD: Rechnung nicht stillschweigend ändern)
  tax_mode TEXT NOT NULL DEFAULT 'kleinunternehmer'
    CHECK (tax_mode IN ('kleinunternehmer', 'regelbesteuerung')),
  tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  -- Summen in Cent
  subtotal_cents INTEGER NOT NULL DEFAULT 0, -- Netto (bzw. Gesamt bei Kleinunternehmer)
  tax_cents      INTEGER NOT NULL DEFAULT 0, -- 0 bei Kleinunternehmer
  total_cents    INTEGER NOT NULL DEFAULT 0, -- Brutto
  -- Briefkopf-Snapshot (Schule kann Adresse später ändern, Rechnung bleibt unverändert)
  school_name_snapshot TEXT,
  school_address_snapshot TEXT,
  student_name_snapshot TEXT,
  student_address_snapshot TEXT,
  notes TEXT,
  created_by_role TEXT NOT NULL DEFAULT 'school',
  created_by_id TEXT,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Nummer pro Schule + Jahr eindeutig
  UNIQUE (school_id, invoice_year, invoice_seq),
  UNIQUE (school_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_school   ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student  ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(school_id, status);

-- 2) Rechnungs-Positionen (kopiert aus student_charges → unveränderlich)
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(8), 'hex'),
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  -- Referenz zur ursprünglichen Soll-Position (zur Nachverfolgung)
  charge_id TEXT REFERENCES student_charges(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT,
  unit_price_cents INTEGER NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 3) student_charges um invoice_id erweitern (Charge gehört zu welcher Rechnung?)
ALTER TABLE student_charges
  ADD COLUMN IF NOT EXISTS invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_charges_invoice ON student_charges(invoice_id);

-- 4) student_payments um invoice_id erweitern (Zahlung an welche Rechnung?)
ALTER TABLE student_payments
  ADD COLUMN IF NOT EXISTS invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_payments_invoice ON student_payments(invoice_id);

-- 5) RLS aktivieren (Backend nutzt service_role → bypass)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
