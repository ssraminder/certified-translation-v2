import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../../components/admin/AdminLayout';
import AdminForm from '../../../components/admin/AdminForm';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('admins','create');

export default function NewAdminPage({ initialAdmin }){
  const router = useRouter();

  async function handleCreate(payload){
    const res = await fetch('/api/admin/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (res.ok && json.success) {
      router.push('/admin/admins');
    } else {
      alert(json.error || 'Failed to create admin');
    }
  }

  return (
    <AdminLayout title="Create New Admin" initialAdmin={initialAdmin}>
      <div className="mb-4">
        <Link href="/admin/admins" className="text-sm text-blue-600 hover:underline">← Back to Admins</Link>
      </div>
      <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
        <AdminForm mode="create" onSubmit={handleCreate} />
      </div>
    </AdminLayout>
  );
}
