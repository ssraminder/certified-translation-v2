import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdmin } from '../../lib/withAdminPage';
export const getServerSideProps = getServerSideAdmin;
export default function Page({ initialAdmin }){
  return (
    <AdminLayout title="Orders" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-white p-6 ring-1 ring-gray-100">Coming Soon</div>
    </AdminLayout>
  );
}
