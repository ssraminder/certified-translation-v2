import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

function makeClient() {
  try {
    // Only create in the browser and when env vars exist
    if (typeof window === 'undefined') return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  } catch {
    return null;
  }
}

export function getSupabase() {
  if (cachedClient) return cachedClient;
  cachedClient = makeClient();
  return cachedClient;
}

// For convenience in components that import a value
export const supabase = makeClient();
