-- Migration Script: Update Existing Schema for Account-Based Authentication
-- This script safely updates your existing schema to support the new account-based system
-- Run this in your Supabase SQL Editor

-- Step 1: Backup existing data (optional but recommended)
-- You can export your existing data from Supabase dashboard if needed

-- Step 2: Update users table for Figma OAuth integration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS figma_email TEXT,
ADD COLUMN IF NOT EXISTS figma_img_url TEXT,
ADD COLUMN IF NOT EXISTS figma_access_token TEXT,
ADD COLUMN IF NOT EXISTS figma_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_uses_remaining INTEGER DEFAULT 10 CHECK (trial_uses_remaining >= 0);

-- Update existing users to have trial uses
UPDATE users 
SET trial_uses_remaining = 10 
WHERE trial_uses_remaining IS NULL;

-- Make figma_user_id required for new system
ALTER TABLE users 
ALTER COLUMN figma_user_id SET NOT NULL;

-- Step 3: Update user_contexts table for new structure
ALTER TABLE user_contexts 
ADD COLUMN IF NOT EXISTS product_context TEXT,
ADD COLUMN IF NOT EXISTS analysis_settings JSONB DEFAULT '{
    "length": "detailed",
    "tone": "professional", 
    "focus_areas": ["ux", "visual"],
    "include_visual": true
}'::jsonb;

-- Migrate existing response_style to analysis_settings
UPDATE user_contexts 
SET analysis_settings = COALESCE(response_style, '{
    "length": "detailed",
    "tone": "professional",
    "focus_areas": ["ux", "visual"],
    "include_visual": true
}'::jsonb)
WHERE analysis_settings IS NULL;

-- Step 4: Create new tables for account-based system

-- User webhooks table
CREATE TABLE IF NOT EXISTS user_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    figma_webhook_id TEXT UNIQUE NOT NULL,
    team_id TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Update teams table for Figma integration
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS figma_team_id TEXT UNIQUE;

-- Step 5: Add new indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_figma_user_id ON users(figma_user_id);
CREATE INDEX IF NOT EXISTS idx_users_figma_handle ON users(figma_handle);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_trial_uses ON users(trial_uses_remaining);

CREATE INDEX IF NOT EXISTS idx_user_webhooks_user_id ON user_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_figma_id ON user_webhooks(figma_webhook_id);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_status ON user_webhooks(status);

CREATE INDEX IF NOT EXISTS idx_teams_figma_team_id ON teams(figma_team_id);

-- Step 6: Update RLS policies for new tables
ALTER TABLE user_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own webhooks" ON user_webhooks 
    FOR ALL USING (auth.uid() = user_id);

-- Step 7: Add new functions for account-based system
CREATE OR REPLACE FUNCTION get_user_context(user_uuid UUID)
RETURNS TABLE (
    product_context TEXT,
    analysis_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.product_context,
        uc.analysis_settings
    FROM user_contexts uc
    WHERE uc.user_id = user_uuid 
    AND uc.is_active = true
    ORDER BY uc.updated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track usage with webhook support
CREATE OR REPLACE FUNCTION track_usage(
    user_uuid UUID,
    file_key_param TEXT,
    interaction_type_param TEXT,
    response_time_ms_param INTEGER,
    tokens_used_param INTEGER,
    cost_cents_param INTEGER DEFAULT 0,
    webhook_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    usage_id UUID;
BEGIN
    INSERT INTO usage_logs (
        user_id,
        file_key,
        interaction_type,
        response_time_ms,
        tokens_used,
        cost_cents,
        webhook_id
    ) VALUES (
        user_uuid,
        file_key_param,
        interaction_type_param,
        response_time_ms_param,
        tokens_used_param,
        cost_cents_param,
        webhook_id_param
    ) RETURNING id INTO usage_id;
    
    -- Update user's last active time
    UPDATE users 
    SET last_active_at = NOW(), updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Decrement trial uses if user is on trial
    UPDATE users 
    SET trial_uses_remaining = GREATEST(trial_uses_remaining - 1, 0)
    WHERE id = user_uuid 
    AND subscription_status = 'trial' 
    AND trial_uses_remaining > 0;
    
    RETURN usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has remaining uses
CREATE OR REPLACE FUNCTION user_has_remaining_uses(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_status TEXT;
    remaining_uses INTEGER;
BEGIN
    SELECT subscription_status, trial_uses_remaining
    INTO user_status, remaining_uses
    FROM users
    WHERE id = user_uuid;
    
    IF user_status = 'active' THEN
        RETURN TRUE;
    ELSIF user_status = 'trial' AND remaining_uses > 0 THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Update existing data to new format
-- Migrate existing users to have proper figma_user_id if they don't have one
-- This is a placeholder - you'll need to update this based on your existing data
UPDATE users 
SET figma_user_id = 'migrated_' || id::text
WHERE figma_user_id IS NULL;

-- Step 9: Verify migration
-- Check that all tables exist and have proper structure
DO $$
BEGIN
    -- Verify users table has new columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'figma_email'
    ) THEN
        RAISE EXCEPTION 'Migration failed: figma_email column not found';
    END IF;
    
    -- Verify user_webhooks table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_webhooks'
    ) THEN
        RAISE EXCEPTION 'Migration failed: user_webhooks table not found';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;
