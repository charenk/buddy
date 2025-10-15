import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server only
export const sb = createClient(url, key, { auth: { persistSession: false } });

// Export createClient for use in other modules
export function createClient() {
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logEvent(evt) {
  const { error } = await sb.from('events').insert(evt);
  if (error) console.error('[buddy] supabase insert error', error.message);
}
