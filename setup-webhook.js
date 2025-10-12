// Script to create Figma webhook via API
const FIGMA_PAT = process.env.FIGMA_PAT;
const WEBHOOK_URL = 'https://buddy-lac-five.vercel.app/api/figma-webhook';
const WEBHOOK_SECRET = 'buddy-webhook-secret-2024';

async function createWebhook() {
  try {
    console.log('Creating Figma webhook...');
    console.log('Webhook URL:', WEBHOOK_URL);
    console.log('Webhook Secret:', WEBHOOK_SECRET);
    
    // For now, let's create a file-level webhook
    const fileKey = 'YmHonaIwpHSzvUvVvjxUPA'; // Your actual file key
    
    const response = await fetch('https://api.figma.com/v2/webhooks', {
      method: 'POST',
      headers: {
        'X-Figma-Token': FIGMA_PAT,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'FILE_COMMENT',
        url: WEBHOOK_URL,
        passcode: WEBHOOK_SECRET,
        context: 'file',
        context_id: fileKey
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Webhook created successfully!');
      console.log('Webhook ID:', data.id);
      console.log('Status:', data.status);
    } else {
      const error = await response.text();
      console.error('❌ Failed to create webhook:', response.status, error);
    }
  } catch (error) {
    console.error('❌ Error creating webhook:', error.message);
  }
}

// Instructions for manual setup
console.log('=== FIGMA WEBHOOK SETUP INSTRUCTIONS ===');
console.log('');
console.log('Since Figma has no webhook UI, you need to:');
console.log('');
console.log('1. Get a Figma file key:');
console.log('   - Open any Figma file');
console.log('   - Copy the file key from the URL (the long string after /file/)');
console.log('   - Example: https://www.figma.com/file/ABC123DEF456/My-File');
console.log('   - File key would be: ABC123DEF456');
console.log('');
console.log('2. Update this script with your file key');
console.log('3. Run: node setup-webhook.js');
console.log('');
console.log('OR manually create webhook via API:');
console.log('');
console.log('POST https://api.figma.com/v2/webhooks');
console.log('Headers:');
console.log('  X-Figma-Token: YOUR_PAT');
console.log('  Content-Type: application/json');
console.log('Body:');
console.log(JSON.stringify({
  event_type: 'FILE_COMMENT',
  url: WEBHOOK_URL,
  passcode: WEBHOOK_SECRET,
  context: 'file',
  context_id: 'YOUR_FILE_KEY'
}, null, 2));

if (process.argv.includes('--create')) {
  createWebhook();
}
