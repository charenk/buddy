/**
 * Consolidated Authentication API
 * Handles all authentication-related endpoints
 */

import { createClient } from '../lib/db.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'figma-oauth':
        return await handleFigmaOAuth(req, res);
      case 'callback':
        return await handleOAuthCallback(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle Figma OAuth initiation
async function handleFigmaOAuth(req, res) {
  try {
    const authUrl = `https://www.figma.com/oauth?client_id=${process.env.FIGMA_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.FIGMA_REDIRECT_URI)}&scope=file_read+webhook+user&response_type=code&state=buddy-auth`;
    
    res.redirect(302, authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
}

// Handle OAuth callback
async function handleOAuthCallback(req, res) {
  try {
    const { code, state } = req.query;

    if (!code || state !== 'buddy-auth') {
      return res.status(400).json({ error: 'Invalid OAuth callback' });
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://www.figma.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.FIGMA_CLIENT_ID,
        client_secret: process.env.FIGMA_CLIENT_SECRET,
        redirect_uri: process.env.FIGMA_REDIRECT_URI,
        code: code,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info from Figma
    const userResponse = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userData = await userResponse.json();

    // Create or update user in database
    const supabase = createClient();

    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .upsert({
        figma_user_id: userData.id,
        figma_handle: userData.handle,
        figma_email: userData.email,
        figma_img_url: userData.img_url,
        figma_access_token: access_token,
        figma_refresh_token: refresh_token,
        token_expires_at: new Date(Date.now() + (expires_in * 1000)).toISOString(),
        subscription_status: 'trial',
        trial_uses_remaining: 10,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'figma_user_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (userError) {
      console.error('Failed to create/update user in database:', userError);
      throw new Error('Failed to create user account');
    }

    // Store user session
    const sessionData = {
      user_id: dbUser.id,
      figma_user_id: userData.id,
      handle: userData.handle,
      email: userData.email,
      img_url: userData.img_url,
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in * 1000)
    };

    const sessionId = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Store session in localStorage via postMessage
    const redirectHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Figma AI Buddy - Authentication</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f8f9fa;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .success { color: #00AA44; }
          .error { color: #ff6b6b; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="success">✅ Authentication Successful!</h2>
          <p>You can now close this window and return to Figma.</p>
          <p><small>This window will close automatically in 3 seconds...</small></p>
        </div>
        <script>
          // Store session in parent window
          if (window.opener) {
            try {
              localStorage.setItem('buddySession', '${sessionId}');
              window.opener.postMessage({ type: 'figma-auth-success' }, '*');
            } catch (error) {
              console.error('Failed to store session:', error);
            }
          }
          
          // Close window after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(redirectHtml);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
