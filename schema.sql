CREATE TABLE IF NOT EXISTS responses (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_created_at
  ON responses (created_at DESC);
