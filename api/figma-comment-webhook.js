/**
 * Figma Comment Webhook Handler
 * Receives comment events from Figma and responds with AI analysis
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

  try {
    const { event_type, file_key, file_name, triggered_by, comment } = req.body;
    
    console.log('[buddy] Webhook received:', { 
      event_type, 
      file_key, 
      triggered_by: triggered_by?.handle || 'Unknown',
      comment_id: comment?.id
    });

    // Only process comment events
    if (event_type !== 'FILE_COMMENT') {
      return res.status(200).json({ message: 'Event type not supported' });
    }

    // Check if comment mentions @buddy
    const commentText = comment?.message || '';
    if (!commentText.toLowerCase().includes('@buddy')) {
      return res.status(200).json({ message: 'Comment does not mention @buddy' });
    }

    // Extract the analysis prompt (remove @buddy mention)
    const prompt = commentText.replace(/@buddy\s*/gi, '').trim();
    
    if (!prompt) {
      await replyToComment(file_key, comment.id, 'Hi! I\'m Buddy, your AI design assistant. What would you like me to analyze about this design?');
      return res.status(200).json({ message: 'Asked for analysis prompt' });
    }

    // Show loading message
    await replyToComment(file_key, comment.id, '🤖 Analyzing your design... Please wait.');

    // Get the node that was commented on
    const nodeId = comment?.parent_id;
    if (!nodeId) {
      await replyToComment(file_key, comment.id, '❌ Could not find the design element. Please try commenting on a visible frame or component.');
      return res.status(200).json({ message: 'No node ID found' });
    }

    // Get file information and node details
    const fileInfo = await getFileInfo(file_key);
    const nodeInfo = await getNodeInfo(file_key, nodeId);
    
    if (!nodeInfo) {
      await replyToComment(file_key, comment.id, '❌ Could not find the design element. Please try commenting on a visible frame or component.');
      return res.status(200).json({ message: 'Node not found' });
    }

    // Get visual data if it's a frame or component
    let visualData = null;
    if (nodeInfo.type === 'FRAME' || nodeInfo.type === 'COMPONENT' || nodeInfo.type === 'INSTANCE') {
      try {
        visualData = await getVisualData(file_key, nodeId);
      } catch (error) {
        console.log('Could not get visual data:', error.message);
      }
    }

    // Create analysis prompt
    const analysisPrompt = `${prompt}\n\nAnalyzing: ${nodeInfo.name} (${nodeInfo.type})`;

    // Get user context for personalized analysis
    const userContext = await getUserContext(triggered_by?.id);
    
    // Get AI analysis with user context
    const aiResponse = await getAIAnalysis(analysisPrompt, visualData, nodeInfo, userContext);

    // Reply with the analysis
    await replyToComment(file_key, comment.id, `🎨 **Design Analysis**\n\n${aiResponse}\n\n---\n*Analyzed by Buddy AI*`);

    res.status(200).json({ 
      message: 'Analysis completed and replied to comment',
      node_name: nodeInfo.name,
      node_type: nodeInfo.type
    });

  } catch (error) {
    console.error('[buddy] Webhook error:', error);
    
    // Try to reply with error message
    try {
      if (req.body.comment?.id && req.body.file_key) {
        await replyToComment(req.body.file_key, req.body.comment.id, 
          `❌ **Analysis Failed**\n\n${error.message}\n\nPlease make sure the API is deployed and accessible.`);
      }
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
    
    res.status(500).json({
      error: 'Webhook processing failed: ' + error.message
    });
  }
}

// Reply to a comment using Figma REST API
async function replyToComment(fileKey, commentId, message) {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments/${commentId}`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': process.env.FIGMA_PAT,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Reply posted to comment:', commentId);
    return result;
  } catch (error) {
    console.error('Failed to reply to comment:', error);
    throw error;
  }
}

// Get file information
async function getFileInfo(fileKey) {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': process.env.FIGMA_PAT
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get file info:', error);
    return null;
  }
}

// Get node information
async function getNodeInfo(fileKey, nodeId) {
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`, {
      headers: {
        'X-Figma-Token': process.env.FIGMA_PAT
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }

    const data = await response.json();
    return data.nodes[nodeId]?.document || null;
  } catch (error) {
    console.error('Failed to get node info:', error);
    return null;
  }
}

