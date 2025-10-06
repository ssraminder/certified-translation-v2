export default function RoleBadge({ role }){
  const r = (role || '').toLowerCase();
  const style = (() => {
    switch (r) {
      case 'super_admin':
      case 'super admin':
        return 'bg-yellow-500 text-white';
      case 'manager':
        return 'bg-blue-600 text-white';
      case 'project_manager':
      case 'project manager':
        return 'bg-green-600 text-white';
      case 'accountant':
        return 'bg-purple-600 text-white';
      case 'sales':
        return 'bg-orange-500 text-white';
      case 'associate':
      default:
        return 'bg-gray-500 text-white';
    }
  })();
  const label = role || 'Associate';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>{label}</span>
  );
}
