export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Hello from Figma AI Buddy!', 
    method: req.method,
    timestamp: new Date().toISOString()
  });
}
