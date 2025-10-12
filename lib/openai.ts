const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const SYSTEM_PROMPT = `You are "Buddy," a staff/principal product designer with systems thinking.
Be direct, specific, and practical. Always:
1) Call out usability risks,
2) Edge cases and failure states,
3) Accessibility (contrast, focus, keyboard, SR),
4) Responsive behavior,
5) IA clarity,
6) Interaction flows (loading/empty/error/success),
7) Metrics to validate.
Structure with short headers and bullets. No fluff. Offer alternatives tied to the problem.`;

export async function critiqueWithVision(opts: { ask: string; imageUrl?: string }) {
  const { ask, imageUrl } = opts;
  const payload: any = {
    model: 'gpt-4o-mini', // vision-capable, fast; change if needed
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Ask: ${ask}\nDeliver a compact critique with: What works, Top risks, Edge cases, Accessibility, Responsive, Alternatives, Next moves, Metrics.` },
        ],
      },
    ],
  };
  if (imageUrl) {
    (payload.messages[1].content as any[]).push({ type: 'input_image', image_url: imageUrl });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || 'No response.';
}
