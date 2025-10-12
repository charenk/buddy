const BASE = 'https://api.figma.com/v1';
const FIGMA_PAT = process.env.FIGMA_PAT!;

const authHeaders = () => ({
  'X-Figma-Token': FIGMA_PAT,
});

export async function exportNodePng(fileKey: string, nodeId: string, scale = 2) {
  const url = `${BASE}/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&format=png&scale=${scale}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Figma export failed: ${res.status}`);
  const data = await res.json() as { images?: Record<string, string> };
  const imageUrl = data.images?.[nodeId];
  if (!imageUrl) throw new Error('No image URL returned');
  return imageUrl; // ephemeral CDN URL
}

export async function replyToComment(fileKey: string, commentId: string, message: string) {
  const url = `${BASE}/files/${fileKey}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ comment_id: commentId, message }),
  });
  if (!res.ok) throw new Error(`Reply failed: ${res.status}`);
  return res.json();
}

// Heuristic: try to extract a node id from message links like figma.com/file/…?node-id=XXX
export function maybeExtractNodeIdFromMessage(message: string): string | null {
  const m = message.match(/node-id=([^\s&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}
