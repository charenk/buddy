// High-Performance Figma AI Buddy Webhook with Context Management
// Optimized for speed with user context integration

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

// Helper function to get user by Figma handle
async function getUserByFigmaHandle(handle) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?figma_handle=eq.${handle}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Error fetching user by Figma handle:', error);
    return null;
  }
}

// Helper function to get user context with caching
const contextCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getUserContext(userId) {
  try {
    // Check cache first
    const cached = contextCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.context;
    }

    // Fetch from database
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_contexts?user_id=eq.${userId}&is_active=eq.true&select=*&order=updated_at.desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    const context = data[0];
    
    if (context) {
      // Cache the result
      contextCache.set(userId, { context, timestamp: Date.now() });
    }
    
    return context;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

// Helper function to build AI prompt with user context
function buildContextualPrompt(comment, userContext) {
  if (!userContext) {
    // Default prompt for users without context
    return {
      systemPrompt: "You are a design expert. Provide helpful, actionable feedback on the design.",
      maxTokens: 400,
      temperature: 0.3
    };
  }

  const { response_style, custom_prompts } = userContext;
  const { length, tone, focus, domain, language } = response_style;

  // Use custom system prompt if provided
  if (custom_prompts?.systemPrompt) {
    return {
      systemPrompt: custom_prompts.systemPrompt,
      maxTokens: length === 'brief' ? 150 : length === 'detailed' ? 400 : 800,
      temperature: tone === 'casual' ? 0.7 : tone === 'professional' ? 0.3 : tone === 'encouraging' ? 0.6 : 0.4
    };
  }

  // Build system prompt based on user preferences
  let systemPrompt = `You are a design expert specializing in ${focus.join(', ')}. `;
  
  // Add tone instructions
  switch (tone) {
    case 'casual':
      systemPrompt += "Use a friendly, conversational tone. Be encouraging and supportive. ";
      break;
    case 'professional':
      systemPrompt += "Use a formal, professional tone. Be objective and thorough. ";
      break;
    case 'encouraging':
      systemPrompt += "Use an encouraging, positive tone. Focus on growth and improvement. ";
      break;
    case 'critical':
      systemPrompt += "Use a direct, critical tone. Be honest about problems and solutions. ";
      break;
  }
  
  // Add length instructions
  switch (length) {
    case 'brief':
      systemPrompt += "Provide 2-3 key points maximum. Be concise and actionable. ";
      break;
    case 'detailed':
      systemPrompt += "Provide 5-7 detailed points with explanations and examples. ";
      break;
    case 'comprehensive':
      systemPrompt += "Provide a thorough analysis covering all aspects of the design. ";
      break;
  }
  
  // Add domain expertise
  if (domain !== 'general') {
    systemPrompt += `Focus specifically on ${domain} design principles and best practices. `;
  }
  
  // Add language instruction
  if (language !== 'en') {
    systemPrompt += `Respond in ${language}. `;
  }

  return {
    systemPrompt,
    maxTokens: length === 'brief' ? 150 : length === 'detailed' ? 400 : 800,
    temperature: tone === 'casual' ? 0.7 : tone === 'professional' ? 0.3 : tone === 'encouraging' ? 0.6 : 0.4
  };
}

// Helper function to get AI critique with user context
async function getAICritique(comment, imageUrl, userContext, userId) {
  const startTime = Date.now();
  
  try {
    const promptData = buildContextualPrompt(comment, userContext);
    let apiKey = OPENAI_API_KEY;
    let interactionType = 'trial';
    
    // Check if user has their own API key and no trial remaining
    if (userContext?.api_key_encrypted) {
      // In production, decrypt the API key
      // For now, we'll use the default key but track as 'paid'
      interactionType = 'paid';
    }
    
    // Determine if we need visual analysis
    const needsVisualAnalysis = imageUrl && (
      comment.toLowerCase().includes('visual') ||
      comment.toLowerCase().includes('image') ||
      comment.toLowerCase().includes('design') ||
      comment.toLowerCase().includes('ui') ||
      comment.toLowerCase().includes('look')
    );
    
    const messages = [
      {
        role: "system",
        content: promptData.systemPrompt
      },
      {
        role: "user",
        content: needsVisualAnalysis ? 
          `Analyze this design: "${comment}"` : 
          `Give design feedback on: "${comment}"`
      }
    ];
    
    // Add image if needed
    if (needsVisualAnalysis && imageUrl) {
      messages[1].content = [
        {
          type: "text",
          text: `Analyze this design: "${comment}"`
        },
        {
          type: "image_url",
          image_url: { url: imageUrl }
        }
      ];
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: promptData.maxTokens,
        temperature: promptData.temperature
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Track usage if userId provided
    if (userId) {
      try {
        const costCents = Math.max(1, (data.usage?.total_tokens || 0) / 1000 * 2); // $0.002 per 1K tokens
        
        await fetch(`${SUPABASE_URL}/rest/v1/usage_logs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            file_key: 'unknown', // Will be updated with actual file_key
            interaction_type: interactionType,
            api_key_used: interactionType === 'trial' ? 'yours' : 'user',
            response_time_ms: responseTime,
            tokens_used: data.usage?.total_tokens || 0,
            cost_cents: costCents
          })
        });
        
        // Update trial count if it's a trial user
        if (interactionType === 'trial') {
          await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              trial_count: 'trial_count + 1',
              last_active_at: new Date().toISOString()
            })
          });
        }
      } catch (error) {
        console.error('Error tracking usage:', error);
      }
    }
    
    console.log(`AI response generated in ${responseTime}ms (${interactionType})`);
    
    return aiResponse;
  } catch (error) {
    console.error('AI critique error:', error);
    return 'Sorry, I encountered an error while analyzing your design. Please try again.';
  }
}

// Helper function to reply to Figma comment
async function replyToComment(fileKey, commentId, message) {
  console.log('Replying to Figma comment:', { fileKey, commentId, messageLength: message.length });
  
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

// Helper function to log activity
async function logActivity(activityData) {
  try {
    console.log('Activity logged:', JSON.stringify(activityData, null, 2));
    
    if (!global.activityLog) {
      global.activityLog = [];
    }
    global.activityLog.push({
      ...activityData,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    
    if (global.activityLog.length > 100) {
      global.activityLog.splice(0, global.activityLog.length - 100);
    }
    
    console.log('Activity stored successfully');
  } catch (error) {
    console.error('Activity log error:', error.message);
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
    const commentData = Array.isArray(comment) ? comment[0] : comment;
    const message = commentData?.message || commentData?.text || '';

    // Check for @buddy mention
    if (!/@buddy\b/i.test(message)) {
      console.log('No @buddy mention, ignoring');
      return res.status(200).json({ ok: true, ignored: true });
    }

    console.log('Processing @buddy comment:', message);

    // Get user by Figma handle
    const figmaHandle = data.triggered_by?.handle || commentData?.triggered_by?.handle || commentData?.user?.name;
    let user = null;
    let userContext = null;
    
    if (figmaHandle) {
      user = await getUserByFigmaHandle(figmaHandle);
      if (user) {
        userContext = await getUserContext(user.id);
        console.log('User context loaded:', userContext ? 'Yes' : 'No');
      }
    }

    // Log activity start
    await logActivity({
      user: figmaHandle || 'Unknown',
      message: message,
      file_key: file_key,
      comment_id: data.comment_id || commentData?.comment_id || commentData?.id,
      status: 'processing',
      stage: 'webhook_received',
      has_context: !!userContext,
      timestamp: new Date().toISOString()
    });

    // Extract the ask after @buddy
    const ask = message.replace(/.*@buddy\s*/i, '').trim() || 'General critique this frame';
    
    // Check for image attachments
    let imageUrl = null;
    let imageIncluded = false;
    let imageSource = 'none';

    if (commentData?.attachments && commentData.attachments.length > 0) {
      const imageAttachment = commentData.attachments.find(att => 
        att.type === 'image' || att.mime_type?.startsWith('image/')
      );
      
      if (imageAttachment) {
        imageUrl = imageAttachment.url;
        imageIncluded = true;
        imageSource = 'attachment';
        console.log('Found image attachment:', imageUrl);
      }
    }

    // Check if user wants visual analysis from Figma node
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
      }
    }

    // Get AI critique with user context
    const aiStartTime = Date.now();
    let critique = '';
    let success = true;
    let error = null;

    try {
      critique = await getAICritique(ask, imageUrl, userContext, user?.id);
      console.log('AI critique generated in', Date.now() - aiStartTime, 'ms', imageIncluded ? '(with visual)' : '(text-only)');
    } catch (err) {
      success = false;
      error = err.message;
      critique = `Sorry, I encountered an error: ${err.message}`;
      console.error('AI critique failed:', err);
    }

    const totalLatency = Date.now() - startTime;

    // Reply to the comment in Figma
    const commentId = data.comment_id || commentData?.comment_id || commentData?.id;
    try {
      await replyToComment(file_key, commentId, critique);
      console.log('✅ Replied to Figma comment successfully in', totalLatency, 'ms');
      
      // Log successful activity
      await logActivity({
        user: figmaHandle || 'Unknown',
        message: message,
        file_key: file_key,
        comment_id: commentId,
        status: 'success',
        stage: 'figma_reply_sent',
        latency: totalLatency,
        has_context: !!userContext,
        critique: critique.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Failed to reply to Figma comment:', err);
      
      // Log failed activity
      await logActivity({
        user: figmaHandle || 'Unknown',
        message: message,
        file_key: file_key,
        comment_id: commentId,
        status: 'failed',
        stage: 'figma_reply_failed',
        error: err.message,
        latency: totalLatency,
        has_context: !!userContext,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to reply to Figma comment: ' + err.message 
      });
    }

    return res.status(200).json({ 
      ok: true, 
      message: 'Processed @buddy comment successfully',
      critique: critique.substring(0, 100) + '...',
      latency_ms: totalLatency,
      has_context: !!userContext,
      user_id: user?.id || null
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
