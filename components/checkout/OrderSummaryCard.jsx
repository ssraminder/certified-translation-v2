import { formatBytes } from '../../lib/checkoutUtils';

export default function OrderSummaryCard({ order, quote }) {
  const quoteData = quote || order.quote || {};
  const documents = order.documents || [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-normal text-gray-900 mb-4">Order Summary</h2>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Order ID:</span>
          <span className="text-gray-900">{order.order_number || order.id?.slice(0, 8)}</span>
        </div>

        {(quoteData.source_lang || quoteData.target_lang) && (
          <div className="flex justify-between">
            <span className="text-gray-600">Translation:</span>
            <span className="text-gray-900">{quoteData.source_lang} → {quoteData.target_lang}</span>
          </div>
        )}

        {(quoteData.intended_use_name || quoteData.intended_use) && (
          <div className="flex justify-between">
            <span className="text-gray-600">Purpose:</span>
            <span className="text-gray-900">{quoteData.intended_use_name || quoteData.intended_use}</span>
          </div>
        )}

        {documents && documents.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-gray-600 mb-2">Documents:</div>
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                    <path d="M10 1.33334H4C3.64638 1.33334 3.30724 1.47382 3.05719 1.72387C2.80714 1.97392 2.66667 2.31305 2.66667 2.66668V13.3333C2.66667 13.687 2.80714 14.0261 3.05719 14.2762C3.30724 14.5262 3.64638 14.6667 4 14.6667H12C12.3536 14.6667 12.6928 14.5262 12.9428 14.2762C13.1929 14.0261 13.3333 13.687 13.3333 13.3333V4.66668L10 1.33334Z" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.33334 1.33334V4.00001C9.33334 4.35363 9.47381 4.69277 9.72386 4.94282C9.97391 5.19287 10.313 5.33334 10.6667 5.33334H13.3333M6.66667 6H5.33333M10.6667 8.66666H5.33333M10.6667 11.3333H5.33333" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-gray-900 truncate flex-1" title={doc.filename}>{doc.filename}</span>
                  <span className="text-gray-500 text-xs flex-shrink-0">({formatBytes(doc.bytes)})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
