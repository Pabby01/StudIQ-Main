-- StudIQ User Migration Table
-- Creates table to track Privy → Wallet migration for 100+ users

CREATE TABLE IF NOT EXISTS privy_to_wallet_migration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Old Privy identity
  privy_user_id TEXT NOT NULL UNIQUE, -- did:privy:xxx
  old_email TEXT, -- User's email from Privy
  old_display_name TEXT, -- Display name from Privy profile
  
  -- New wallet identity  
  wallet_address TEXT, -- Solana address after migration
  
  -- Migration status tracking
  migration_status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending': User notified, not started
    -- 'linked': Wallet connected and linked
    -- 'completed': Data fully migrated
    -- 'failed': Migration unsuccessful  
  
  -- Metadata
  migration_started_at TIMESTAMP,
  migration_completed_at TIMESTAMP,
  migration_method TEXT, -- 'banner', 'email', 'support'
  notes TEXT, -- Any migration notes
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_privy_migration_status 
  ON privy_to_wallet_migration(migration_status);

CREATE INDEX IF NOT EXISTS idx_privy_migration_wallet 
  ON privy_to_wallet_migration(wallet_address);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_migration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_privy_migration_timestamp
  BEFORE UPDATE ON privy_to_wallet_migration
  FOR EACH ROW
  EXECUTE FUNCTION update_migration_timestamp();

-- Populate with existing Privy users
INSERT INTO privy_to_wallet_migration (privy_user_id, old_email, old_display_name, migration_status)
SELECT 
  user_id,
  email,
  display_name,
  'pending'
FROM user_profiles
WHERE user_id LIKE 'did:privy:%'
ON CONFLICT (privy_user_id) DO NOTHING;

-- Report: Migration status summary
COMMENT ON TABLE privy_to_wallet_migration IS 
  'Tracks migration of 100+ users from Privy auth to direct wallet connection';
