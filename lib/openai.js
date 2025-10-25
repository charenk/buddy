/**
 * Optimized OpenAI Integration - World-class performance
 * Minimal latency AI analysis for @buddy comments
 */

export async function generateAIAnalysis(systemPrompt, userPrompt, settings = {}) {
  try {
    // Use the fastest, most cost-effective model for real-time responses
    const model = 'gpt-4o-mini'; // Fastest and most cost-effective
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 300, // Limit for quick responses
        temperature: 0.7, // Balanced creativity
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false // Disable streaming for faster response
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback to rule-based analysis for reliability
    return generateFallbackAnalysis(userPrompt, settings);
  }
}

// Fallback analysis when OpenAI is unavailable
function generateFallbackAnalysis(userPrompt, settings) {
  const prompt = userPrompt.toLowerCase();
  
  let analysis = '**Design Analysis:**\n\n';
  
  if (prompt.includes('kids') || prompt.includes('children')) {
    analysis += '👶 **Kids-Friendly Design:**\n';
    analysis += '• Use bright, cheerful colors\n';
    analysis += '• Large, clear text and buttons\n';
    analysis += '• Rounded corners for safety\n';
    analysis += '• Playful, engaging elements\n\n';
  }
  
  if (prompt.includes('uae') || prompt.includes('market')) {
    analysis += '🌍 **UAE Market:**\n';
    analysis += '• Consider Arabic text support (RTL)\n';
    analysis += '• Cultural colors and imagery\n';
    analysis += '• Mobile-first approach\n';
    analysis += '• Local payment preferences\n\n';
  }
  
  if (prompt.includes('mobile') || prompt.includes('responsive')) {
    analysis += '📱 **Mobile Considerations:**\n';
    analysis += '• Ensure touch targets are 44px+\n';
    analysis += '• Test on various screen sizes\n';
    analysis += '• Consider thumb-friendly navigation\n\n';
  }
  
  if (prompt.includes('color') || prompt.includes('contrast')) {
    analysis += '🎨 **Color & Contrast:**\n';
    analysis += '• Ensure sufficient contrast ratios\n';
    analysis += '• Consider colorblind accessibility\n';
    analysis += '• Use consistent color palette\n\n';
  }
  
  if (prompt.includes('layout') || prompt.includes('spacing')) {
    analysis += '📐 **Layout & Spacing:**\n';
    analysis += '• Use 8px grid system\n';
    analysis += '• Consistent spacing between elements\n';
    analysis += '• Clear visual hierarchy\n\n';
  }
  
  analysis += '💡 **General Tips:**\n';
  analysis += '• Keep it simple and intuitive\n';
  analysis += '• Test with real users\n';
  analysis += '• Consider accessibility guidelines\n';
  analysis += '• Maintain design consistency';
  
  return analysis;
}

// Optimized context-aware analysis
export async function generateContextAwareAnalysis(frameInfo, question, userContext) {
  const systemPrompt = buildSystemPrompt(userContext);
  return await generateAIAnalysis(systemPrompt, question, userContext?.settings);
}

// Build context-aware system prompt
function buildSystemPrompt(userContext) {
  let prompt = `You are a world-class design expert providing real-time feedback on Figma designs.
  
  Provide concise, actionable feedback focusing on:
  - Visual design principles
  - User experience optimization
  - Accessibility considerations
  - Mobile responsiveness
  - Cultural design elements
  - Kids-friendly design (when applicable)
  
  Keep responses under 200 words for quick reading.`;
  
  if (userContext?.context) {
    prompt += `\n\nUser's Product Context: ${userContext.context}`;
  }
  
  if (userContext?.settings?.tone) {
    prompt += `\n\nResponse Tone: ${userContext.settings.tone}`;
  }
  
  if (userContext?.settings?.focus_areas) {
    prompt += `\n\nFocus Areas: ${userContext.settings.focus_areas.join(', ')}`;
  }
  
  return prompt;
}