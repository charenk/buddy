/**
 * User Management API Endpoint
 * Handles user signup, creation, and API key updates
 */

import { createClient } from '../../lib/db.js';
import { upsertUser, getUserDashboard } from '../../lib/auth.js';

const supabase = createClient();

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
    const { action, email, figma_user_id, figma_handle, userId, apiKey } = req.body;

    // Handle different actions
    switch (action) {
      case 'signup':
        return await handleSignup(req, res, { email, figma_user_id, figma_handle });
      
      case 'create':
        return await handleCreate(req, res, { email, figma_user_id, figma_handle });
      
      case 'update-api-key':
        return await handleUpdateApiKey(req, res, { userId, apiKey });
      
      default:
        return res.status(400).json({ error: 'Invalid action. Use: signup, create, or update-api-key' });
    }

  } catch (error) {
    console.error('User management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle user signup
async function handleSignup(req, res, { email, figma_user_id, figma_handle }) {
  // Validate required fields
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Create user
  const user = await upsertUser({
    email,
    figma_user_id,
    figma_handle,
    trial_count: 0,
    subscription_status: 'trial'
  });

  if (!user) {
    return res.status(500).json({ error: 'Failed to create user' });
  }

  // Get dashboard data
  const dashboardData = await getUserDashboard(user.id);

  res.status(201).json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      figma_handle: user.figma_handle,
      trial_count: user.trial_count,
      subscription_status: user.subscription_status
    },
    dashboard: dashboardData
  });
}

// Handle user creation
async function handleCreate(req, res, { email, figma_user_id, figma_handle }) {
  // Validate required fields
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Create user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email,
      figma_user_id,
      figma_handle,
      trial_count: 0,
      subscription_status: 'trial'
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating user:', userError);
    return res.status(500).json({ error: 'Failed to create user' });
  }

  // Create default context for the user
  const { error: contextError } = await supabase
    .from('user_contexts')
    .insert({
      user_id: user.id,
      response_style: {
        length: 'detailed',
        tone: 'professional',
        focus: ['ux', 'visual'],
        domain: 'general',
        language: 'en'
      },
      custom_prompts: {},
      is_active: true
    });

  if (contextError) {
    console.error('Error creating user context:', contextError);
    // Don't fail the request, just log the error
  }

  res.status(201).json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      figma_handle: user.figma_handle,
      trial_count: user.trial_count,
      subscription_status: user.subscription_status
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

  // In production, encrypt the API key
  // For now, we'll store it as-is (in production, use proper encryption)
  const encryptedKey = apiKey; // TODO: Implement proper encryption

  // Update user with encrypted API key
  const { data, error } = await supabase
    .from('users')
    .update({ 
      api_key_encrypted: encryptedKey,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();

  if (error) {
    console.error('Error updating API key:', error);
    return res.status(500).json({ error: 'Failed to update API key' });
  }

  res.status(200).json({
    success: true,
    message: 'API key updated successfully'
  });
}
