import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('orders', 'edit');

export default function CleanupPage({ initialAdmin }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCleanup = async () => {
    if (!window.confirm('Are you sure? This will reset all placeholder fields on all orders to empty.')) {
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const resp = await fetch('/api/admin/cleanup-orders', {
        method: 'POST',
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Cleanup failed');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Cleanup Orders" initialAdmin={initialAdmin}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg p-8 border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Cleanup Order Data</h1>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Warning</h3>
            <p className="text-sm text-yellow-800 mb-3">
              This will reset all placeholder fields on <strong>all orders</strong> to empty/null values, including:
            </p>
            <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
              <li>Customer information (name, email, phone)</li>
              <li>Project details (service type, languages, document type, etc.)</li>
              <li>Pricing information (all totals and line items)</li>
              <li>Addresses and shipping details</li>
              <li>Instructions and notes</li>
            </ul>
            <p className="text-sm text-yellow-800 mt-3">
              <strong>Order numbers and IDs will NOT be affected.</strong>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-700 font-semibold mb-3">
                ✓ {result.message}
              </p>
              {result.cleaned > 0 && (
                <div>
                  <p className="text-sm text-green-700 mb-2">Orders cleaned:</p>
                  <ul className="text-sm text-green-700 list-disc list-inside space-y-1 max-h-60 overflow-y-auto">
                    {result.orders.map(o => (
                      <li key={o.id}>{o.order_number}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleCleanup}
            disabled={loading || !!result}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Cleaning up...' : 'Cleanup Order Data'}
          </button>

          <p className="text-xs text-gray-500 mt-4 text-center">
            This action cannot be undone. Make sure you have a backup.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
