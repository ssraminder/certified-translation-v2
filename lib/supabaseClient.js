import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Do not throw to avoid build-time failures; runtime operations will fail naturally
  // Ensuring no secrets are logged
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
