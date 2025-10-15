/**
 * User Signup API Endpoint
 * High-performance user registration with validation
 */

import { createClient } from '../../lib/db.js';
import { upsertUser, getUserDashboard } from '../../lib/auth.js';

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

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
