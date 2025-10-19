import { useState, useEffect } from 'react';

export default function ActivityLogSection({ orderId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const resp = await fetch(`/api/orders/${orderId}/activity?filter=${filter}`);
        const data = await resp.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Failed to load activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [orderId, filter]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'created':
        return '����️';
      case 'payment':
        return '💳';
      case 'assigned':
        return '👤';
      case 'amendment':
        return '📝';
      case 'status_change':
        return '📊';
      case 'message':
        return '💬';
      default:
        return '📌';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Activities</option>
          <option value="payments">Payments</option>
          <option value="updates">Updates</option>
          <option value="communications">Communications</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No activities found</div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-1">{getActivityIcon(activity.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                  </div>
                  {activity.details && (
                    <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
                  )}
                  {activity.metadata && (
                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                      {Object.entries(activity.metadata).map(([key, value]) => (
                        <p key={key} className="text-gray-600">
                          {key}: <span className="font-mono text-gray-700">{String(value)}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
