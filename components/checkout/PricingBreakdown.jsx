import { formatCurrency, round2 } from '../../lib/checkoutUtils';

const GST_RATE = 0.05;

export default function PricingBreakdown({ 
  subtotal = 0, 
  shipping = 0, 
  taxRate = GST_RATE,
  showShipping = true,
  showDetails = true
}) {
  const grandSubtotal = round2(subtotal + shipping);
  const tax = round2(grandSubtotal * taxRate);
  const total = round2(grandSubtotal + tax);

  return (
    <div className="space-y-4">
      {showDetails && (
        <>
          {showShipping && (
            <div className="flex justify-between items-center pb-4 border-b border-gray-300">
              <div className="text-base text-gray-900">Shipping</div>
              <div className="text-base text-gray-900">${shipping.toFixed(2)}</div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="text-base text-gray-700">Subtotal</div>
            <div className="text-base text-gray-900">${grandSubtotal.toFixed(2)}</div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">GST ({(taxRate * 100).toFixed(0)}%)</div>
            <div className="text-sm text-gray-600">${tax.toFixed(2)}</div>
          </div>
        </>
      )}

      <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300">
        <div className="text-lg text-gray-900">Total</div>
        <div className="text-3xl font-normal text-gray-900">${total.toFixed(2)}</div>
      </div>
    </div>
  );
}
