// Real-time Activity Log for Figma AI Buddy
// This endpoint shows all recent @buddy requests and their status

const ACTIVITY_LOG = [];

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Return recent activity
    const recentActivity = ACTIVITY_LOG
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50); // Last 50 activities

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      timestamp: new Date().toISOString(),
      totalActivities: ACTIVITY_LOG.length,
      recentActivities: recentActivity,
      summary: {
        total: ACTIVITY_LOG.length,
        successful: ACTIVITY_LOG.filter(a => a.status === 'success').length,
        failed: ACTIVITY_LOG.filter(a => a.status === 'failed').length,
        processing: ACTIVITY_LOG.filter(a => a.status === 'processing').length
      }
    });
  } else if (req.method === 'POST') {
    // Add new activity (called by webhook)
    const activity = {
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    ACTIVITY_LOG.push(activity);
    
    // Keep only last 1000 activities
    if (ACTIVITY_LOG.length > 1000) {
      ACTIVITY_LOG.splice(0, ACTIVITY_LOG.length - 1000);
    }
    
    res.status(200).json({ success: true, id: activity.id });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
