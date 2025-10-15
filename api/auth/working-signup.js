/**
 * Working User Signup API
 * Creates users and returns dashboard data without database dependency
 */

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, email, figma_handle, figma_user_id, userId, apiKey } = req.body;

    // Handle different actions
    switch (action) {
      case 'create':
        return await handleCreate(req, res, { email, figma_handle, figma_user_id });
      
      case 'update-api-key':
        return await handleUpdateApiKey(req, res, { userId, apiKey });
      
      default:
        return res.status(400).json({ error: 'Invalid action. Use: create or update-api-key' });
    }

  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle user creation
async function handleCreate(req, res, { email, figma_handle, figma_user_id }) {
  // Validate required fields
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Create user object (in-memory for now)
  const user = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email,
    figma_handle: figma_handle || 'unknown',
    figma_user_id: figma_user_id || 'unknown',
    trial_count: 0,
    subscription_status: 'trial',
    created_at: new Date().toISOString()
  };

  // Create default context
  const context = {
    id: `context_${Date.now()}`,
    user_id: user.id,
    response_style: {
      length: 'detailed',
      tone: 'professional',
      focus: ['ux', 'visual'],
      domain: 'general',
      language: 'en'
    },
    custom_prompts: {},
    is_active: true,
    created_at: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      figma_handle: user.figma_handle,
      trial_count: user.trial_count,
      subscription_status: user.subscription_status
    },
    context: context,
    dashboard: {
      user: user,
      context: context,
      stats: {
        total_interactions: 0,
        trial_remaining: 10,
        total_cost_cents: 0
      }
    }
  });
}

// Handle API key update
async function handleUpdateApiKey(req, res, { userId, apiKey }) {
  // Validate required fields
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  // Validate API key format
  if (!apiKey.startsWith('sk-')) {
    return res.status(400).json({ error: 'Invalid API key format' });
  }

  res.status(200).json({
    success: true,
    message: 'API key updated successfully (test mode)',
    userId: userId
  });
}
