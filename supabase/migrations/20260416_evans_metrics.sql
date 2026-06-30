-- ── EvansAiSolutions Core Metrics ──────────────────────────────────

-- 1. Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  url TEXT,
  niche TEXT,
  email TEXT,
  status TEXT DEFAULT 'scraped' CHECK (status IN ('scraped', 'website_created', 'emailed', 'clicked', 'replied', 'converted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('internal', 'client')),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed')),
  health TEXT DEFAULT 'good' CHECK (health IN ('good', 'warning', 'critical')),
  last_update TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  sent_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert starting/dummy data for testing the UI
INSERT INTO projects (name, type, status, health, last_update) 
VALUES 
  ('Real Estate OS', 'internal', 'active', 'good', 'Chrome widget functioning'),
  ('MiVoice App', 'internal', 'active', 'warning', 'API rate limit nearing'),
  ('Design Vault', 'internal', 'active', 'good', '12 CodeGrid templates ready'),
  ('Cortina Restaurant', 'client', 'active', 'good', 'Awaiting client feedback'),
  ('John Lomas Removals', 'client', 'completed', 'good', 'Deployed to production')
ON CONFLICT DO NOTHING;

INSERT INTO campaigns (name, niche, sent_count, open_count, click_count, reply_count, status)
VALUES
  ('Roofers London Q2', 'Roofing', 150, 45, 12, 3, 'active'),
  ('Removals Test', 'Removals', 20, 5, 1, 0, 'completed')
ON CONFLICT DO NOTHING;
