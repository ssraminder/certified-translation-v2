import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabaseServerClient } from '../lib/supabaseServer';

function parseCookies(cookieHeader) {
  const out = {}; if (!cookieHeader) return out; const parts = cookieHeader.split(';');
  for (const p of parts) { const [k, ...v] = p.trim().split('='); out[k] = decodeURIComponent(v.join('=')); }
  return out;
}

export async function requireAuth(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies['session_token'];
    if (!token) {
      res.redirect('/login?redirect=' + encodeURIComponent(req.url || '/dashboard'));
      return;
    }

    const supabase = getSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (!session || session.user_type !== 'customer') {
      res.redirect('/login?redirect=' + encodeURIComponent(req.url || '/dashboard'));
      return;
    }

    let user = null;
    {
      const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('id', session.user_id)
        .maybeSingle();
      user = data || null;
    }

    if (!user) {
      res.redirect('/login?redirect=' + encodeURIComponent(req.url || '/dashboard'));
      return;
    }

    await supabase
      .from('user_sessions')
      .update({ last_activity_at: nowIso })
      .eq('id', session.id);

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    // On any error, redirect to login
    res.redirect('/login');
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const resp = await fetch('/api/auth/session');
        const data = await resp.json();
        if (cancelled) return;
        if (data?.authenticated) {
          setUser(data.user);
        } else {
          const redirect = encodeURIComponent(window.location.pathname + (window.location.search || ''));
          router.replace('/login?redirect=' + redirect);
        }
      } catch {
        if (!cancelled) router.replace('/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [router]);

  return { user, loading };
}
