/**
 * Create User Endpoint
 * Creates a new user with Figma integration
 */

import { createClient } from '../../lib/db.js';

const supabase = createClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, figma_user_id, figma_handle } = req.body;

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

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
