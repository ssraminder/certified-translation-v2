import { createClient } from '@supabase/supabase-js';

export function hasServiceRoleKey() {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SECRET_KEY
  );
}

function resolveKey() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SECRET_KEY;
  // No anon fallback: the server client must use the secret/service key.
  // Returning undefined here makes getSupabaseServerClient() throw loudly
  // instead of silently running with reduced (anon) privileges.
  return serviceKey;
}

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = resolveKey();
  if (!url || !key) {
    throw new Error('Missing Supabase configuration for server client');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
