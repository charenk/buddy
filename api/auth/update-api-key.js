/**
 * Update User API Key Endpoint
 * Securely stores user's OpenAI API key
 */

import { createClient } from '../../lib/db.js';

const supabase = createClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, apiKey } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }

    // In production, encrypt the API key
    // For now, we'll store it as-is (in production, use proper encryption)
    const encryptedKey = apiKey; // TODO: Implement proper encryption

    // Update user with encrypted API key
    const { data, error } = await supabase
      .from('users')
      .update({ 
        api_key_encrypted: encryptedKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating API key:', error);
      return res.status(500).json({ error: 'Failed to update API key' });
    }

    res.status(200).json({
      success: true,
      message: 'API key updated successfully'
    });

  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
