/**
 * Simple User Signup API (No Database)
 * Basic endpoint to test user creation flow
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
    const { email, figma_handle, figma_user_id } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create a simple user object (without database for now)
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      figma_handle: figma_handle || 'unknown',
      figma_user_id: figma_user_id || 'unknown',
      trial_count: 0,
      subscription_status: 'trial',
      created_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully (test mode)',
      user: {
        id: user.id,
        email: user.email,
        figma_handle: user.figma_handle,
        trial_count: user.trial_count,
        subscription_status: user.subscription_status
      }
    });

  } catch (error) {
    console.error('Simple signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
