export default function AddressCard({ address, onEdit, onDelete, onMakeDefault, deleteDisabled }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-gray-900">{address.full_name}</h4>
            {address.is_default ? (
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 font-semibold">DEFAULT</span>
            ) : null}
          </div>
          {address.company_name ? <p className="text-sm text-gray-600">{address.company_name}</p> : null}
          <p className="text-sm text-gray-700 mt-2">{address.address_line_1}</p>
          {address.address_line_2 ? <p className="text-sm text-gray-700">{address.address_line_2}</p> : null}
          <p className="text-sm text-gray-700">{address.city}, {address.state_province} {address.postal_code}</p>
          <p className="text-sm text-gray-700">{address.country}</p>
          {address.phone ? <p className="text-sm text-gray-600 mt-1">{address.phone}</p> : null}
        </div>
        <div className="flex gap-2">
          {!address.is_default ? (
            <button onClick={() => onMakeDefault(address)} className="px-2 py-1 text-xs bg-cyan-50 text-cyan-700 rounded border border-cyan-200">Set as Default</button>
          ) : null}
          <button onClick={() => onEdit(address)} className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-200">Edit</button>
          <button onClick={() => onDelete(address)} disabled={deleteDisabled} className={`px-2 py-1 text-xs rounded border ${deleteDisabled ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-red-50 text-red-700 border-red-200'}`}>Delete</button>
        </div>
      </div>
    </div>
  );
}
