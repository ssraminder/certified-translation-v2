import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { canViewHITLQuotes, canViewQuotes, canViewOrders, canViewUsers, canViewSettings, canViewSystemSettings, canViewAnalytics, canManageAdmins, canViewLogs } from '../../lib/permissions';

function NavItem({ href, icon, label, active, collapsed, badge }){
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-700/50 ${active ? 'bg-slate-800' : ''}`}>
      <span className="inline-flex h-5 w-5 items-center justify-center text-slate-200">{icon}</span>
      {!collapsed && <span className="text-slate-100 flex-1">{label}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">{badge}</span>
      )}
    </Link>
  );
}

function SectionLabel({ children, collapsed }){
  if (collapsed) return null;
  return <div className="px-3 pt-6 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</div>;
}

function Chevron({ open }){
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}>
      <path fillRule="evenodd" d="M6.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L9.586 10 6.293 6.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export default function AdminSidebar({ collapsed, pendingCounts = {} , onClose, admin, sidebarOpen }){
  const router = useRouter();
  const path = router.asPath || router.pathname || '';
  const isActive = (href) => path === href || path.startsWith(href + '/');

  const [openSettings, setOpenSettings] = useState(false);
  const role = admin?.role || null;

  return (
    <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 bg-slate-900 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${collapsed ? 'w-16' : 'w-60'} h-screen overflow-y-auto`}>
      <nav className="px-2 py-3">
        <SectionLabel collapsed={collapsed}>General</SectionLabel>
        <NavItem href="/admin/dashboard" label="Dashboard" collapsed={collapsed} active={isActive('/admin/dashboard')} badge={null} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 12l9-9 9 9v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8z"/></svg>
        } />

        {(canViewHITLQuotes(role) || canViewQuotes(role)) && <SectionLabel collapsed={collapsed}>Quotes</SectionLabel>}
        {canViewQuotes(role) && (
          <NavItem href="/admin/quotes" label="All Quotes" collapsed={collapsed} active={isActive('/admin/quotes')} badge={null} icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M6 4h12a2 2 0 012 2v14l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
          } />
        )}

        {canViewOrders(role) && <SectionLabel collapsed={collapsed}>Orders</SectionLabel>}
        {canViewOrders(role) && (
          <NavItem href="/admin/orders" label="Orders" collapsed={collapsed} active={isActive('/admin/orders')} badge={pendingCounts.orders} icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 3h18l-1.5 13.5A2 2 0 0117.51 18H8.49a2 2 0 01-1.99-1.5L5 9H3V7h2l1-4z"/></svg>
          } />
        )}

        {canViewUsers(role) && <SectionLabel collapsed={collapsed}>Users</SectionLabel>}
        {canViewUsers(role) && (
          <NavItem href="/admin/users" label="Users" collapsed={collapsed} active={isActive('/admin/users')} badge={null} icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM8 11c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zm8 2c-2.21 0-6 1.12-6 3.333V19h12v-2.667C22 14.12 18.21 13 16 13zM8 13c-2.587 0-7 1.306-7 3.889V19h7v-2.111C8 14.306 8 13 8 13z"/></svg>
          } />
        )}

        {(canViewSettings(role) || canViewSystemSettings(role)) && <SectionLabel collapsed={collapsed}>Settings</SectionLabel>}
        {(canViewSettings(role) || canViewSystemSettings(role)) && (
          <button className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-slate-700/50 ${openSettings ? 'bg-slate-800' : ''}`} onClick={() => setOpenSettings(!openSettings)}>
            <span className="flex items-center gap-3">
              <span className="inline-flex h-5 w-5 items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 4a7.94 7.94 0 00-.18-1.62l2.11-1.65-2-3.46-2.5 1a7.94 7.94 0 00-2.8-1.62l-.38-2.65h-4l-.38 2.65a7.94 7.94 0 00-2.8 1.62l-2.5-1-2 3.46 2.11 1.65A7.94 7.94 0 003.06 12c0 .55.06 1.09.18 1.62L1.13 15.27l2 3.46 2.5-1a7.94 7.94 0 002.8 1.62l.38 2.65h4l.38-2.65a7.94 7.94 0 002.8-1.62l2.5 1 2-3.46-2.11-1.65c.12-.53.18-1.07.18-1.62z"/></svg>
              </span>
              {!collapsed && <span>Settings</span>}
            </span>
            {!collapsed && <Chevron open={openSettings} />}
          </button>
        )}
        {(!collapsed && openSettings) && (
          <div className="mt-1 space-y-1 pl-8">
            {canViewSettings(role) && <Link href="/admin/settings/languages" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/languages') ? 'bg-slate-800' : ''}`}>Languages</Link>}
            {canViewSettings(role) && <Link href="/admin/settings/tiers" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/tiers') ? 'bg-slate-800' : ''}`}>Language Tiers</Link>}
            {canViewSettings(role) && <Link href="/admin/settings/certifications" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/certifications') ? 'bg-slate-800' : ''}`}>Certifications</Link>}
            {canViewSettings(role) && <Link href="/admin/settings/intended-uses" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/intended-uses') ? 'bg-slate-800' : ''}`}>Intended Uses</Link>}
            {canViewSettings(role) && <Link href="/admin/settings/email-templates" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/email-templates') ? 'bg-slate-800' : ''}`}>Email Templates</Link>}
            {canViewSystemSettings(role) && <Link href="/admin/settings/system" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/system') ? 'bg-slate-800' : ''}`}>System Settings</Link>}
          </div>
        )}

        {(canViewAnalytics(role)) && <SectionLabel collapsed={collapsed}>Insights</SectionLabel>}
        {canViewAnalytics(role) && (
          <NavItem href="/admin/analytics" label="Analytics" collapsed={collapsed} active={isActive('/admin/analytics')} badge={null} icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 3h2v18H3zM19 11h2v10h-2zM11 7h2v14h-2zM7 14h2v7H7zM15 3h2v18h-2z"/></svg>
          } />
        )}
        {canViewAnalytics(role) && (
          <NavItem href="/admin/reports" label="Reports" collapsed={collapsed} active={isActive('/admin/reports')} badge={null} icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm9 7V3.5L19.5 9H15z"/></svg>
          } />
        )}

        {canManageAdmins(role) && <SectionLabel collapsed={collapsed}>Administration</SectionLabel>}
        {canManageAdmins(role) && (
          <NavItem href="/admin/admins" label="Admin Management" collapsed={collapsed} active={isActive('/admin/admins')} badge={null} icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0v1H5v-1z"/></svg>
          } />
        )}

        {canViewLogs(role) && <SectionLabel collapsed={collapsed}>Audit</SectionLabel>}
        {canViewLogs(role) && (
          <NavItem href="/admin/logs" label="Activity Logs" collapsed={collapsed} active={isActive('/admin/logs')} badge={null} icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M5 3h14a2 2 0 012 2v2H3V5a2 2 0 012-2zm-2 6h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm4 2v2h10v-2H7z"/></svg>
          } />
        )}
      </nav>

      <button aria-hidden className="lg:hidden" onClick={onClose} />
    </aside>
  );
}
