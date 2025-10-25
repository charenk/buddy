/**
 * Configuration API - Manages team design system configurations
 * Handles saving, loading, and validating design system settings
 */

import { createClient } from '../lib/db.js';
import { validateDesignSystemURL, fetchDesignSystem } from '../lib/design-system-fetcher.js';

const supabase = createClient();

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'get':
        return await getTeamConfig(req, res);
      case 'save':
        return await saveTeamConfig(req, res);
      case 'validate-url':
        return await validateURL(req, res);
      case 'test-url':
        return await testURL(req, res);
      case 'delete':
        return await deleteTeamConfig(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get team configuration
 */
async function getTeamConfig(req, res) {
  try {
    const { teamId } = req.query;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    const { data, error } = await supabase
      .from('team_configs')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    if (!data) {
      return res.status(200).json({
        success: true,
        config: null,
        message: 'No configuration found for this team'
      });
    }

    res.status(200).json({
      success: true,
      config: {
        id: data.id,
        teamId: data.team_id,
        designSystemUrl: data.design_system_url,
        designSystemText: data.design_system_text,
        accessibilityLevel: data.accessibility_level,
        customRules: data.custom_rules,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    });

  } catch (error) {
    console.error('Error getting team config:', error);
    res.status(500).json({ 
      error: 'Failed to get configuration',
      message: error.message 
    });
  }
}

/**
 * Save team configuration
 */
async function saveTeamConfig(req, res) {
  try {
    const { 
      teamId, 
      designSystemUrl, 
      designSystemText, 
      accessibilityLevel = 'AA',
      customRules = [] 
    } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    if (!designSystemUrl && !designSystemText) {
      return res.status(400).json({ 
        error: 'Either designSystemUrl or designSystemText is required' 
      });
    }

    // Validate URL if provided
    if (designSystemUrl) {
      const urlValidation = validateDesignSystemURL(designSystemUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({ 
          error: 'Invalid design system URL',
          details: urlValidation.error 
        });
      }
    }

    // Validate accessibility level
    const validLevels = ['A', 'AA', 'AAA'];
    if (!validLevels.includes(accessibilityLevel)) {
      return res.status(400).json({ 
        error: 'Invalid accessibility level. Use: A, AA, or AAA' 
      });
    }

    // Check if configuration already exists
    const { data: existingConfig } = await supabase
      .from('team_configs')
      .select('id')
      .eq('team_id', teamId)
      .single();

    const configData = {
      team_id: teamId,
      design_system_url: designSystemUrl || null,
      design_system_text: designSystemText || null,
      accessibility_level: accessibilityLevel,
      custom_rules: customRules,
      updated_at: new Date().toISOString()
    };

    let result;

    if (existingConfig) {
      // Update existing configuration
      const { data, error } = await supabase
        .from('team_configs')
        .update(configData)
        .eq('team_id', teamId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new configuration
      configData.created_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('team_configs')
        .insert(configData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.status(200).json({
      success: true,
      config: {
        id: result.id,
        teamId: result.team_id,
        designSystemUrl: result.design_system_url,
        designSystemText: result.design_system_text,
        accessibilityLevel: result.accessibility_level,
        customRules: result.custom_rules,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: 'Configuration saved successfully'
    });

  } catch (error) {
    console.error('Error saving team config:', error);
    res.status(500).json({ 
      error: 'Failed to save configuration',
      message: error.message 
    });
  }
}

/**
 * Validate design system URL
 */
async function validateURL(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const validation = validateDesignSystemURL(url);

    res.status(200).json({
      success: true,
      valid: validation.valid,
      error: validation.error,
      warning: validation.warning
    });

  } catch (error) {
    console.error('Error validating URL:', error);
    res.status(500).json({ 
      error: 'Failed to validate URL',
      message: error.message 
    });
  }
}

/**
 * Test design system URL by fetching it
 */
async function testURL(req, res) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL first
    const validation = validateDesignSystemURL(url);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid URL',
        details: validation.error 
      });
    }

    // Try to fetch the design system
    const designSystem = await fetchDesignSystem(url);

    res.status(200).json({
      success: true,
      designSystem: {
        name: designSystem.name,
        version: designSystem.version,
        componentCount: designSystem.components.length,
        tokenCount: Object.keys(designSystem.tokens.colors).length + 
                   Object.keys(designSystem.tokens.spacing).length,
        guidelineCount: designSystem.guidelines.length
      },
      message: 'Design system URL is accessible and valid'
    });

  } catch (error) {
    console.error('Error testing URL:', error);
    res.status(400).json({ 
      error: 'Failed to fetch design system',
      message: error.message,
      suggestion: 'Please check the URL and try again'
    });
  }
}

/**
 * Delete team configuration
 */
async function deleteTeamConfig(req, res) {
  try {
    const { teamId } = req.query;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    const { error } = await supabase
      .from('team_configs')
      .delete()
      .eq('team_id', teamId);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting team config:', error);
    res.status(500).json({ 
      error: 'Failed to delete configuration',
      message: error.message 
    });
  }
}
