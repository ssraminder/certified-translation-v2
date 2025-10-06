import { useEffect, useState, useRef } from 'react';

function EmailGreeting({ email, onKnown }){
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) { setInfo(null); return; }
      try {
        const resp = await fetch('/api/check-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const data = await resp.json();
        if (!active) return;
        setInfo(data);
        if (data?.exists) onKnown?.(data);
      } catch {}
    };
    run();
    return () => { active = false; };
  }, [email, onKnown]);
  if (!info?.exists) return null;
  return (
    <div className="text-sm text-gray-700">Welcome back{info.first_name ? `, ${info.first_name}` : ''}!</div>
  );
}

export default function Login(){
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('magic'); // 'magic' | 'otp'
  const [status, setStatus] = useState('idle'); // idle | sending | code-sent
  const [error, setError] = useState('');
  const [otp, setOtp] = useState(['','','','','','']);
  const [userType, setUserType] = useState(null); // 'admin' | 'customer' | null
  const inputsRef = useRef([]);

  const onKnown = (data) => { setUserType(data?.user_type || null); };

  const handleContinue = async () => {
    setError('');
    if (!email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) { setError('Enter a valid email'); return; }
    try {
      setStatus('sending');
      if (method === 'magic') {
        const resp = await fetch('/api/auth/magic-link/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, user_type: userType }) });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed');
        setStatus('code-sent');
      } else {
        const resp = await fetch('/api/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, user_type: userType }) });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Failed');
        setStatus('code-sent');
        inputsRef.current[0]?.focus();
      }
    } catch (e) { setError(e.message); setStatus('idle'); }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputsRef.current[idx+1]?.focus();
    if (next.join('').length === 6) verifyCode(next.join(''));
  };

  const verifyCode = async (code) => {
    try {
      setError('');
      const resp = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, user_type: userType }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Invalid or expired code');
      window.location.href = data.redirect || '/dashboard';
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Login</h1>
        <p className="text-sm text-gray-600 mt-1">Access your quotes and orders.</p>

        <div className="mt-6 space-y-2">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} onBlur={()=>{}}
            className="w-full border rounded-lg px-3 py-2" placeholder="you@example.com" />
          <EmailGreeting email={email} onKnown={onKnown} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={()=>setMethod('magic')} className={(method==='magic'?'ring-2 ring-cyan-500 ':'')+"border rounded-lg p-3 text-left"}>
            <div className="font-semibold">Magic Link</div>
            <div className="text-xs text-gray-600">Click link in email</div>
          </button>
          <button onClick={()=>setMethod('otp')} className={(method==='otp'?'ring-2 ring-cyan-500 ':'')+"border rounded-lg p-3 text-left"}>
            <div className="font-semibold">Email Code</div>
            <div className="text-xs text-gray-600">Enter 6-digit code</div>
          </button>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        {status !== 'code-sent' || method==='magic' ? (
          <div className="mt-6">
            <button onClick={handleContinue} disabled={status==='sending'} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg py-2 disabled:opacity-60">
              {status==='sending' ? 'Sending...' : 'Continue'}
            </button>
            {method==='magic' && status==='code-sent' && (
              <div className="text-sm text-gray-700 mt-3">Check your email for a login link.</div>
            )}
            <div className="text-sm text-gray-600 mt-4">New here? <a href="/order/step-1" className="text-cyan-600 font-medium">Start a quote</a></div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex gap-2 justify-between">
              {otp.map((v,i)=> (
                <input key={i} ref={el => inputsRef.current[i]=el} value={v} onChange={e=>handleOtpChange(i, e.target.value)} inputMode="numeric" maxLength={1}
                  className="w-12 h-12 text-center border rounded-lg text-lg" />
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <button onClick={handleContinue} className="text-cyan-600">Resend code</button>
              <div>Expires in 10 minutes</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
