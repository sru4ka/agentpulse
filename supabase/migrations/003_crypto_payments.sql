-- Crypto payments table (if not already created via the app)
CREATE TABLE IF NOT EXISTS crypto_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  amount_eth TEXT,
  amount_usd DECIMAL(10,2),
  from_address TEXT,
  status TEXT DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crypto_payments_status ON crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_email ON crypto_payments(email);

-- Enable RLS
ALTER TABLE crypto_payments ENABLE ROW LEVEL SECURITY;

-- Only service role can access crypto_payments (no user-facing RLS needed)
-- The /api/payments endpoint uses service role for reads/writes
