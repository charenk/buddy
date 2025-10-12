import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server only
export const sb = createClient(url, key, { auth: { persistSession: false } });

export async function logEvent(evt: {
  file_key: string;
  comment_id: string;
  node_id?: string;
  scope?: string;
  image_included?: boolean;
  model?: string;
  tokens_prompt?: number;
  tokens_completion?: number;
  latency_ms?: number;
  ok?: boolean;
  error?: string;
}) {
  const { error } = await sb.from('events').insert(evt as any);
  if (error) console.error('[buddy] supabase insert error', error.message);
}
