console.log('Figma AI Buddy - Server starting...');

// Simple health check
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Figma AI Buddy is running!', 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
}
