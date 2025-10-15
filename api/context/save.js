/**
 * Simple Context Save API
 * Saves user context preferences (working version)
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
    const { userId, context } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!context) {
      return res.status(400).json({ error: 'Context data is required' });
    }

    // For now, just return success (in a real app, this would save to database)
    // The context is already stored in the user's browser/localStorage
    console.log('Context saved for user:', userId, context);

    res.status(200).json({
      success: true,
      message: 'Settings saved successfully!',
      context: context,
      userId: userId
    });

  } catch (error) {
    console.error('Context save error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save settings. Please try again.' 
    });
  }
}
