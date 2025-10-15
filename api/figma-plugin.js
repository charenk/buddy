/**
 * Figma Plugin API Endpoint
 * Handles requests from the Figma plugin
 */

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const startTime = Date.now();

  try {
    const { prompt, settings, file_key, user } = req.body;
    
    console.log('[buddy] Plugin request received:', { prompt, file_key, user });

    if (!prompt) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Prompt is required' 
      });
    }

    // Build AI prompt with settings
    const aiPrompt = buildAIPrompt(prompt, settings);
    
    // Get AI critique
    const critique = await getAICritique(aiPrompt);

    // Log activity
    const latency = Date.now() - startTime;
    console.log('[buddy] Plugin analysis completed:', { latency });

    res.status(200).json({
      ok: true,
      critique: critique,
      latency_ms: latency,
      settings_applied: settings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[buddy] Plugin error:', error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to analyze design: ' + error.message
    });
  }
}

// Build AI prompt with user settings
function buildAIPrompt(prompt, settings = {}) {
  const { length = 'detailed', tone = 'professional', focus = ['ux', 'visual'] } = settings;
  
  const lengthInstructions = {
    'brief': 'Keep responses concise, focusing on 2-3 key points. Use bullet points.',
    'detailed': 'Provide a comprehensive analysis with 5-7 key points, structured with headers and bullet points.',
    'comprehensive': 'Offer an in-depth, exhaustive critique covering all aspects, with detailed explanations and examples.'
  };

  const toneInstructions = {
    'casual': 'Use a friendly, conversational tone. Be encouraging.',
    'professional': 'Maintain a formal, objective, and constructive tone.',
    'encouraging': 'Be highly supportive and positive, focusing on growth.',
    'critical': 'Be direct and highlight potential flaws clearly, but always offer solutions.'
  };

  const focusAreas = {
    'ux': 'user experience, task completion, cognitive load, information architecture',
    'visual': 'visual hierarchy, typography, color theory, spacing, branding consistency',
    'accessibility': 'accessibility compliance (WCAG 2.1 AA), screen readers, keyboard navigation, color contrast',
    'performance': 'loading times, rendering performance, user perception of speed',
    'content': 'content strategy, microcopy, tone of voice',
    'interaction': 'interaction design, animations, transitions, feedback mechanisms'
  };

  let systemPrompt = `You are "Buddy," a staff/principal product designer with systems thinking.
Be direct, specific, and practical. Always:
1) Call out usability risks,
2) Edge cases and failure states,
3) Accessibility (contrast, focus, keyboard, SR),
4) Responsive behavior,
5) IA clarity,
6) Interaction flows (loading/empty/error/success),
7) Metrics to validate.

Structure with short headers and bullets. No fluff. Offer alternatives tied to the problem.`;

  systemPrompt += `\n\nFocus areas: ${focus.map(f => focusAreas[f] || f).join(', ')}.`;
  systemPrompt += `\n${toneInstructions[tone] || toneInstructions.professional}`;
  systemPrompt += `\n${lengthInstructions[length] || lengthInstructions.detailed}`;

  return {
    systemPrompt,
    userPrompt: prompt,
    maxTokens: length === 'brief' ? 500 : length === 'comprehensive' ? 2000 : 1000,
    temperature: tone === 'critical' ? 0.8 : 0.7
  };
}

// Get AI critique from OpenAI
async function getAICritique(aiPrompt) {
  const { systemPrompt, userPrompt, maxTokens, temperature } = aiPrompt;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response generated.';
}
