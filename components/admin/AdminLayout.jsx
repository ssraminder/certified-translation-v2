import { useEffect, useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children, title, initialAdmin, pendingCounts }){
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setCollapsed(w >= 768 && w < 1024);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function toggleSidebar(){ setSidebarOpen(v=>!v); }
  function closeSidebar(){ setSidebarOpen(false); }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader admin={initialAdmin} onToggleSidebar={toggleSidebar} collapsed={collapsed} />
      {/* Sidebar */}
      <div className="relative">
        {/* mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={closeSidebar} />
        )}
        <div className={`z-40 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <AdminSidebar collapsed={collapsed} pendingCounts={pendingCounts} onClose={closeSidebar} />
        </div>
      </div>

      {/* Main content */}
      <main className={`pt-6 md:pl-16 lg:pl-60`}>
        <div className="mx-auto max-w-7xl px-4">
          {title && <h1 className="mb-4 text-2xl font-semibold text-gray-900">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}
