/**
 * Test Database Connection API
 * Simple endpoint to verify Supabase connection works
 */

import { createClient } from '../lib/db.js';

const supabase = createClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('Testing database connection...');
    
    // Test basic connection by trying to select from users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection failed: ' + error.message,
        details: error
      });
    }

    console.log('Database connection successful');
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      data: data
    });

  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database test failed: ' + error.message 
    });
  }
}
