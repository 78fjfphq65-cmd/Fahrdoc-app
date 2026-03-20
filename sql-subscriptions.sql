-- ============================================
-- FahrDoc: Subscriptions Tabelle
-- ============================================
-- Führe dieses SQL im Supabase SQL Editor aus

CREATE TABLE IF NOT EXISTS subscriptions (
  school_id TEXT PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'trial',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  instructor_quantity INTEGER DEFAULT 1,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS aktivieren
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role kann alles (für Webhook)
CREATE POLICY "Service role full access" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);
