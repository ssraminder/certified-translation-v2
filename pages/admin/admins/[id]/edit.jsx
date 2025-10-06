import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../../components/admin/AdminLayout';
import AdminForm from '../../../../components/admin/AdminForm';
import AdminStatusBadge from '../../../../components/admin/AdminStatusBadge';
import RoleBadge from '../../../../components/admin/RoleBadge';
import ConfirmationDialog from '../../../../components/admin/ConfirmationDialog';
import { getServerSideAdminWithPermission } from '../../../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('admins','edit');

export default function EditAdminPage({ initialAdmin }){
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSelf = admin && initialAdmin && String(admin.id) === String(initialAdmin.id);

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/admin/admins/${id}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(setAdmin)
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [id]);

  async function handleSave(payload){
    const res = await fetch(`/api/admin/admins/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (res.ok && json.success) {
      router.push('/admin/admins');
    } else {
      alert(json.error || 'Failed to save changes');
    }
  }

  async function handleDeactivate(){
    if (!admin) return;
    const res = await fetch(`/api/admin/admins/${id}/deactivate`, { method: 'PUT' });
    if (res.ok) router.push('/admin/admins');
    else {
      const j = await res.json();
      alert(j.error || 'Failed to deactivate');
    }
  }

  return (
    <AdminLayout title={admin ? `Edit Admin: ${admin.full_name}` : 'Edit Admin'} initialAdmin={initialAdmin}>
      <div className="mb-4">
        <Link href="/admin/admins" className="text-sm text-blue-600 hover:underline">← Back to Admins</Link>
      </div>

      {!admin && loading && (
        <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">Loading...</div>
      )}

      {admin && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RoleBadge role={admin.role} />
                <AdminStatusBadge isActive={admin.is_active} />
              </div>
              {!isSelf && (
                admin.is_active ? (
                  <button onClick={()=>setConfirmOpen(true)} className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">Deactivate</button>
                ) : (
                  <button onClick={async()=>{ const r = await fetch(`/api/admin/admins/${id}/activate`, { method: 'PUT' }); if (r.ok) router.push('/admin/admins'); }} className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">Activate</button>
                )
              )}
            </div>
            <AdminForm mode="edit" initial={admin} disableRole={isSelf} disableActive={isSelf} onSubmit={handleSave} />
          </div>

          <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Additional Info</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">{admin.created_at ? new Date(admin.created_at).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Created By</dt>
                <dd className="text-gray-900">{admin.created_by_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Login</dt>
                <dd className="text-gray-900">{admin.last_login_at ? new Date(admin.last_login_at).toLocaleString() : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Modified</dt>
                <dd className="text-gray-900">{admin.updated_at ? new Date(admin.updated_at).toLocaleString() : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmOpen}
        title="Deactivate Admin?"
        message={`Are you sure you want to deactivate ${admin?.full_name}?`}
        confirmText="Deactivate"
        danger
        onCancel={()=>setConfirmOpen(false)}
        onConfirm={()=>{ setConfirmOpen(false); handleDeactivate(); }}
      />
    </AdminLayout>
  );
}
