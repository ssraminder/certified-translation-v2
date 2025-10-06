import React from 'react';
import crypto from 'crypto';
import { getSupabaseServerClient } from '../../lib/supabaseServer';

function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = `session_token=${token}; Max-Age=${30 * 24 * 60 * 60}; Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
}

function setAdminSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = `admin_session_token=${token}; Max-Age=${30 * 24 * 60 * 60}; Path=/admin; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
}

export default function VerifyPage({ error }) {
  if (error) {
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system', padding: 40 }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 12px', color: '#111' }}>Login Error</h1>
          <p style={{ color: '#444', margin: '0 0 18px' }}>{error}</p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              background: '#00B8D4',
              color: '#fff',
              textDecoration: 'none',
              padding: '10px 16px',
              borderRadius: 8,
              fontWeight: 700,
            }}
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  return null;
}

export async function getServerSideProps({ req, res, query }) {
  try {
    const token = String(query.token || '');
    if (!token || token.length < 10) {
      return { props: { error: 'Invalid or expired link' } };
    }

    const supabase = getSupabaseServerClient();

    const { data: link } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!link) return { props: { error: 'Invalid or expired link' } };
    if (link.used_at) return { props: { error: 'Invalid or expired link' } };
    if (new Date(link.expires_at).getTime() <= Date.now()) return { props: { error: 'Invalid or expired link' } };

    const userType = link.user_type === 'admin' ? 'admin' : 'customer';

    let user = null;
    if (userType === 'admin') {
      const { data } = await supabase
        .from('admin_users')
        .select('id, email, first_name, last_name')
        .eq('id', link.user_id)
        .maybeSingle();
      user = data;
    } else {
      const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('id', link.user_id)
        .maybeSingle();
      user = data;
    }

    if (!user) return { props: { error: 'Invalid or expired link' } };

    const nowIso = new Date().toISOString();
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
      .toString()
      .split(',')[0]
      .trim();
    const userAgent = req.headers['user-agent'] || '';

    await supabase
      .from('magic_links')
      .update({ used_at: nowIso, used_ip: ip || null, used_user_agent: userAgent || null })
      .eq('id', link.id);

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (userType === 'admin') {
      await supabase.from('admin_sessions').insert([
        {
          admin_user_id: user.id,
          session_token: sessionToken,
          expires_at: expiresAt,
          ip_address: ip || null,
          user_agent: userAgent || null,
        },
      ]);
    } else {
      await supabase.from('user_sessions').insert([
        {
          user_id: user.id,
          user_type: userType,
          session_token: sessionToken,
          expires_at: expiresAt,
          ip: ip || null,
          user_agent: userAgent || null,
        },
      ]);
    }

    if (userType === 'admin') {
      await supabase
        .from('admin_users')
        .update({ last_login_at: nowIso, email_verified: true, updated_at: nowIso })
        .eq('id', user.id);
    } else {
      await supabase
        .from('users')
        .update({ last_login_at: nowIso, email_verified: true, email_verified_at: nowIso, updated_at: nowIso })
        .eq('id', user.id);
    }

    if (userType === 'admin') {
      setAdminSessionCookie(res, sessionToken);
    } else {
      setSessionCookie(res, sessionToken);
    }

    const redirectUrl = link.metadata && link.metadata.redirect_url
      ? link.metadata.redirect_url
      : userType === 'admin'
      ? '/admin'
      : '/dashboard';

    return {
      redirect: {
        destination: redirectUrl,
        permanent: false,
      },
    };
  } catch (err) {
    return { props: { error: 'Unexpected error' } };
  }
}
