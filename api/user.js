/**
 * Consolidated User Management API
 * Handles user context and webhook management
 */

import { createClient } from '../lib/db.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'context':
        return await handleUserContext(req, res);
      case 'webhooks':
        return await handleWebhooks(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('User API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle user context management
async function handleUserContext(req, res) {
  try {
    // Get user session from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionToken = authHeader.substring(7);
    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    // Check if session is expired
    if (Date.now() > sessionData.expires_at) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const { figma_user_id } = sessionData;

    switch (req.method) {
      case 'GET':
        return await getContext(figma_user_id, res);
      case 'POST':
      case 'PUT':
        return await saveContext(figma_user_id, req.body, res);
      case 'DELETE':
        return await deleteContext(figma_user_id, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Context management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle webhook management
async function handleWebhooks(req, res) {
  try {
    // Get user session from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionToken = authHeader.substring(7);
    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    // Check if session is expired
    if (Date.now() > sessionData.expires_at) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const { access_token, figma_user_id } = sessionData;

    switch (req.method) {
      case 'GET':
        return await getWebhooks(figma_user_id, res);
      case 'POST':
        return await createWebhook(access_token, figma_user_id, req.body, res);
      case 'DELETE':
        return await deleteWebhook(access_token, req.query.webhook_id, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Webhook management error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get user context from database
async function getContext(figmaUserId, res) {
  try {
    const supabase = createClient();
    
    // Get user ID from figma_user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
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
      return res.status(200).json({
        success: true,
        context: {
          product_context: context[0].product_context || '',
          analysis_settings: context[0].analysis_settings || {
            length: 'detailed',
            tone: 'professional',
            focus_areas: ['ux', 'visual'],
            include_visual: true
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }

    res.status(200).json({
      success: true,
      context: {
        product_context: '',
        analysis_settings: {
          length: 'detailed',
          tone: 'professional',
          focus_areas: ['ux', 'visual'],
          include_visual: true
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get context:', error);
    res.status(500).json({ error: 'Failed to get context' });
  }
}

// Save user context to database
async function saveContext(figmaUserId, contextData, res) {
  try {
    const { product_context, analysis_settings } = contextData;

    // Validate context
    if (product_context && product_context.length > 1000) {
      return res.status(400).json({ 
        error: 'Product context cannot exceed 1000 words' 
      });
    }

    const supabase = createClient();
    
    // First get or create the user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          figma_user_id: figmaUserId,
          figma_handle: 'unknown',
          subscription_status: 'trial',
          trial_uses_remaining: 10
        })
        .select('id')
        .single();

      if (createError) {
        throw createError;
      }
      user = newUser;
    } else if (userError) {
      throw userError;
    }

    // Upsert user context
    const { data: savedContext, error: contextError } = await supabase
      .from('user_contexts')
      .upsert({
        user_id: user.id,
        product_context: product_context || '',
        analysis_settings: analysis_settings || {
          length: 'detailed',
          tone: 'professional',
          focus_areas: ['ux', 'visual'],
          include_visual: true
        },
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select('product_context, analysis_settings, created_at, updated_at')
      .single();

    if (contextError) {
      throw contextError;
    }

    res.status(200).json({
      success: true,
      context: savedContext,
      message: 'Context saved successfully'
    });

  } catch (error) {
    console.error('Failed to save context:', error);
    res.status(500).json({ error: 'Failed to save context' });
  }
}

// Delete user context
async function deleteContext(figmaUserId, res) {
  try {
    const supabase = createClient();
    
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user context
    const { error: deleteError } = await supabase
      .from('user_contexts')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    res.status(200).json({
      success: true,
      message: 'Context deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete context:', error);
    res.status(500).json({ error: 'Failed to delete context' });
  }
}

// Get user's webhooks
async function getWebhooks(figmaUserId, res) {
  try {
    const supabase = createClient();
    
    // Get user ID from figma_user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's webhooks from database
    const { data: webhooks, error: webhookError } = await supabase
      .from('user_webhooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (webhookError) {
      throw webhookError;
    }

    res.status(200).json({
      success: true,
      webhooks: webhooks || []
    });

  } catch (error) {
    console.error('Failed to get webhooks:', error);
    res.status(500).json({ error: 'Failed to get webhooks' });
  }
}

// Create webhook for user
async function createWebhook(accessToken, figmaUserId, body, res) {
  try {
    const { team_id, webhook_url } = body;

    if (!team_id || !webhook_url) {
      return res.status(400).json({ error: 'team_id and webhook_url are required' });
    }

    const supabase = createClient();
    
    // Get user ID from figma_user_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('figma_user_id', figmaUserId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create webhook in Figma
    const webhookData = {
      event_type: 'FILE_COMMENT',
      team_id: team_id,
      endpoint: webhook_url,
      passcode: `buddy-ai-${user.id}`,
      description: 'Figma AI Buddy Comment Response',
      status: 'ACTIVE'
    };

    const response = await fetch('https://api.figma.com/v2/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Figma API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const figmaWebhook = await response.json();

    // Store webhook in database
    const { data: dbWebhook, error: dbError } = await supabase
      .from('user_webhooks')
      .insert({
        user_id: user.id,
        figma_webhook_id: figmaWebhook.id,
        team_id: team_id,
        webhook_url: webhook_url,
        status: 'active'
      })
      .select('*')
      .single();

    if (dbError) {
      // If database insert fails, try to delete the Figma webhook
      try {
        await fetch(`https://api.figma.com/v2/webhooks/${figmaWebhook.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      } catch (cleanupError) {
        console.error('Failed to cleanup Figma webhook:', cleanupError);
      }
      throw dbError;
    }

    res.status(201).json({
      success: true,
      webhook: dbWebhook,
      message: 'Webhook created successfully'
    });

  } catch (error) {
    console.error('Failed to create webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
}

// Delete webhook
async function deleteWebhook(accessToken, webhookId, res) {
  try {
    if (!webhookId) {
      return res.status(400).json({ error: 'webhook_id is required' });
    }

    const supabase = createClient();

    // Get webhook from database to find Figma webhook ID
    const { data: webhook, error: webhookError } = await supabase
      .from('user_webhooks')
      .select('figma_webhook_id')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Delete from Figma
    const response = await fetch(`https://api.figma.com/v2/webhooks/${webhook.figma_webhook_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error(`Failed to delete Figma webhook: ${response.status}`);
      // Continue with database deletion even if Figma deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('user_webhooks')
      .delete()
      .eq('id', webhookId);

    if (dbError) {
      throw dbError;
    }

    res.status(200).json({
      success: true,
      message: 'Webhook deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
}
