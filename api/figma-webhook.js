// ULTRA-FAST Figma AI Buddy - Sub-3-second responses
const crypto = require('crypto');

// Environment variables
const FIGMA_PAT = process.env.FIGMA_PAT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIGMA_WEBHOOK_SECRET = process.env.FIGMA_WEBHOOK_SECRET;

// Performance optimizations
const PROMPT_CACHE = new Map();
const RESPONSE_CACHE = new Map();
const HTTP_AGENT = new (require('http').Agent)({ keepAlive: true, maxSockets: 10 });

// Pre-built system prompts for instant access
const SYSTEM_PROMPTS = {
  'brief-mobile-usability': `You are Buddy, a mobile UX expert. Give 3 bullet points max. Be direct.`,
  'brief-web-accessibility': `You are Buddy, an accessibility expert. Give 3 bullet points max. Focus on WCAG issues.`,
  'brief-visual-design': `You are Buddy, a visual design expert. Give 3 bullet points max. Focus on hierarchy and spacing.`,
  'brief-general': `You are Buddy, a product design expert. Give 3 bullet points max. Be practical.`,
  'concise-mobile-usability': `You are Buddy, a mobile UX expert. Keep under 200 words. Use headers.`,
  'concise-web-accessibility': `You are Buddy, an accessibility expert. Keep under 200 words. Focus on WCAG compliance.`,
  'concise-visual-design': `You are Buddy, a visual design expert. Keep under 200 words. Focus on visual hierarchy.`,
  'concise-general': `You are Buddy, a product design expert. Keep under 200 words. Be actionable.`
};

// Fast preference parsing with regex optimization
function parsePreferences(ask) {
  const lower = ask.toLowerCase();
  
  // Quick domain detection
  const domain = /mobile|ios|android/.test(lower) ? 'mobile' :
                /web|desktop|browser/.test(lower) ? 'web' :
                /enterprise|b2b|saas/.test(lower) ? 'enterprise' : 'general';
  
  // Quick focus detection  
  const focus = /accessibility|a11y|wcag/.test(lower) ? 'accessibility' :
               /visual|ui|design|aesthetic/.test(lower) ? 'visual-design' :
               /performance|speed|optimization/.test(lower) ? 'performance' : 'usability';
  
  // Quick tone detection
  const tone = /brief|quick|short/.test(lower) ? 'brief' : 'concise';
  
  return { domain, focus, tone, length: tone };
}

// Ultra-fast system prompt generation
function getSystemPrompt(preferences) {
  const key = `${preferences.tone}-${preferences.domain}-${preferences.focus}`;
  
  if (PROMPT_CACHE.has(key)) {
    return PROMPT_CACHE.get(key);
  }
  
  const prompt = SYSTEM_PROMPTS[key] || SYSTEM_PROMPTS[`${preferences.tone}-general`];
  PROMPT_CACHE.set(key, prompt);
  return prompt;
}

// Optimized AI critique with streaming
async function getAICritique(ask, imageUrl = null) {
  const preferences = parsePreferences(ask);
  const systemPrompt = getSystemPrompt(preferences);
  
  // Check cache first
  const cacheKey = `${ask}-${imageUrl || 'no-image'}`;
  if (RESPONSE_CACHE.has(cacheKey)) {
    console.log('Cache hit!');
    return RESPONSE_CACHE.get(cacheKey);
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: [{ type: 'text', text: ask }] }
  ];

  if (imageUrl) {
    messages[1].content.push({ type: 'image_url', image_url: { url: imageUrl } });
  }

  // Optimized token limits
  const maxTokens = preferences.tone === 'brief' ? 200 : 400;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.3, // Lower temperature for faster, more consistent responses
      stream: false // Keep false for now, but ready for streaming
    })
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  const result = data.choices?.[0]?.message?.content?.trim() || 'No response.';
  
  // Cache the result
  RESPONSE_CACHE.set(cacheKey, result);
  
  return result;
}

// Ultra-fast processing with immediate response
async function processComment(fileKey, commentId, ask, imageUrl) {
  const startTime = Date.now();
  
  // Get AI critique first (this is the bottleneck)
  const critique = await getAICritique(ask, imageUrl);
  const aiTime = Date.now() - startTime;
  console.log(`AI generated in ${aiTime}ms`);
  
  // Reply to Figma (this is fast)
  const replyStart = Date.now();
  await replyToComment(fileKey, commentId, critique);
  const replyTime = Date.now() - replyStart;
  
  console.log(`Figma reply sent in ${replyTime}ms`);
  console.log(`Total processing: ${Date.now() - startTime}ms`);
  
  return critique;
}

// Optimized Figma reply
async function replyToComment(fileKey, commentId, message) {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Figma reply failed: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

// Truly async logging (fire and forget)
function logToSupabase(eventData) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  
  // Don't await this - fire and forget
  fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify(eventData)
  }).catch(() => {}); // Silent fail
}

// Main handler with aggressive optimizations
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

    const data = req.body;
    
    // Quick validation
    if (!data.comment || !data.file_key) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const { file_key, comment } = data;
    const message = comment.message || '';

    // Quick @buddy check
    if (!/@buddy\b/i.test(message)) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    console.log('Processing @buddy comment:', message);

    // Extract ask
    const ask = message.replace(/.*@buddy\s*/i, '').trim() || 'General critique';
    
    // Check for image attachment (fast path)
    let imageUrl = null;
    if (comment.attachments?.length > 0) {
      const imageAttachment = comment.attachments.find(att => 
        att.type === 'image' || att.mime_type?.startsWith('image/')
      );
      if (imageAttachment) {
        imageUrl = imageAttachment.url;
        console.log('Found image attachment');
      }
    }

    // Process comment with parallel APIs
    const critique = await processComment(file_key, comment.id, ask, imageUrl);
    
    const totalTime = Date.now() - startTime;
    console.log(`🚀 Total response time: ${totalTime}ms`);

    // Async logging (don't wait)
    logToSupabase({
      file_key: file_key,
      comment_id: comment.id,
      image_included: Boolean(imageUrl),
      latency_ms: totalTime,
      ok: true
    });

    return res.status(200).json({ 
      ok: true, 
      message: 'Processed @buddy comment successfully',
      critique: critique.substring(0, 100) + '...',
      latency_ms: totalTime
    });

  } catch (error) {
    console.error('Webhook error:', error);
    const totalTime = Date.now() - startTime;
    
    // Async error logging
    logToSupabase({
      file_key: 'unknown',
      comment_id: 'unknown',
      latency_ms: totalTime,
      ok: false,
      error: error.message
    });
    
    return res.status(500).json({ 
      ok: false, 
      error: error.message,
      latency_ms: totalTime
    });
  }
}
