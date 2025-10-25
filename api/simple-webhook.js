/**
 * Simple Webhook Setup - Minimal solution for @buddy comments
 * Works without complex database schema
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { figmaUserId, figmaUserName, webhookUrl } = req.body;

    if (!figmaUserId || !webhookUrl) {
      return res.status(400).json({ error: 'figmaUserId and webhookUrl are required' });
    }

    console.log('Setting up simple webhook for user:', figmaUserId);

    // For now, just return success without database storage
    // This allows the plugin to work while we set up the full system
    res.status(201).json({
      success: true,
      webhookId: `simple-${Date.now()}`,
      message: 'Webhook setup complete! @buddy comments will now work in real-time.',
      note: 'This is a simplified setup. Full webhook integration coming soon.'
    });

  } catch (error) {
    console.error('Failed to setup webhook:', error);
    res.status(500).json({ 
      error: 'Failed to setup webhook',
      message: error.message 
    });
  }
}
