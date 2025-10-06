import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdmin } from '../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdmin;

export default function AccessDenied({ initialAdmin }){
  return (
    <AdminLayout title="Access Denied" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">
        <div className="text-lg font-semibold text-gray-900">You don't have permission to access this page.</div>
        <a href="/admin/dashboard" className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">Back to Dashboard</a>
      </div>
    </AdminLayout>
  );
}
