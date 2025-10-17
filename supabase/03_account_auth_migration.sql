-- Migration 03: Account-Based Authentication for Figma AI Buddy
-- This migration adds account-based authentication features to existing schemas
-- Run this AFTER your existing 01_initial_schema_setup and 02_context_management_schema

-- Step 1: Add Figma OAuth fields to existing users table
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

-- Step 2: Add product_context to existing user_contexts table
ALTER TABLE user_contexts 
ADD COLUMN IF NOT EXISTS product_context TEXT;

-- Step 3: Create user_webhooks table for account-level webhook management
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

-- Step 4: Add Figma team integration to existing teams table
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

-- Step 6: Enable RLS for new table
ALTER TABLE user_webhooks ENABLE ROW LEVEL SECURITY;

-- Step 7: Add RLS policies for user_webhooks
CREATE POLICY IF NOT EXISTS "Users can manage own webhooks" ON user_webhooks 
    FOR ALL USING (auth.uid() = user_id);

-- Step 8: Update existing functions for account-based system
CREATE OR REPLACE FUNCTION get_user_context(user_uuid UUID)
RETURNS TABLE (
    product_context TEXT,
    analysis_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.product_context,
        COALESCE(uc.response_style, '{
            "length": "detailed",
            "tone": "professional",
            "focus_areas": ["ux", "visual"],
            "include_visual": true
        }'::jsonb) as analysis_settings
    FROM user_contexts uc
    WHERE uc.user_id = user_uuid 
    AND uc.is_active = true
    ORDER BY uc.updated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Add webhook support to existing track_usage function
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

-- Step 10: Add function to check remaining uses
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

-- Step 11: Verify migration
DO $$
BEGIN
    -- Check that new columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'figma_email'
    ) THEN
        RAISE EXCEPTION 'Migration failed: figma_email column not found';
    END IF;
    
    -- Check that user_webhooks table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_webhooks'
    ) THEN
        RAISE EXCEPTION 'Migration failed: user_webhooks table not found';
    END IF;
    
    RAISE NOTICE 'Account-based authentication migration completed successfully!';
    RAISE NOTICE 'Your database now supports:';
    RAISE NOTICE '- Figma OAuth integration';
    RAISE NOTICE '- Account-level webhook management';
    RAISE NOTICE '- Per-user context storage';
    RAISE NOTICE '- Usage tracking and billing';
END $$;
