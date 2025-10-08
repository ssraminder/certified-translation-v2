import Link from 'next/link';
import AdminLayout from '../../../components/admin/AdminLayout';
import UserForm from '../../../components/admin/UserForm';
import { useRouter } from 'next/router';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('users','create');

export default function NewUserPage({ initialAdmin }){
  const router = useRouter();

  async function handleCreate(payload){
    const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (res.ok && json.success) {
      router.push('/admin/users');
    } else {
      alert(json.error || 'Failed to create user');
    }
  }

  return (
    <AdminLayout title="Create New User" initialAdmin={initialAdmin}>
      <div className="mb-4">
        <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">← Back to Users</Link>
      </div>
      <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
        <UserForm mode="create" onSubmit={handleCreate} />
      </div>
    </AdminLayout>
  );
}
