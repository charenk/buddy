#!/usr/bin/env node
/**
 * Setup Figma Comment Webhook
 * This script helps you set up the webhook for comment-based AI responses
 */

import fetch from 'node-fetch';

const FIGMA_PAT = process.env.FIGMA_PAT;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-app.vercel.app/api/figma-comment-webhook';

console.log('🔗 Setting up Figma Comment Webhook...\n');

if (!FIGMA_PAT) {
  console.log('❌ Error: FIGMA_PAT environment variable is required');
  console.log('   Please set your Figma Personal Access Token:');
  console.log('   export FIGMA_PAT=your_figma_token_here');
  process.exit(1);
}

if (WEBHOOK_URL.includes('your-app.vercel.app')) {
  console.log('⚠️  Warning: Please update WEBHOOK_URL to your actual deployed URL');
  console.log('   export WEBHOOK_URL=https://your-actual-app.vercel.app/api/figma-comment-webhook');
  console.log('');
}

async function setupWebhook() {
  try {
    console.log('📋 Webhook Configuration:');
    console.log(`   URL: ${WEBHOOK_URL}`);
    console.log(`   Event: FILE_COMMENT`);
    console.log('');

    // Get team information
    console.log('🔍 Getting team information...');
    const teamResponse = await fetch('https://api.figma.com/v1/teams/me', {
      headers: {
        'X-Figma-Token': FIGMA_PAT
      }
    });

    if (!teamResponse.ok) {
      throw new Error(`Failed to get team info: ${teamResponse.status}`);
    }

    const teamData = await teamResponse.json();
    console.log(`   Team: ${teamData.name} (${teamData.id})`);
    console.log('');

    // Create webhook
    console.log('🔗 Creating webhook...');
    const webhookResponse = await fetch('https://api.figma.com/v1/webhooks', {
      method: 'POST',
      headers: {
        'X-Figma-Token': FIGMA_PAT,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'FILE_COMMENT',
        team_id: teamData.id,
        endpoint: WEBHOOK_URL,
        passcode: 'buddy-ai-webhook',
        description: 'Figma AI Buddy - Comment Response Webhook'
      })
    });

    if (!webhookResponse.ok) {
      const errorData = await webhookResponse.json();
      throw new Error(`Failed to create webhook: ${webhookResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const webhookData = await webhookResponse.json();
    console.log('✅ Webhook created successfully!');
    console.log(`   Webhook ID: ${webhookData.id}`);
    console.log('');

    console.log('🎯 How to Test:');
    console.log('   1. Open any Figma file');
    console.log('   2. Comment on a frame with "@buddy analyze this design"');
    console.log('   3. Buddy will reply with AI analysis!');
    console.log('');

    console.log('📝 Environment Variables Needed:');
    console.log('   FIGMA_PAT=your_figma_token_here');
    console.log('   OPENAI_API_KEY=your_openai_key_here');
    console.log('   WEBHOOK_URL=https://your-app.vercel.app/api/figma-comment-webhook');
    console.log('');

    console.log('🚀 Comment-based AI is now ready!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure your Figma PAT has webhook permissions');
    console.log('   2. Ensure your webhook URL is publicly accessible');
    console.log('   3. Check that your API is deployed and running');
  }
}

// Manual setup instructions (since Figma doesn't have webhook UI)
function showManualSetup() {
  console.log('📋 Manual Webhook Setup (API Only):');
  console.log('');
  console.log('Since Figma doesn\'t provide webhook UI, you need to create it via API:');
  console.log('');
  console.log('1. Get your team ID:');
  console.log('   curl -H "X-Figma-Token: YOUR_PAT" https://api.figma.com/v1/teams/me');
  console.log('');
  console.log('2. Create webhook:');
  console.log('   curl -X POST https://api.figma.com/v2/webhooks \\');
  console.log('     -H "X-Figma-Token: YOUR_PAT" \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{');
  console.log('       "event_type": "FILE_COMMENT",');
  console.log('       "team_id": "YOUR_TEAM_ID",');
  console.log('       "endpoint": "' + WEBHOOK_URL + '",');
  console.log('       "passcode": "buddy-ai-webhook",');
  console.log('       "description": "Figma AI Buddy Comment Response"');
  console.log('     }\'');
  console.log('');
  console.log('3. Test by commenting "@buddy analyze this design" on any frame');
  console.log('');
}

// Run setup
if (process.argv.includes('--manual')) {
  showManualSetup();
} else {
  setupWebhook();
}
