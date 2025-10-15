import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // server only

// Create the main client
const supabaseClient = createSupabaseClient(url, key, { auth: { persistSession: false } });
export const sb = supabaseClient;

// Export createClient for use in other modules
export function createClient() {
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

export async function logEvent(evt) {
  const { error } = await sb.from('events').insert(evt);
  if (error) console.error('[buddy] supabase insert error', error.message);
}
