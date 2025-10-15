-- High-Performance Database Schema for Figma AI Buddy
-- Optimized for speed, scalability, and user context management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with performance optimizations
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    figma_user_id TEXT UNIQUE,
    figma_handle TEXT,
    trial_count INTEGER DEFAULT 0 CHECK (trial_count >= 0),
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
    api_key_encrypted TEXT, -- Encrypted OpenAI API key
    last_active_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User contexts table with JSONB for fast queries
CREATE TABLE user_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_style JSONB NOT NULL DEFAULT '{
        "length": "detailed",
        "tone": "professional", 
        "focus": ["ux", "visual"],
        "domain": "general",
        "language": "en"
    }'::jsonb,
    custom_prompts JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking with performance indexes
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_key TEXT,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('trial', 'paid')),
    api_key_used TEXT NOT NULL CHECK (api_key_used IN ('yours', 'user')),
    response_time_ms INTEGER,
    tokens_used INTEGER,
    cost_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Team management for collaboration
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_figma_user_id ON users(figma_user_id);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_user_contexts_user_id ON user_contexts(user_id);
CREATE INDEX idx_user_contexts_active ON user_contexts(user_id) WHERE is_active = true;
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_file_key ON usage_logs(file_key);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own data" ON users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users 
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_contexts
CREATE POLICY "Users can manage own contexts" ON user_contexts 
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
CREATE POLICY "Users can view team members" ON team_members 
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Functions for performance optimization
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_contexts_updated_at BEFORE UPDATE ON user_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user context with caching
CREATE OR REPLACE FUNCTION get_user_context(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    context JSONB;
BEGIN
    SELECT response_style INTO context
    FROM user_contexts 
    WHERE user_id = user_uuid AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1;
    
    RETURN COALESCE(context, '{
        "length": "detailed",
        "tone": "professional",
        "focus": ["ux", "visual"],
        "domain": "general",
        "language": "en"
    }'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to track usage with performance optimization
CREATE OR REPLACE FUNCTION track_usage(
    user_uuid UUID,
    file_key_param TEXT,
    interaction_type_param TEXT,
    api_key_used_param TEXT,
    response_time_ms_param INTEGER DEFAULT NULL,
    tokens_used_param INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    usage_id UUID;
    cost_cents_param INTEGER := 0;
BEGIN
    -- Calculate cost based on tokens (simplified)
    IF tokens_used_param IS NOT NULL THEN
        cost_cents_param := GREATEST(1, tokens_used_param / 1000 * 2); -- $0.002 per 1K tokens
    END IF;
    
    INSERT INTO usage_logs (
        user_id, 
        file_key, 
        interaction_type, 
        api_key_used, 
        response_time_ms, 
        tokens_used, 
        cost_cents
    ) VALUES (
        user_uuid,
        file_key_param,
        interaction_type_param,
        api_key_used_param,
        response_time_ms_param,
        tokens_used_param,
        cost_cents_param
    ) RETURNING id INTO usage_id;
    
    RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- View for user dashboard data
CREATE VIEW user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.figma_handle,
    u.trial_count,
    u.subscription_status,
    u.last_active_at,
    uc.response_style,
    COALESCE(usage_stats.total_interactions, 0) as total_interactions,
    COALESCE(usage_stats.trial_remaining, 10) as trial_remaining,
    COALESCE(usage_stats.total_cost_cents, 0) as total_cost_cents
FROM users u
LEFT JOIN user_contexts uc ON u.id = uc.user_id AND uc.is_active = true
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_interactions,
        GREATEST(0, 10 - COUNT(*) FILTER (WHERE interaction_type = 'trial')) as trial_remaining,
        SUM(cost_cents) as total_cost_cents
    FROM usage_logs 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY user_id
) usage_stats ON u.id = usage_stats.user_id;
