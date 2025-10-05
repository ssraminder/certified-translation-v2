import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function DashboardLayout({ children, user }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Quotes', href: '/dashboard/quotes', icon: '📋' },
    { name: 'Orders', href: '/dashboard/orders', icon: '📦' },
    { name: 'Profile', href: '/dashboard/profile', icon: '👤' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">◆</span>
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Cethos</span>
              </Link>
            </div>

            <div className="hidden md:flex md:items-center md:space-x-1">
              {navigation.map((item) => {
                const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      isActive ? 'bg-cyan-50 text-cyan-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center">
              <div className="hidden md:block mr-4">
                <span className="text-sm text-gray-600">
                  {user?.first_name} {user?.last_name}
                </span>
              </div>
              <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                Logout
              </button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 py-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
