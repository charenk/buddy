/**
 * Context Update API Endpoint
 * High-performance context management with caching
 */

import { updateUserContext, getUserContext } from '../../lib/auth.js';
import { validateContext, buildAIPrompt } from '../../lib/context.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, context } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!context) {
      return res.status(400).json({ error: 'Context is required' });
    }

    // Validate context
    const validatedContext = validateContext(context);

    // Update user context
    const updatedContext = await updateUserContext(userId, {
      response_style: validatedContext,
      custom_prompts: context.custom_prompts || {},
      is_active: true
    });

    if (!updatedContext) {
      return res.status(500).json({ error: 'Failed to update context' });
    }

    // Test the context by building a sample prompt
    const samplePrompt = buildAIPrompt(
      "Test design comment",
      validatedContext,
      context.custom_prompts
    );

    res.status(200).json({
      success: true,
      context: updatedContext,
      samplePrompt: {
        systemPrompt: samplePrompt.systemPrompt,
        maxTokens: samplePrompt.maxTokens,
        temperature: samplePrompt.temperature
      }
    });

  } catch (error) {
    console.error('Context update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
