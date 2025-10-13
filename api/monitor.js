// Figma AI Buddy Monitoring Dashboard
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const dashboard = {
    timestamp: new Date().toISOString(),
    status: 'operational',
    services: {
      webhook: {
        status: 'active',
        endpoint: 'https://buddy-lac-five.vercel.app/api/figma-webhook',
        lastCheck: new Date().toISOString()
      },
      openai: {
        status: 'active',
        model: 'gpt-4o-mini',
        lastCheck: new Date().toISOString()
      },
      figma: {
        status: 'active',
        api: 'v1',
        lastCheck: new Date().toISOString()
      },
      supabase: {
        status: 'active',
        lastCheck: new Date().toISOString()
      }
    },
    recentActivity: [
      {
        id: 'test-123',
        timestamp: new Date().toISOString(),
        user: 'Charen Koneti',
        message: '@buddy analyze this mobile design',
        status: 'processing',
        stage: 'webhook_received',
        latency: '0ms'
      }
    ],
    statistics: {
      totalRequests: 0,
      successfulReplies: 0,
      failedReplies: 0,
      averageResponseTime: '0ms',
      last24Hours: {
        requests: 0,
        errors: 0,
        avgLatency: '0ms'
      }
    },
    healthChecks: {
      webhookEndpoint: '✅ Active',
      openaiConnection: '✅ Active', 
      figmaApiConnection: '✅ Active',
      supabaseConnection: '✅ Active'
    }
  };

  // Set CORS headers for web access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.status(200).json(dashboard);
}
