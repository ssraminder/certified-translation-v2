export default function OrderDetailsCard({ quote, certifications }) {
  const certificationTypes = (certifications || [])
    .map(c => c.cert_type_name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="rounded-xl border bg-white p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Order Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Source Language */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Source Language</p>
            <p className="text-base text-gray-900 font-medium">{quote?.source_language || '—'}</p>
          </div>

          {/* Target Language */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Target Language</p>
            <p className="text-base text-gray-900 font-medium">{quote?.target_language || '—'}</p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Intended Use */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Intended Use</p>
            <p className="text-base text-gray-900 font-medium">{quote?.intended_use || '—'}</p>
          </div>

          {/* Certification Type */}
          <div>
            <p className="text-sm text-gray-600 mb-1">Certification Type</p>
            <p className="text-base text-gray-900 font-medium">{certificationTypes || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
