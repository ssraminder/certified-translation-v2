import RoleBadge from './RoleBadge';

export default function AdminHeader({ admin, onToggleSidebar, collapsed }){
  async function logout(){
    try{
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }
  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-white shadow-sm">
      <div className="mx-auto flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 rounded-md hover:bg-gray-100 lg:hidden" aria-label="Open sidebar" onClick={onToggleSidebar}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-gray-700"><path d="M3.75 5.25h16.5v1.5H3.75zM3.75 11.25h16.5v1.5H3.75zM3.75 17.25h16.5v1.5H3.75z"/></svg>
          </button>
          <div className="flex items-baseline gap-2">
            <div className="font-bold text-gray-900">Cethos</div>
            <div className="text-gray-400">/</div>
            <div className="font-semibold text-gray-900">Admin Panel</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {admin?.role && <RoleBadge role={admin.role} />}
          <div className="text-sm text-gray-800">{admin?.full_name || admin?.email}</div>
          <button onClick={logout} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">Logout</button>
        </div>
      </div>
    </header>
  );
}
