export default function StatusBadge({ status }) {
  const map = {
    pending_payment: { cls: 'bg-orange-100 text-orange-700', label: '💳 Pending Payment' },
    processing: { cls: 'bg-blue-100 text-blue-700', label: '⏳ In Progress' },
    draft_review: { cls: 'bg-blue-100 text-blue-700', label: '⏳ In Progress' },
    certification: { cls: 'bg-blue-100 text-blue-700', label: '⏳ In Progress' },
    paid: { cls: 'bg-blue-100 text-blue-700', label: '⏳ In Progress' },
    completed: { cls: 'bg-green-100 text-green-700', label: '✓ Completed' },
    delivered: { cls: 'bg-purple-100 text-purple-700', label: '📦 Delivered' },
  };
  const { cls, label } = map[status] || { cls: 'bg-gray-100 text-gray-700', label: String(status || '').split('_').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ') };
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>{label}</span>;
}
