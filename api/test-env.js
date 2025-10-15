/**
 * Test Environment Variables API
 * Simple endpoint to verify environment variables are loaded
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const envCheck = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Missing',
        FIGMA_PAT: process.env.FIGMA_PAT ? 'Set' : 'Missing',
        FIGMA_WEBHOOK_SECRET: process.env.FIGMA_WEBHOOK_SECRET ? 'Set' : 'Missing'
      }
    };

    res.status(200).json(envCheck);

  } catch (error) {
    console.error('Environment test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
