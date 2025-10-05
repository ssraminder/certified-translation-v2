import Link from 'next/link';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
      {icon ? <div className="text-6xl mb-4">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description ? <p className="text-gray-600 mb-6">{description}</p> : null}
      {action ? (
        <Link href={action.href} className="inline-block">
          <button className="bg-cyan-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-cyan-600 transition">{action.label}</button>
        </Link>
      ) : null}
    </div>
  );
}
