-- D1 (SQLite) schema for TikBoosTTS subscriptions
-- Apply with: npx wrangler d1 execute tikboostts-subscriptions --file=db/schema.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT    UNIQUE NOT NULL,
  customer_id     TEXT    NOT NULL,
  email           TEXT,
  price_id        TEXT,
  status          TEXT    NOT NULL DEFAULT 'inactive',
  renews_at       TEXT,
  cancelled_at    TEXT,
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email  ON subscriptions (email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
