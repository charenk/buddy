// Real-time Activity Log for Figma AI Buddy
// This endpoint shows all recent @buddy requests and their status

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Get activities from global store
    const activities = global.activityLog || [];
    
    // Return recent activity
    const recentActivity = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50); // Last 50 activities

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      timestamp: new Date().toISOString(),
      totalActivities: activities.length,
      recentActivities: recentActivity,
      summary: {
        total: activities.length,
        successful: activities.filter(a => a.status === 'success').length,
        failed: activities.filter(a => a.status === 'failed').length,
        processing: activities.filter(a => a.status === 'processing').length
      }
    });
  } else if (req.method === 'POST') {
    // Add new activity (called by webhook)
    const activity = {
      id: `activity-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...req.body
    };
    
    if (!global.activityLog) {
      global.activityLog = [];
    }
    global.activityLog.push(activity);
    
    // Keep only last 1000 activities
    if (global.activityLog.length > 1000) {
      global.activityLog.splice(0, global.activityLog.length - 1000);
    }
    
    res.status(200).json({ success: true, id: activity.id });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
