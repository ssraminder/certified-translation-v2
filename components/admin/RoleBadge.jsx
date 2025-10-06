export default function RoleBadge({ role }){
  const r = (role || '').toString().trim().toLowerCase();
  const style = (() => {
    switch (r) {
      case 'super_admin':
      case 'super admin':
        return 'bg-red-500 text-white'; // #EF4444
      case 'manager':
        return 'bg-blue-500 text-white'; // #3B82F6
      case 'project_manager':
      case 'project manager':
        return 'bg-emerald-500 text-white'; // #10B981
      case 'accountant':
        return 'bg-purple-500 text-white'; // #8B5CF6
      case 'sales':
        return 'bg-orange-500 text-white'; // #F97316
      case 'associate':
      default:
        return 'bg-gray-500 text-white'; // #6B7280
    }
  })();
  const label = (() => {
    if (!r) return 'Associate';
    return r.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  })();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{label}</span>
  );
}
