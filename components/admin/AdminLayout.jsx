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
    <div className="app-shell flex flex-row min-h-screen h-full overflow-hidden bg-slate-50">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={closeSidebar} />
      )}

      <AdminSidebar
        collapsed={collapsed}
        pendingCounts={pendingCounts}
        onClose={closeSidebar}
        admin={initialAdmin}
        sidebarOpen={sidebarOpen}
      />

      <main className="app-main ml-0 md:ml-16 lg:ml-60 flex-1 flex flex-col min-h-screen overflow-auto">
        <AdminHeader admin={initialAdmin} onToggleSidebar={toggleSidebar} collapsed={collapsed} />
        <div className="px-4 pt-6">
          {title && <h1 className="mb-4 text-2xl font-semibold text-gray-900">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
}
