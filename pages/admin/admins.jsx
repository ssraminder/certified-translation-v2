import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';
export const getServerSideProps = getServerSideAdminWithPermission('admins','view');
export default function Page({ initialAdmin }){
  return (
    <AdminLayout title="Admin Management" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">Coming Soon</div>
    </AdminLayout>
  );
}
