-- Updated Database Schema for Figma AI Buddy - Account-Based Authentication
-- Optimized for scalability and multi-user support

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with Figma OAuth integration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    figma_user_id TEXT UNIQUE NOT NULL,
    figma_handle TEXT NOT NULL,
    figma_email TEXT,
    figma_img_url TEXT,
    figma_access_token TEXT, -- Encrypted Figma access token
    figma_refresh_token TEXT, -- Encrypted Figma refresh token
    token_expires_at TIMESTAMP,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
    trial_uses_remaining INTEGER DEFAULT 10 CHECK (trial_uses_remaining >= 0),
    last_active_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User contexts table for personalized AI responses
CREATE TABLE user_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_context TEXT, -- Up to 1000 words of product context
    analysis_settings JSONB NOT NULL DEFAULT '{
        "length": "detailed",
        "tone": "professional",
        "focus_areas": ["ux", "visual"],
        "include_visual": true
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhooks table for account-level webhook management
CREATE TABLE user_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    figma_webhook_id TEXT UNIQUE NOT NULL, -- Figma's webhook ID
    team_id TEXT NOT NULL, -- Figma team ID
    webhook_url TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking for billing and analytics
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_key TEXT,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('comment', 'plugin', 'api')),
    response_time_ms INTEGER,
    tokens_used INTEGER,
    cost_cents INTEGER DEFAULT 0,
    webhook_id UUID REFERENCES user_webhooks(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Teams table for organization management
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    figma_team_id TEXT UNIQUE NOT NULL, -- Figma team ID
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Team members with roles
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Performance indexes for fast queries
CREATE INDEX idx_users_figma_user_id ON users(figma_user_id);
CREATE INDEX idx_users_figma_handle ON users(figma_handle);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);

CREATE INDEX idx_user_contexts_user_id ON user_contexts(user_id);
CREATE INDEX idx_user_contexts_active ON user_contexts(user_id) WHERE is_active = true;

CREATE INDEX idx_user_webhooks_user_id ON user_webhooks(user_id);
CREATE INDEX idx_user_webhooks_figma_id ON user_webhooks(figma_webhook_id);
CREATE INDEX idx_user_webhooks_status ON user_webhooks(status);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_file_key ON usage_logs(file_key);
CREATE INDEX idx_usage_logs_interaction_type ON usage_logs(interaction_type);

CREATE INDEX idx_teams_figma_team_id ON teams(figma_team_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own data" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_contexts
CREATE POLICY "Users can manage own contexts" ON user_contexts 
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_webhooks
CREATE POLICY "Users can manage own webhooks" ON user_webhooks 
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for usage_logs
CREATE POLICY "Users can view own usage" ON usage_logs 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs" ON usage_logs 
    FOR INSERT WITH CHECK (true);

-- RLS Policies for teams
CREATE POLICY "Users can view teams they belong to" ON teams 
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for team_members
CREATE POLICY "Users can view team members of their teams" ON team_members 
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Functions for common operations
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

-- Function to track usage
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
