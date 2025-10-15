/**
 * Simplified Account-Level Figma Webhook Handler
 * Processes @buddy comments from ANY file in user's account
 */

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

    // Simple AI response using OpenAI directly
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are "Buddy," a staff/principal product designer with systems thinking. Be direct, specific, and practical. Always call out usability risks, edge cases, accessibility, responsive behavior, IA clarity, interaction flows, and metrics to validate. Structure with short headers and bullets. No fluff. Offer alternatives tied to the problem.'
          },
          {
            role: 'user',
            content: `Design critique request: ${message}\n\nProvide a detailed analysis focusing on UX, visual design, accessibility, and usability.`
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI error: ${openaiResponse.status}`);
    }

    const aiData = await openaiResponse.json();
    const critique = aiData.choices?.[0]?.message?.content?.trim() || 'No response generated.';

    // Reply to Figma comment
    const figmaResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': process.env.FIGMA_PAT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment_id: parseInt(commentId),
        message: critique
      })
    });

    if (!figmaResponse.ok) {
      const errorText = await figmaResponse.text();
      throw new Error(`Figma reply failed: ${figmaResponse.status} - ${errorText}`);
    }

    // Log activity
    const latency = Date.now() - startTime;
    console.log('[buddy] Account webhook completed successfully');

    res.status(200).json({
      ok: true,
      message: 'Processed @buddy comment successfully',
      critique: critique,
      latency_ms: latency,
      has_context: false,
      user_id: null,
      file_key: fileKey
    });

  } catch (error) {
    console.error('[buddy] Account webhook error:', error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to process @buddy comment: ' + error.message
    });
  }
}
