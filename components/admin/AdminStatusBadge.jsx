export default function AdminStatusBadge({ isActive }) {
  const active = Boolean(isActive);
  const style = active ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
