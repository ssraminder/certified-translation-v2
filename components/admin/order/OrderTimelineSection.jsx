export default function OrderTimelineSection({ order }) {
  const timeline = [
    {
      id: 1,
      label: 'Order Placed',
      status: 'completed',
      timestamp: order.created_at,
    },
    {
      id: 2,
      label: 'Payment Received',
      status: order.payment_status === 'paid' ? 'completed' : 'pending',
      timestamp: order.payment_date || null,
    },
    {
      id: 3,
      label: 'In Progress',
      status:
        order.status === 'in_progress' || order.status === 'processing'
          ? 'current'
          : order.status === 'completed'
            ? 'completed'
            : 'pending',
      timestamp: order.processing_started_at || null,
    },
    {
      id: 4,
      label: 'Quality Check',
      status:
        order.status === 'completed' ? 'completed' : 'pending',
      timestamp: null,
    },
    {
      id: 5,
      label: 'Delivered',
      status: order.status === 'completed' ? 'completed' : 'pending',
      timestamp: order.completed_at || null,
    },
  ];

  const formatTime = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-8">Order Timeline</h2>

      <div className="flex items-center gap-4">
        {timeline.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                  step.status === 'completed'
                    ? 'bg-green-500'
                    : step.status === 'current'
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                } ${step.status === 'current' ? 'animate-pulse' : ''}`}
              >
                {step.status === 'completed' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.status === 'current' ? (
                  <div className="w-2 h-2 bg-white rounded-full" />
                ) : (
                  ''
                )}
              </div>

              {/* Label and Timestamp */}
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">{step.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatTime(step.timestamp)}</p>
              </div>
            </div>

            {/* Connecting Line */}
            {idx < timeline.length - 1 && (
              <div className="flex-1 mx-2">
                <div
                  className={`h-1 rounded-full ${
                    step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
