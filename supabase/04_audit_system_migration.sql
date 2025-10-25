-- Migration 04: Design System & Accessibility Audit System
-- This migration adds tables for the audit plugin functionality
-- Run this AFTER your existing migrations

-- Step 1: Create team_configs table for design system configurations
CREATE TABLE IF NOT EXISTS team_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id TEXT NOT NULL,
    design_system_url TEXT,
    design_system_text TEXT,
    accessibility_level TEXT DEFAULT 'AA' CHECK (accessibility_level IN ('A', 'AA', 'AAA')),
    custom_rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id)
);

-- Step 2: Create audit_history table for tracking audits
CREATE TABLE IF NOT EXISTS audit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team_id TEXT NOT NULL,
    file_key TEXT NOT NULL,
    audit_type TEXT NOT NULL CHECK (audit_type IN ('accessibility', 'design-system', 'both')),
    issues_found INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_configs_team_id ON team_configs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_user_id ON audit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_team_id ON audit_history(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_file_key ON audit_history(file_key);
CREATE INDEX IF NOT EXISTS idx_audit_history_created_at ON audit_history(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_history_audit_type ON audit_history(audit_type);

-- Step 4: Add RLS (Row Level Security) policies
ALTER TABLE team_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;

-- Team configs policies (teams can access their own configs)
CREATE POLICY "Teams can view their own configs" ON team_configs
    FOR SELECT USING (team_id = current_setting('app.current_team_id', true));

CREATE POLICY "Teams can insert their own configs" ON team_configs
    FOR INSERT WITH CHECK (team_id = current_setting('app.current_team_id', true));

CREATE POLICY "Teams can update their own configs" ON team_configs
    FOR UPDATE USING (team_id = current_setting('app.current_team_id', true));

CREATE POLICY "Teams can delete their own configs" ON team_configs
    FOR DELETE USING (team_id = current_setting('app.current_team_id', true));

-- Audit history policies (users can view their own audits)
CREATE POLICY "Users can view their own audits" ON audit_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own audits" ON audit_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Step 5: Create helper functions
CREATE OR REPLACE FUNCTION get_team_config(team_id_param TEXT)
RETURNS TABLE (
    id UUID,
    team_id TEXT,
    design_system_url TEXT,
    design_system_text TEXT,
    accessibility_level TEXT,
    custom_rules JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.id,
        tc.team_id,
        tc.design_system_url,
        tc.design_system_text,
        tc.accessibility_level,
        tc.custom_rules,
        tc.created_at,
        tc.updated_at
    FROM team_configs tc
    WHERE tc.team_id = team_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create audit summary function
CREATE OR REPLACE FUNCTION get_audit_summary(team_id_param TEXT, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_audits BIGINT,
    accessibility_audits BIGINT,
    design_system_audits BIGINT,
    combined_audits BIGINT,
    total_issues BIGINT,
    avg_issues_per_audit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_audits,
        COUNT(*) FILTER (WHERE audit_type = 'accessibility') as accessibility_audits,
        COUNT(*) FILTER (WHERE audit_type = 'design-system') as design_system_audits,
        COUNT(*) FILTER (WHERE audit_type = 'both') as combined_audits,
        SUM(issues_found) as total_issues,
        ROUND(AVG(issues_found), 2) as avg_issues_per_audit
    FROM audit_history
    WHERE team_id = team_id_param 
    AND created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Add comments for documentation
COMMENT ON TABLE team_configs IS 'Stores design system configurations for each team';
COMMENT ON TABLE audit_history IS 'Tracks audit history for analytics and reporting';
COMMENT ON COLUMN team_configs.design_system_url IS 'URL to design system documentation (e.g., Chakra UI docs)';
COMMENT ON COLUMN team_configs.design_system_text IS 'Custom design system guidelines as text';
COMMENT ON COLUMN team_configs.accessibility_level IS 'WCAG compliance level: A, AA, or AAA';
COMMENT ON COLUMN team_configs.custom_rules IS 'Custom accessibility rules as JSON array';
COMMENT ON COLUMN audit_history.audit_type IS 'Type of audit performed: accessibility, design-system, or both';
COMMENT ON COLUMN audit_history.issues_found IS 'Number of issues found in the audit';

-- Step 8: Insert sample data (optional - for testing)
-- Uncomment the following lines if you want to add sample data
/*
INSERT INTO team_configs (team_id, design_system_url, accessibility_level, custom_rules) VALUES
('sample-team-1', 'https://chakra-ui.com/docs/components/concepts/overview', 'AA', '[]'::jsonb),
('sample-team-2', 'https://mui.com/material-ui/getting-started/overview/', 'AAA', '[]'::jsonb)
ON CONFLICT (team_id) DO NOTHING;
*/

-- Step 9: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON team_configs TO authenticated;
GRANT SELECT, INSERT ON audit_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_config(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_summary(TEXT, INTEGER) TO authenticated;

-- Migration complete
SELECT 'Migration 04: Design System & Accessibility Audit System - COMPLETE' as status;
