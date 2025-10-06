import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

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

export default function AdminSidebar({ collapsed, pendingCounts = {} , onClose }){
  const router = useRouter();
  const path = router.asPath || router.pathname || '';
  const isActive = (href) => path === href || path.startsWith(href + '/');

  const [openSettings, setOpenSettings] = React.useState(false);

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 bg-slate-900 transition-all lg:static lg:translate-x-0 ${collapsed ? 'w-16' : 'w-60'} ${collapsed ? '' : ''}`}>
      <div className="h-16" />
      <nav className="px-2">
        <SectionLabel collapsed={collapsed}>General</SectionLabel>
        <NavItem href="/admin/dashboard" label="Dashboard" collapsed={collapsed} active={isActive('/admin/dashboard')} badge={null} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 12l9-9 9 9v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8z"/></svg>
        } />

        <SectionLabel collapsed={collapsed}>Quotes</SectionLabel>
        <NavItem href="/admin/hitl" label="HITL Queue" collapsed={collapsed} active={isActive('/admin/hitl')} badge={pendingCounts.hitl} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 22a1 1 0 01-1-1v-2.126A8.003 8.003 0 014 11V6a4 4 0 118 0v5a8.003 8.003 0 017 7.874V21a1 1 0 01-1 1H12zM8 4a2 2 0 00-2 2v5a6 6 0 0012 0V6a2 2 0 10-4 0v5a2 2 0 11-4 0V6a2 2 0 00-2-2z"/></svg>
        } />
        <NavItem href="/admin/quotes" label="All Quotes" collapsed={collapsed} active={isActive('/admin/quotes')} badge={null} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M6 4h12a2 2 0 012 2v14l-4-3H6a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
        } />

        <SectionLabel collapsed={collapsed}>Orders</SectionLabel>
        <NavItem href="/admin/orders" label="Orders" collapsed={collapsed} active={isActive('/admin/orders')} badge={pendingCounts.orders} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 3h18l-1.5 13.5A2 2 0 0117.51 18H8.49a2 2 0 01-1.99-1.5L5 9H3V7h2l1-4z"/></svg>
        } />

        <SectionLabel collapsed={collapsed}>Users</SectionLabel>
        <NavItem href="/admin/users" label="Users" collapsed={collapsed} active={isActive('/admin/users')} badge={null} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM8 11c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zm8 2c-2.21 0-6 1.12-6 3.333V19h12v-2.667C22 14.12 18.21 13 16 13zM8 13c-2.587 0-7 1.306-7 3.889V19h7v-2.111C8 14.306 8 13 8 13z"/></svg>
        } />

        <SectionLabel collapsed={collapsed}>Settings</SectionLabel>
        <button className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-slate-700/50 ${openSettings ? 'bg-slate-800' : ''}`} onClick={() => setOpenSettings(!openSettings)}>
          <span className="flex items-center gap-3">
            <span className="inline-flex h-5 w-5 items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 4a7.94 7.94 0 00-.18-1.62l2.11-1.65-2-3.46-2.5 1a7.94 7.94 0 00-2.8-1.62l-.38-2.65h-4l-.38 2.65a7.94 7.94 0 00-2.8 1.62l-2.5-1-2 3.46 2.11 1.65A7.94 7.94 0 003.06 12c0 .55.06 1.09.18 1.62L1.13 15.27l2 3.46 2.5-1a7.94 7.94 0 002.8 1.62l.38 2.65h4l.38-2.65a7.94 7.94 0 002.8-1.62l2.5 1 2-3.46-2.11-1.65c.12-.53.18-1.07.18-1.62z"/></svg>
            </span>
            {!collapsed && <span>Settings</span>}
          </span>
          {!collapsed && <Chevron open={openSettings} />}
        </button>
        {(!collapsed && openSettings) && (
          <div className="mt-1 space-y-1 pl-8">
            <Link href="/admin/settings/languages" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/languages') ? 'bg-slate-800' : ''}`}>Languages</Link>
            <Link href="/admin/settings/tiers" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/tiers') ? 'bg-slate-800' : ''}`}>Language Tiers</Link>
            <Link href="/admin/settings/certifications" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/certifications') ? 'bg-slate-800' : ''}`}>Certifications</Link>
            <Link href="/admin/settings/intended-uses" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/intended-uses') ? 'bg-slate-800' : ''}`}>Intended Uses</Link>
            <Link href="/admin/settings/email-templates" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/email-templates') ? 'bg-slate-800' : ''}`}>Email Templates</Link>
            <Link href="/admin/settings/system" className={`block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 ${isActive('/admin/settings/system') ? 'bg-slate-800' : ''}`}>System Settings</Link>
          </div>
        )}

        <SectionLabel collapsed={collapsed}>Insights</SectionLabel>
        <NavItem href="/admin/analytics" label="Analytics" collapsed={collapsed} active={isActive('/admin/analytics')} badge={null} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M3 3h2v18H3zM19 11h2v10h-2zM11 7h2v14h-2zM7 14h2v7H7zM15 3h2v18h-2z"/></svg>
        } />
        <NavItem href="/admin/reports" label="Reports" collapsed={collapsed} active={isActive('/admin/reports')} badge={null} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm9 7V3.5L19.5 9H15z"/></svg>
        } />

        <SectionLabel collapsed={collapsed}>Administration</SectionLabel>
        <NavItem href="/admin/admins" label="Admin Management" collapsed={collapsed} active={isActive('/admin/admins')} badge={null} icon={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0v1H5v-1z"/></svg>
        } />
      </nav>

      {/* mobile backdrop close area */}
      <button aria-hidden className="lg:hidden" onClick={onClose} />
    </aside>
  );
}