// Get visual data (export node as image)
async function getVisualData(fileKey, nodeId) {
  try {
    const response = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=2`, {
      headers: {
        'X-Figma-Token': process.env.FIGMA_PAT
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.images[nodeId];
    
    if (!imageUrl) {
      throw new Error('No image URL returned');
    }

    // Download the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    
    return [{
      id: nodeId,
      name: 'Commented Node',
      type: 'FRAME',
      image: `data:image/png;base64,${base64}`,
      bounds: { x: 0, y: 0, width: 0, height: 0 }
    }];
  } catch (error) {
    console.error('Failed to get visual data:', error);
    return null;
  }
}

// Get user context from database
async function getUserContext(figmaUserId) {
  try {
    if (!figmaUserId) return null;
    
    const { createClient } = await import('../lib/db.js');
    const supabase = createClient();
    
    // Get user ID from figma_user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single();

    if (userError || !user) {
      console.log('User not found for figma_user_id:', figmaUserId);
      return null;
    }

    // Get user context using the database function
    const { data: context, error: contextError } = await supabase
      .rpc('get_user_context', { user_uuid: user.id });

    if (contextError) {
      console.error('Failed to get user context:', contextError);
      return null;
    }

    // Return context or default if none exists
    if (context && context.length > 0) {
      return {
        product_context: context[0].product_context || '',
        analysis_settings: context[0].analysis_settings || {
          length: 'detailed',
          tone: 'professional',
          focus_areas: ['ux', 'visual'],
          include_visual: true
        }
      };
    }

    return {
      product_context: '',
      analysis_settings: {
        length: 'detailed',
        tone: 'professional',
        focus_areas: ['ux', 'visual'],
        include_visual: true
      }
    };
  } catch (error) {
    console.error('Failed to get user context:', error);
    return null;
  }
}

// Get AI analysis with user context
async function getAIAnalysis(prompt, visualData, nodeInfo, userContext) {
  try {
    // Build system prompt with user context
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

    // Add user context if available
    if (userContext && userContext.product_context) {
      systemPrompt += `\n\nIMPORTANT CONTEXT: The user has provided the following product/domain context that you should consider in your analysis:\n"${userContext.product_context}"\n\nUse this context to provide more relevant and specific feedback. Reference the user's product, target audience, design system, or brand guidelines when applicable.`;
    }

    // Add analysis settings
    if (userContext && userContext.analysis_settings) {
      const settings = userContext.analysis_settings;
      
      // Add tone instructions
      const toneInstructions = {
        'casual': 'Use a friendly, conversational tone. Be encouraging.',
        'professional': 'Maintain a formal, objective, and constructive tone.',
        'encouraging': 'Be highly supportive and positive, focusing on growth.',
        'critical': 'Be direct and highlight potential flaws clearly, but always offer solutions.'
      };
      
      if (settings.tone && toneInstructions[settings.tone]) {
        systemPrompt += `\n\n${toneInstructions[settings.tone]}`;
      }

      // Add focus areas
      if (settings.focus_areas && settings.focus_areas.length > 0) {
        const focusAreas = {
          'ux': 'user experience, task completion, cognitive load, information architecture',
          'visual': 'visual hierarchy, typography, color theory, spacing, branding consistency',
          'accessibility': 'accessibility compliance (WCAG 2.1 AA), screen readers, keyboard navigation, color contrast',
          'performance': 'loading times, rendering performance, user perception of speed'
        };
        
        const focusText = settings.focus_areas.map(f => focusAreas[f] || f).join(', ');
        systemPrompt += `\n\nFocus areas: ${focusText}.`;
      }
    }

    // Add visual analysis instructions
    if (visualData) {
      systemPrompt += `\n\nYou will receive visual data of the selected Figma element. Analyze the actual visual design, layout, colors, typography, spacing, and overall composition. Be specific about what you see in the images.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: visualData ? [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: visualData[0].image,
                  detail: 'high'
                }
              }
            ] : prompt
          }
        ],
        max_tokens: userContext?.analysis_settings?.length === 'brief' ? 500 : 
                    userContext?.analysis_settings?.length === 'comprehensive' ? 2000 : 1000,
        temperature: userContext?.analysis_settings?.tone === 'critical' ? 0.8 : 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) 
      ? data.choices[0].message.content.trim() 
      : 'No response generated.';
  } catch (error) {
    console.error('AI analysis failed:', error);
    throw error;
  }
}
