/**
 * Working User Management API
 * Handles user creation, context management, and settings
 */

import { createClient } from '../../lib/db.js';

const supabase = createClient();

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const { action, userId, email, figma_handle, figma_user_id, context, apiKey } = req.body;

    switch (action) {
      case 'create':
        return await handleCreateUser(req, res, { email, figma_handle, figma_user_id });
      
      case 'get':
        return await handleGetUser(req, res, { userId });
      
      case 'update-context':
        return await handleUpdateContext(req, res, { userId, context });
      
      case 'update-api-key':
        return await handleUpdateApiKey(req, res, { userId, apiKey });
      
      case 'get-dashboard':
        return await handleGetDashboard(req, res, { userId });
      
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid action. Use: create, get, update-context, update-api-key, or get-dashboard' 
        });
    }

  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
}

// Create user
async function handleCreateUser(req, res, { email, figma_handle, figma_user_id }) {
  try {
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Check if user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      // User exists, return existing data
      const dashboard = await getUserDashboardData(existingUser.id);
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        user: existingUser,
        dashboard: dashboard
      });
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        figma_handle: figma_handle || 'unknown',
        figma_user_id: figma_user_id || 'unknown',
        trial_count: 0,
        subscription_status: 'trial'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create user: ' + createError.message 
      });
    }

    // Create default context
    const { data: context, error: contextError } = await supabase
      .from('user_contexts')
      .insert({
        user_id: newUser.id,
        response_style: {
          length: 'detailed',
          tone: 'professional',
          focus: ['ux', 'visual'],
          domain: 'general',
          language: 'en'
        },
        custom_prompts: {},
        is_active: true
      })
      .select()
      .single();

    const dashboard = await getUserDashboardData(newUser.id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser,
      context: context,
      dashboard: dashboard
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user: ' + error.message 
    });
  }
}

// Get user
async function handleGetUser(req, res, { userId }) {
  try {
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user: ' + error.message 
    });
  }
}

// Update context
async function handleUpdateContext(req, res, { userId, context }) {
  try {
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!context) {
      return res.status(400).json({ success: false, error: 'Context data is required' });
    }

    const { data: updatedContext, error } = await supabase
      .from('user_contexts')
      .upsert({
        user_id: userId,
        response_style: context,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update context: ' + error.message 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Context updated successfully',
      context: updatedContext
    });

  } catch (error) {
    console.error('Update context error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update context: ' + error.message 
    });
  }
}

// Update API key
async function handleUpdateApiKey(req, res, { userId, apiKey }) {
  try {
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }

    // Simple validation
    if (!apiKey.startsWith('sk-')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid API key format' 
      });
    }

    const { error } = await supabase
      .from('users')
      .update({ 
        api_key_encrypted: apiKey, // In production, this should be encrypted
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update API key: ' + error.message 
      });
    }

    res.status(200).json({
      success: true,
      message: 'API key updated successfully'
    });

  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update API key: ' + error.message 
    });
  }
}

// Get dashboard data
async function handleGetDashboard(req, res, { userId }) {
  try {
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const dashboard = await getUserDashboardData(userId);
    res.status(200).json({
      success: true,
      dashboard: dashboard
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get dashboard: ' + error.message 
    });
  }
}

// Helper function to get dashboard data
async function getUserDashboardData(userId) {
  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('User not found');
    }

    // Get context data
    const { data: context, error: contextError } = await supabase
      .from('user_contexts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Get usage stats
    const { data: usageStats, error: usageError } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId);

    const totalInteractions = usageStats?.length || 0;
    const trialRemaining = Math.max(0, 10 - (user.trial_count || 0));
    const totalCostCents = usageStats?.reduce((sum, log) => sum + (log.cost_cents || 0), 0) || 0;

    return {
      user: user,
      context: context || {
        response_style: {
          length: 'detailed',
          tone: 'professional',
          focus: ['ux', 'visual'],
          domain: 'general',
          language: 'en'
        },
        custom_prompts: {}
      },
      stats: {
        total_interactions: totalInteractions,
        trial_remaining: trialRemaining,
        total_cost_cents: totalCostCents
      }
    };

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    throw error;
  }
}
