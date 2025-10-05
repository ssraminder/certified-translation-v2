export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex flex-wrap gap-2" aria-label="Tabs">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 ${
                isActive ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
