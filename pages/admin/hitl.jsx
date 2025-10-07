import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';
export const getServerSideProps = getServerSideAdminWithPermission('hitl_quotes','view');
export default function Page({ initialAdmin }){
  return (
    <AdminLayout title="HITL (Disabled)" initialAdmin={initialAdmin}>
      <div className="rounded-lg bg-yellow-50 p-6 ring-1 ring-yellow-100 text-yellow-900">Human-in-the-Loop workflow is disabled in Simplified Admin Phase 1.</div>
    </AdminLayout>
  );
}
