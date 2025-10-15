/**
 * Account-Level Figma Webhook Handler
 * Processes @buddy comments from ANY file in user's account
 * Uses user context for personalized responses
 */

import { createClient } from '../../lib/db.js';
import { exportNodePng, replyToComment, maybeExtractNodeIdFromMessage } from '../../lib/figma.js';
import { critiqueWithVision } from '../../lib/openai.js';
import { buildAIPrompt, applyContextToResponse } from '../../lib/context.js';

const supabase = createClient();

// In-memory activity log for monitoring
global.activityLog = global.activityLog || [];

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
  let userId = null;
  let userContext = null;

  try {
    const data = req.body;
    console.log('[buddy] Account webhook received:', JSON.stringify(data, null, 2));

    // Extract comment data (handle both array and object formats)
    const commentData = Array.isArray(data.comment) ? data.comment[0] : data.comment;
    if (!commentData) {
      console.log('[buddy] No comment data found');
      return res.status(400).json({ error: 'No comment data' });
    }

    const message = commentData.message || commentData.text || '';
    const commentId = data.comment_id || commentData.comment_id || commentData.id;
    const fileKey = data.file_key;
    const triggeredBy = data.triggered_by?.handle || commentData?.triggered_by?.handle || commentData?.user?.name || 'Unknown';

    console.log('[buddy] Processing comment:', { message, commentId, fileKey, triggeredBy });

    // Check if @buddy is mentioned
    if (!message.toLowerCase().includes('@buddy')) {
      console.log('[buddy] No @buddy mention, ignoring');
      return res.status(200).json({ ok: true, message: 'No @buddy mention' });
    }

    // Try to get user context based on Figma handle
    try {
      // For now, use a default context since we don't have user lookup working yet
      userContext = {
        response_style: {
          length: 'detailed',
          tone: 'professional',
          focus: ['ux', 'visual'],
          domain: 'general',
          language: 'en'
        },
        custom_prompts: {}
      };
      console.log('[buddy] Using default context');
    } catch (error) {
      console.log('[buddy] Could not load user context, using defaults:', error.message);
      userContext = {
        response_style: {
          length: 'detailed',
          tone: 'professional',
          focus: ['ux', 'visual'],
          domain: 'general',
          language: 'en'
        },
        custom_prompts: {}
      };
    }

    // Extract node ID if present
    const nodeId = maybeExtractNodeIdFromMessage(message);
    console.log('[buddy] Extracted node ID:', nodeId);

    // Check for image attachments
    const imageUrl = commentData.attachments?.[0]?.url;
    console.log('[buddy] Image attachment:', imageUrl);

    // Determine if we need visual analysis
    const needsVisualAnalysis = imageUrl || 
      message.toLowerCase().includes('visual') || 
      message.toLowerCase().includes('image') ||
      message.toLowerCase().includes('design') ||
      message.toLowerCase().includes('ui') ||
      message.toLowerCase().includes('layout');

    let finalImageUrl = null;
    if (needsVisualAnalysis) {
      if (imageUrl) {
        // Use attached image
        finalImageUrl = imageUrl;
        console.log('[buddy] Using attached image');
      } else if (nodeId) {
        // Export node as image
        try {
          finalImageUrl = await exportNodePng(fileKey, nodeId);
          console.log('[buddy] Exported node image');
        } catch (error) {
          console.log('[buddy] Could not export node image:', error.message);
        }
      }
    }

    // Build AI prompt with user context
    const aiPrompt = buildAIPrompt(message, userContext.response_style, userContext.custom_prompts);
    
    // Get AI critique
    const critique = await critiqueWithVision({
      ask: aiPrompt.userPrompt,
      imageUrl: finalImageUrl
    });

    // Apply context to response
    const contextualResponse = applyContextToResponse(critique, userContext.response_style, userContext.custom_prompts);

    // Reply to comment
    await replyToComment(fileKey, parseInt(commentId), contextualResponse);
    console.log('[buddy] Replied to comment successfully');

    // Log activity
    const latency = Date.now() - startTime;
    const activity = {
      timestamp: new Date().toISOString(),
      user: triggeredBy,
      file_key: fileKey,
      comment_id: commentId,
      message: message,
      response: contextualResponse.substring(0, 100) + '...',
      status: 'success',
      latency: latency,
      has_image: !!finalImageUrl,
      has_context: !!userContext
    };
    
    global.activityLog.push(activity);
    if (global.activityLog.length > 100) {
      global.activityLog = global.activityLog.slice(-100); // Keep last 100 activities
    }

    console.log('[buddy] Account webhook completed successfully');

    res.status(200).json({
      ok: true,
      message: 'Processed @buddy comment successfully',
      critique: contextualResponse,
      latency_ms: latency,
      has_context: !!userContext,
      user_id: userId,
      file_key: fileKey
    });

  } catch (error) {
    console.error('[buddy] Account webhook error:', error);
    
    // Log failed activity
    const latency = Date.now() - startTime;
    const activity = {
      timestamp: new Date().toISOString(),
      user: 'Unknown',
      file_key: req.body.file_key || 'unknown',
      comment_id: 'unknown',
      message: 'Error occurred',
      response: error.message,
      status: 'failed',
      latency: latency,
      has_image: false,
      has_context: false
    };
    
    global.activityLog.push(activity);

    res.status(500).json({
      ok: false,
      error: 'Failed to process @buddy comment: ' + error.message
    });
  }
}
