import AdminLayout from '../../../components/admin/AdminLayout';
import AdminSettingsPanel from '../../../components/admin/AdminSettingsPanel';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('settings', 'edit');

export default function AppConfigPage({ initialAdmin }) {
  return (
    <AdminLayout title="App Configuration" initialAdmin={initialAdmin}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">App Configuration</h1>
          <p className="text-gray-600">Manage company settings, business hours, and holidays</p>
        </div>
        <AdminSettingsPanel />
      </div>
    </AdminLayout>
  );
}
