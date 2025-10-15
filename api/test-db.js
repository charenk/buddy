/**
 * Test Database Connection API
 * Simple endpoint to verify Supabase connection
 */

import { createClient } from '../../lib/db.js';

const supabase = createClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database test error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }

    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
