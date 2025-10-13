// Test endpoint to manually add activity for testing
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const testActivity = {
    user: 'Test User',
    message: '@buddy test this design',
    file_key: 'YmHonaIwpHSzvUvVvjxUPA',
    comment_id: 'test-123',
    status: 'success',
    stage: 'test_completed',
    latency: 1500,
    critique: 'This is a test response from the AI buddy.',
    timestamp: new Date().toISOString()
  };

  // Add to activity log
  fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://buddy-lac-five.vercel.app'}/api/activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testActivity)
  }).then(response => {
    if (response.ok) {
      res.status(200).json({ 
        success: true, 
        message: 'Test activity added successfully',
        activity: testActivity
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to add test activity' 
      });
    }
  }).catch(error => {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  });
}
