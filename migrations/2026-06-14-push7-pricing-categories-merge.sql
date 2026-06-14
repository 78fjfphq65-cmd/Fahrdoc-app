-- ============================================================
-- Push 7: Preiskategorien × Preisverwaltung Merge
-- ============================================================
-- Jede Kategorie (Normal/F&F/Mitarbeiter/...) hat eigene Preise
-- pro Fahrstundentyp. Beim Anlegen einer Fahrstunde wird der
-- Preis automatisch aus der Kategorie des Schuelers gezogen
-- (Fallback auf 'normal' wenn keine Kategorie oder kein Preis).
-- ============================================================

-- 1) pricing_templates: category_id Spalte (verweist auf schools.price_categories[].id als TEXT)
ALTER TABLE pricing_templates
  ADD COLUMN IF NOT EXISTS category_id TEXT;

-- 2) Daten-Migration: alle bestehenden Templates -> 'normal'
UPDATE pricing_templates
  SET category_id = 'normal'
  WHERE category_id IS NULL;

-- 3) Index fuer schnelles Auto-Match (school + category + lesson_type)
CREATE INDEX IF NOT EXISTS idx_pricing_templates_school_cat_type
  ON pricing_templates (school_id, category_id, lesson_type_match)
  WHERE active = true;

-- 4) Sicherstellen, dass jede Schule mindestens die 'normal'-Kategorie hat
--    (Defaults werden serverseitig gesetzt, aber zur Sicherheit hier auch)
UPDATE schools
  SET price_categories = '[{"id":"normal","label":"Normal"},{"id":"ff","label":"Family & Friends"},{"id":"mitarbeiter","label":"Mitarbeiter"}]'::jsonb
  WHERE price_categories IS NULL OR jsonb_array_length(price_categories) = 0;
