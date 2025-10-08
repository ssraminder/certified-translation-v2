import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';
export const getServerSideProps = getServerSideAdminWithPermission('users','view');
export default function Page({ initialAdmin }){
  return (
    <AdminLayout title="Users" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Manage your customers.</div>
          <a href="/admin/users/new" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create New User</a>
        </div>
        <div className="text-sm text-gray-500">User listing coming soon.</div>
      </div>
    </AdminLayout>
  );
}
