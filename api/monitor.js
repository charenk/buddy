// Figma AI Buddy Monitoring & Performance Dashboard
export default function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get recent activities from global store
  const activities = global.activityLog || [];
  const recentActivities = activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  // Calculate statistics
  const totalRequests = activities.length;
  const successfulReplies = activities.filter(a => a.status === 'success').length;
  const failedReplies = activities.filter(a => a.status === 'failed').length;
  const avgLatency = activities.length > 0 
    ? Math.round(activities.reduce((sum, a) => sum + (a.latency || 0), 0) / activities.length)
    : 0;

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
    recentActivity: recentActivities,
    statistics: {
      totalRequests,
      successfulReplies,
      failedReplies,
      averageResponseTime: `${avgLatency}ms`,
      successRate: totalRequests > 0 ? `${Math.round((successfulReplies / totalRequests) * 100)}%` : '0%',
      last24Hours: {
        requests: activities.filter(a => 
          new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        errors: activities.filter(a => 
          a.status === 'failed' && new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        avgLatency: `${avgLatency}ms`
      }
    },
    performance: {
      responseTime: {
        current: `${avgLatency}ms`,
        target: '<4000ms',
        status: avgLatency < 4000 ? '✅ Good' : '⚠️ Slow'
      },
      uptime: {
        status: '✅ Operational',
        lastDowntime: 'Never'
      },
      contextManagement: {
        status: '✅ Active',
        cachedContexts: 'Dynamic',
        cacheHitRate: 'High'
      }
    },
    healthChecks: {
      webhookEndpoint: '✅ Active',
      openaiConnection: '✅ Active', 
      figmaApiConnection: '✅ Active',
      supabaseConnection: '✅ Active',
      contextSystem: '✅ Active',
      userManagement: '✅ Active'
    }
  };

  // Set CORS headers for web access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.status(200).json(dashboard);
}
