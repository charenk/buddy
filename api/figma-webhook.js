// Full Figma AI Buddy webhook implementation
const crypto = require('crypto');

// Environment variables
const FIGMA_PAT = process.env.FIGMA_PAT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIGMA_WEBHOOK_SECRET = process.env.FIGMA_WEBHOOK_SECRET;

// Helper function to verify webhook signature
function verifySignature(body, signature) {
  if (!FIGMA_WEBHOOK_SECRET || !signature) return false;
  const hmac = crypto.createHmac('sha256', FIGMA_WEBHOOK_SECRET).update(body).digest('hex');
  const clean = signature.replace(/^sha256=/, '').toLowerCase();
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(clean));
}

// Helper function to extract node ID from message
function extractNodeIdFromMessage(message) {
  const match = message.match(/node-id=([^\s&]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

// Helper function to export Figma node as PNG
async function exportNodePng(fileKey, nodeId) {
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`;
  const response = await fetch(url, {
    headers: { 'X-Figma-Token': FIGMA_PAT }
  });
  
  if (!response.ok) throw new Error(`Figma export failed: ${response.status}`);
  const data = await response.json();
  return data.images?.[nodeId];
}

// Helper function to get AI critique
async function getAICritique(ask, imageUrl) {
  const systemPrompt = `You are "Buddy," a staff/principal product designer with systems thinking.
Be direct, specific, and practical. Always:
1) Call out usability risks,
2) Edge cases and failure states,
3) Accessibility (contrast, focus, keyboard, SR),
4) Responsive behavior,
5) IA clarity,
6) Interaction flows (loading/empty/error/success),
7) Metrics to validate.
Structure with short headers and bullets. No fluff. Offer alternatives tied to the problem.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Ask: ${ask}\nDeliver a compact critique with: What works, Top risks, Edge cases, Accessibility, Responsive, Alternatives, Next moves, Metrics.` }
      ]
    }
  ];

  if (imageUrl) {
    messages[1].content.push({ type: 'image_url', image_url: imageUrl });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages
    })
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response.';
}

// Helper function to reply to Figma comment
async function replyToComment(fileKey, commentId, message) {
  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
    method: 'POST',
    headers: {
      'X-Figma-Token': FIGMA_PAT,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: message
    })
  });

  if (!response.ok) throw new Error(`Reply failed: ${response.status}`);
  return response.json();
}

// Helper function to log to Supabase
async function logToSupabase(eventData) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Supabase not configured, skipping log');
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      console.error('Supabase log failed:', response.status);
    }
  } catch (error) {
    console.error('Supabase log error:', error.message);
  }
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-figma-signature'] || req.headers['x-hub-signature-256'];
    
    // Verify webhook signature (optional for now)
    // if (!verifySignature(rawBody, signature)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const data = req.body;
    console.log('Received webhook data:', JSON.stringify(data, null, 2));

    // Check if this is a comment event
    if (!data.comment || !data.file_key) {
      console.log('Not a comment event, ignoring');
      return res.status(200).json({ ok: true, ignored: true });
    }

    const { file_key, comment } = data;
    const message = comment.message || '';

    // Check for @buddy mention
    if (!/@buddy\b/i.test(message)) {
      console.log('No @buddy mention, ignoring');
      return res.status(200).json({ ok: true, ignored: true });
    }

    console.log('Processing @buddy comment:', message);

    // Extract the ask after @buddy
    const ask = message.replace(/.*@buddy\s*/i, '').trim() || 'General critique this frame';

    // Try to get node ID and export image
    let nodeId = extractNodeIdFromMessage(message);
    let imageUrl = null;

    if (nodeId) {
      try {
        imageUrl = await exportNodePng(file_key, nodeId);
        console.log('Exported image:', imageUrl);
      } catch (error) {
        console.log('Image export failed:', error.message);
      }
    }

    // Get AI critique
    const startTime = Date.now();
    let critique = '';
    let success = true;
    let error = null;

    try {
      critique = await getAICritique(ask, imageUrl);
      console.log('AI critique generated:', critique.substring(0, 100) + '...');
    } catch (err) {
      success = false;
      error = err.message;
      critique = `Sorry, I encountered an error: ${err.message}`;
      console.error('AI critique failed:', err);
    }

    const latency = Date.now() - startTime;

    // Log to Supabase
    await logToSupabase({
      file_key: file_key,
      comment_id: comment.id,
      node_id: nodeId,
      scope: ask.startsWith('/') ? ask.split(' ')[0] : 'full',
      image_included: Boolean(imageUrl),
      model: 'gpt-4o-mini',
      latency_ms: latency,
      ok: success,
      error: error
    });

    // Reply to the comment in Figma
    try {
      await replyToComment(file_key, comment.id, critique);
      console.log('Replied to Figma comment successfully');
    } catch (err) {
      console.error('Failed to reply to Figma comment:', err);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to reply to Figma comment: ' + err.message 
      });
    }

    return res.status(200).json({ 
      ok: true, 
      message: 'Processed @buddy comment successfully',
      critique: critique.substring(0, 100) + '...'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
}