import { CommentEvent as CommentEventSchema } from '../lib/schema';
import { replyToComment, exportNodePng, maybeExtractNodeIdFromMessage } from '../lib/figma';
import { critiqueWithVision } from '../lib/openai';
import { log, error } from '../lib/logger';
import { logEvent } from '../lib/db';
import crypto from 'node:crypto';

// Vercel API Route (Node runtime)
export const config = { runtime: 'nodejs' } as const;

function verifySignature(body: string, signature?: string) {
  const secret = process.env.FIGMA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  // Many webhook providers use sha256 HMAC. Adjust header name if Figma changes.
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  // Signature header may be like: sha256=abcdef...
  const clean = signature.replace(/^sha256=/, '').toLowerCase();
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(clean));
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const sig = req.headers['x-hub-signature-256'] || req.headers['x-figma-signature'];
    if (!verifySignature(raw, Array.isArray(sig) ? sig[0] : sig)) {
      return res.status(401).send('Invalid signature');
    }

    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = CommentEventSchema.safeParse(data);
    if (!parsed.success) {
      log('Ignoring non-comment payload');
      return res.status(200).json({ ok: true });
    }

    const evt = parsed.data;
    const fileKey = evt.file_key;
    const comment = evt.comment;
    const msg = (comment.message || '').trim();

    // Only react to @buddy
    if (!/@buddy\b/i.test(msg)) return res.status(200).json({ ok: true, ignored: true });

    // Extract the user ask after @buddy
    const ask = msg.replace(/.*@buddy\s*/i, '').trim() || 'General critique this frame';

    // Node targeting: prefer pinned node id in message URL, else skip image
    let nodeId = maybeExtractNodeIdFromMessage(msg);
    let imageUrl: string | undefined;
    if (nodeId) {
      try { imageUrl = await exportNodePng(fileKey, nodeId, 2); } catch (e) { log('Export failed, continuing without image'); }
    }

    // Logging and AI processing
    const t0 = Date.now();
    let reply = '';
    let ok = true; let err: any;
    try {
      reply = await critiqueWithVision({ ask, imageUrl });
    } catch (e: any) {
      ok = false; err = e;
    }
    const latency = Date.now() - t0;

    // Log to Supabase
    await logEvent({
      file_key: fileKey,
      comment_id: comment.id,
      node_id: nodeId || undefined,
      scope: ask.startsWith('/') ? ask.split(' ')[0] : 'full',
      image_included: Boolean(imageUrl),
      model: 'gpt-4o-mini',
      latency_ms: latency,
      ok,
      error: ok ? null as any : (err?.message || String(err)),
    });

    if (!ok) return res.status(500).json({ ok: false, error: err?.message || 'LLM failed' });

    await replyToComment(fileKey, comment.id, reply);

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    error('webhook error', e?.message || e);
    return res.status(500).json({ ok: false });
  }
}
