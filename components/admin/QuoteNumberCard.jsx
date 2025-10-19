export default function QuoteNumberCard({ quote }) {
  return (
    <div className="rounded-xl border bg-white p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-600 mb-2">Quote Details</h2>
      <p className="text-2xl font-bold text-gray-900">{quote?.quote_number || '—'}</p>
    </div>
  );
}
