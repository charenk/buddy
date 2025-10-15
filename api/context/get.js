/**
 * Context Management API Endpoint
 * Handles context retrieval and updates
 */

import { getUserContext, getUserDashboard } from '../../lib/auth.js';
import { getDefaultContext, validateContext } from '../../lib/context.js';
import { createClient } from '../../lib/db.js';

const supabase = createClient();

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return await handleGetContext(req, res);
    } else if (req.method === 'POST') {
      return await handleUpdateContext(req, res);
    } else {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('Context management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle context retrieval
async function handleGetContext(req, res) {
  const { userId } = req.query;

  // Validate required fields
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Get user context
  const context = await getUserContext(userId);
  
  // Get dashboard data
  const dashboardData = await getUserDashboard(userId);

  if (!context) {
    // Return default context for new users
    const defaultContext = getDefaultContext();
    
    res.status(200).json({
      success: true,
      context: {
        response_style: defaultContext,
        custom_prompts: {},
        is_active: true
      },
      dashboard: dashboardData,
      isDefault: true
    });
    return;
  }

  res.status(200).json({
    success: true,
    context: {
      response_style: context.response_style,
      custom_prompts: context.custom_prompts,
      is_active: context.is_active
    },
    dashboard: dashboardData,
    isDefault: false
  });
}

// Handle context update
async function handleUpdateContext(req, res) {
  const { userId, context } = req.body;

  // Validate required fields
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!context) {
    return res.status(400).json({ error: 'Context is required' });
  }

  // Validate context
  const validatedContext = validateContext(context);

  // Update user context
  const { data, error } = await supabase
    .from('user_contexts')
    .upsert({
      user_id: userId,
      response_style: validatedContext,
      custom_prompts: context.custom_prompts || {},
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating context:', error);
    return res.status(500).json({ error: 'Failed to update context' });
  }

  // Test the context by building a sample prompt
  const { buildAIPrompt } = await import('../../lib/context.js');
  const samplePrompt = buildAIPrompt(
    "Test design comment",
    validatedContext,
    context.custom_prompts
  );

  res.status(200).json({
    success: true,
    context: data,
    samplePrompt: {
      systemPrompt: samplePrompt.systemPrompt,
      maxTokens: samplePrompt.maxTokens,
      temperature: samplePrompt.temperature
    }
  });
}
