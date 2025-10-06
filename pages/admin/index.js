import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminIndex(){
  const router = useRouter();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resp = await fetch('/api/admin/me');
        if (!active) return;
        if (resp.ok) {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/login');
        }
      } catch {
        if (active) router.replace('/login');
      }
    })();
    return () => { active = false; };
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>
  );
}
