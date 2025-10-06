import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';
export const getServerSideProps = getServerSideAdminWithPermission('analytics','view');
export default function Page({ initialAdmin }){
  return (
    <AdminLayout title="Reports" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">Coming Soon</div>
    </AdminLayout>
  );
}
