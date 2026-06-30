-- ── Activity Log Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('message', 'tool', 'error', 'system', 'content', 'task')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for chronological sorting
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- ── Bot Config Table ──────────────────────────────────
-- Simple Key-Value store for configuration
CREATE TABLE IF NOT EXISTS bot_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Content Items Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT,
  platform TEXT NOT NULL,
  views INT DEFAULT 0,
  engagement_rate FLOAT DEFAULT 0.0,
  outlier_score FLOAT DEFAULT 1.0, -- e.g. 1.0x baseline, 4.2x baseline
  ai_recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance querying
CREATE INDEX IF NOT EXISTS idx_content_outlier_score ON content_items(outlier_score DESC);
