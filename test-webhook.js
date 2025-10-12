// Simple test script to verify webhook logic
const testData = {
  file_key: "test123",
  comment: {
    id: "comment123",
    message: "@buddy test this design for accessibility issues"
  }
};

console.log('Testing webhook with data:', JSON.stringify(testData, null, 2));

// Test @buddy detection
const msg = testData.comment.message;
const hasBuddy = /@buddy\b/i.test(msg);
console.log('Contains @buddy:', hasBuddy);

if (hasBuddy) {
  const ask = msg.replace(/.*@buddy\s*/i, '').trim() || 'General critique this frame';
  console.log('Extracted ask:', ask);
  console.log('✅ Webhook logic would work correctly!');
} else {
  console.log('❌ No @buddy mention found');
}
