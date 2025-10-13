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

// Helper function to export Figma node as PNG (for visual analysis)
async function exportNodePng(fileKey, nodeId) {
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=2`;
  const response = await fetch(url, {
    headers: { 'X-Figma-Token': FIGMA_PAT }
  });
  
  if (!response.ok) throw new Error(`Figma export failed: ${response.status}`);
  const data = await response.json();
  return data.images?.[nodeId];
}

// Helper function to extract node ID from message
function extractNodeIdFromMessage(message) {
  const match = message.match(/node-id=([^\s&]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

// Helper function to parse user preferences from ask
function parseUserPreferences(ask) {
  const preferences = {
    domain: 'general',
    focus: 'usability',
    tone: 'concise',
    length: 'standard',
    expertise: 'product-design'
  };

  // Domain expertise
  if (/mobile|ios|android/i.test(ask)) preferences.domain = 'mobile';
  if (/web|desktop|browser/i.test(ask)) preferences.domain = 'web';
  if (/enterprise|b2b|saas/i.test(ask)) preferences.domain = 'enterprise';
  if (/ecommerce|shop|commerce/i.test(ask)) preferences.domain = 'ecommerce';
  if (/fintech|banking|finance/i.test(ask)) preferences.domain = 'fintech';

  // Focus areas
  if (/accessibility|a11y|wcag/i.test(ask)) preferences.focus = 'accessibility';
  if (/visual|ui|design|aesthetic/i.test(ask)) preferences.focus = 'visual-design';
  if (/ux|usability|user-experience/i.test(ask)) preferences.focus = 'usability';
  if (/performance|speed|optimization/i.test(ask)) preferences.focus = 'performance';
  if (/conversion|business|metrics/i.test(ask)) preferences.focus = 'business';

  // Tone
  if (/brief|quick|short/i.test(ask)) preferences.tone = 'brief';
  if (/detailed|comprehensive|thorough/i.test(ask)) preferences.tone = 'detailed';
  if (/technical|dev|developer/i.test(ask)) preferences.tone = 'technical';

  // Length
  if (/brief|quick|short/i.test(ask)) preferences.length = 'brief';
  if (/comprehensive|detailed|thorough/i.test(ask)) preferences.length = 'comprehensive';

  return preferences;
}

// Helper function to build system prompt based on preferences
function buildSystemPrompt(preferences) {
  const { domain, focus, tone, length, expertise } = preferences;

  const domainExpertise = {
    'mobile': 'mobile app design with iOS/Android best practices',
    'web': 'web application design with responsive principles',
    'enterprise': 'enterprise software with complex workflows',
    'ecommerce': 'e-commerce platforms and conversion optimization',
    'fintech': 'financial applications with security and compliance',
    'general': 'general product design principles'
  };

  const focusAreas = {
    'accessibility': 'accessibility compliance (WCAG 2.1 AA), screen readers, keyboard navigation, color contrast',
    'visual-design': 'visual hierarchy, typography, color theory, spacing, branding consistency',
    'usability': 'user experience, task completion, cognitive load, information architecture',
    'performance': 'loading times, rendering performance, user perception of speed',
    'business': 'conversion rates, user engagement, business metrics, ROI',
    'general': 'overall design quality and user experience'
  };

  const toneInstructions = {
    'brief': 'Keep responses under 200 words. Use bullet points. Be direct.',
    'concise': 'Keep responses under 400 words. Use clear headers and bullets.',
    'detailed': 'Provide comprehensive analysis up to 800 words with examples.',
    'technical': 'Use technical terminology. Include implementation details.'
  };

  const lengthInstructions = {
    'brief': 'Focus on top 3 issues only. Skip edge cases.',
    'standard': 'Cover main issues and 2-3 alternatives.',
    'comprehensive': 'Cover all aspects: risks, edge cases, alternatives, metrics.'
  };

  return `You are "Buddy," a ${domainExpertise[domain]} expert specializing in ${focusAreas[focus]}.

${toneInstructions[tone]}

${lengthInstructions[length]}

Always be specific and actionable. ${tone === 'technical' ? 'Include technical implementation details.' : 'Avoid jargon, be clear and practical.'}`;
}

// Helper function to get AI critique (with customizable preferences)
async function getAICritique(ask, imageUrl = null) {
  const preferences = parseUserPreferences(ask);
  const systemPrompt = buildSystemPrompt(preferences);

  console.log('AI Preferences:', preferences);

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Analyze this design: ${ask}` }
      ]
    }
  ];

  // Add image if provided
  if (imageUrl) {
    messages[1].content.push({ 
      type: 'image_url', 
      image_url: { url: imageUrl }
    });
    console.log('Added image to AI analysis:', imageUrl.substring(0, 100) + '...');
  }

  // Adjust token limit based on preferences
  const maxTokens = preferences.length === 'brief' ? 500 : 
                   preferences.length === 'comprehensive' ? 2000 : 1000;

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
      comment_id: parseInt(commentId),
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
    
    // Check for image attachments in the comment
    let imageUrl = null;
    let imageIncluded = false;
    let imageSource = 'none';

    // First, check if there's an image attachment in the comment
    if (comment.attachments && comment.attachments.length > 0) {
      // Get the first image attachment
      const imageAttachment = comment.attachments.find(att => 
        att.type === 'image' || att.mime_type?.startsWith('image/')
      );
      
      if (imageAttachment) {
        imageUrl = imageAttachment.url;
        imageIncluded = true;
        imageSource = 'attachment';
        console.log('Found image attachment:', imageUrl);
      }
    }

    // If no attachment, check if user wants visual analysis from Figma node
    const wantsVisual = /visual|image|see|look/i.test(ask);
    
    if (!imageIncluded && wantsVisual) {
      const nodeId = extractNodeIdFromMessage(message);
      if (nodeId) {
        try {
          imageUrl = await exportNodePng(file_key, nodeId);
          imageIncluded = true;
          imageSource = 'figma-export';
          console.log('Exported Figma node for visual analysis:', imageUrl);
        } catch (error) {
          console.log('Figma export failed, continuing with text-only:', error.message);
        }
      } else {
        console.log('No node ID found for visual analysis, using text-only');
      }
    }

    // Get AI critique (with or without visual)
    const aiStartTime = Date.now();
    let critique = '';
    let success = true;
    let error = null;

    try {
      critique = await getAICritique(ask, imageUrl);
      console.log('AI critique generated in', Date.now() - aiStartTime, 'ms', imageIncluded ? '(with visual)' : '(text-only)');
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
      node_id: imageSource === 'figma-export' ? extractNodeIdFromMessage(message) : null,
      scope: ask.startsWith('/') ? ask.split(' ')[0] : 'full',
      image_included: imageIncluded,
      image_source: imageSource,
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