/**
 * Setup Account-Level Webhook API
 * Creates Figma webhook for user's entire account
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
    const { userId, figma_handle } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // For now, return instructions for manual setup
    // In a full implementation, this would create the webhook via Figma API
    const webhookUrl = `${process.env.VERCEL_URL || 'https://buddy-lac-five.vercel.app'}/api/figma-webhook-account`;
    
    res.status(200).json({
      success: true,
      message: 'Account-level webhook setup instructions',
      webhook_url: webhookUrl,
      instructions: {
        step1: 'Go to Figma Developer Portal',
        step2: 'Create a new webhook',
        step3: `Use this URL: ${webhookUrl}`,
        step4: 'Select "FILE_COMMENT" event type',
        step5: 'Set scope to "All files" or "Account level"',
        step6: 'Save and test with @buddy in any file'
      },
      status: 'ready_for_setup'
    });

  } catch (error) {
    console.error('Webhook setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
