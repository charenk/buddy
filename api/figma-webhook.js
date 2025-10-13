// Optimized Figma AI Buddy webhook - Fast responses with proper replies
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

// Helper function to get AI critique (text-only for speed)
async function getAICritique(ask) {
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Ask: ${ask}\nDeliver a compact critique with: What works, Top risks, Edge cases, Accessibility, Responsive, Alternatives, Next moves, Metrics.`
        }
      ],
      max_tokens: 1000, // Limit response length for speed
      temperature: 0.7
    })
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response.';
}

// Helper function to reply to Figma comment (creates a proper reply)
async function replyToComment(fileKey, commentId, message) {
  console.log('Replying to Figma comment:', { fileKey, commentId, messageLength: message.length });
  
  // Use the correct Figma API endpoint for creating replies
  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
    method: 'POST',
    headers: {
      'X-Figma-Token': FIGMA_PAT,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      comment_id: commentId,
      message: message
    })
  });

  console.log('Figma API response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Figma API error:', errorText);
    throw new Error(`Reply failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('Figma API reply successful:', result);
  return result;
}

// Helper function to log to Supabase (async, don't wait)
async function logToSupabase(eventData) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify(eventData)
    });
  } catch (error) {
    console.error('Supabase log error:', error.message);
  }
}

export default async function handler(req, res) {
  const startTime = Date.now();
  
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

    // Get AI critique (text-only for speed)
    const aiStartTime = Date.now();
    let critique = '';
    let success = true;
    let error = null;

    try {
      critique = await getAICritique(ask);
      console.log('AI critique generated in', Date.now() - aiStartTime, 'ms');
    } catch (err) {
      success = false;
      error = err.message;
      critique = `Sorry, I encountered an error: ${err.message}`;
      console.error('AI critique failed:', err);
    }

    const totalLatency = Date.now() - startTime;

    // Reply to the comment in Figma (this should create a reply, not a new comment)
    try {
      await replyToComment(file_key, comment.id, critique);
      console.log('✅ Replied to Figma comment successfully in', totalLatency, 'ms');
    } catch (err) {
      console.error('Failed to reply to Figma comment:', err);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to reply to Figma comment: ' + err.message 
      });
    }

    // Log to Supabase (async, don't wait)
    logToSupabase({
      file_key: file_key,
      comment_id: comment.id,
      node_id: null, // No image processing for speed
      scope: ask.startsWith('/') ? ask.split(' ')[0] : 'full',
      image_included: false, // Disabled for speed
      model: 'gpt-4o-mini',
      latency_ms: totalLatency,
      ok: success,
      error: error
    });

    return res.status(200).json({ 
      ok: true, 
      message: 'Processed @buddy comment successfully',
      critique: critique.substring(0, 100) + '...',
      latency_ms: totalLatency
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      latency_ms: Date.now() - startTime
    });
  }
}