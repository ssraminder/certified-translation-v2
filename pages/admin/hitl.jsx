import { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../lib/withAdminPage';

export const getServerSideProps = getServerSideAdminWithPermission('hitl_quotes','view');

export default function HITLPage({ initialAdmin }){
  const [hitlQuotes, setHitlQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchHitlQuotes();
  }, [filter]);

  const fetchHitlQuotes = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/hitl/quotes?status=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load HITL quotes');
      setHitlQuotes(data.quotes || []);
    } catch (err) {
      setError(err.message);
      setHitlQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Human-in-the-Loop (HITL) Quotes" initialAdmin={initialAdmin}>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <h3 className="text-gray-600 text-sm font-medium">Pending HITL</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {hitlQuotes.filter(q => !q.hitl_assigned_at).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <h3 className="text-gray-600 text-sm font-medium">In Review</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {hitlQuotes.filter(q => q.hitl_assigned_at && !q.hitl_completed_at).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <h3 className="text-gray-600 text-sm font-medium">Completed</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {hitlQuotes.filter(q => q.hitl_completed_at).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium text-gray-700">Filter by status:</label>
            <div className="flex gap-2">
              {[
                { value: 'pending', label: 'Pending' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'all', label: 'All' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === opt.value
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Quotes Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading HITL quotes...</div>
            </div>
          ) : hitlQuotes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No HITL quotes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hitlQuotes.map(quote => (
                    <tr key={quote.quote_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a href={`/admin/quotes/${quote.quote_id}`} className="text-cyan-600 hover:underline font-medium">
                          {quote.quote_number}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{quote.customer_first_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{quote.customer_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {quote.ordering_type || 'Individual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600">{quote.hitl_reason || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {quote.hitl_requested_at && !quote.hitl_invoked_at ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Requested
                          </span>
                        ) : quote.hitl_invoked_at && !quote.hitl_assigned_at ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Invoked
                          </span>
                        ) : quote.hitl_assigned_at && !quote.hitl_completed_at ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                            In Review
                          </span>
                        ) : quote.hitl_completed_at ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a href={`/admin/quotes/${quote.quote_id}`} className="text-cyan-600 hover:underline">
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
