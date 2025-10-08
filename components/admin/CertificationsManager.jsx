import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

function toCode(name){ return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }

export default function CertificationsManager({ quoteId, initialCertifications, files, canEdit = true, onChange }){
  const [certs, setCerts] = useState(initialCertifications || []);
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [certTypes, setCertTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [defaultRate, setDefaultRate] = useState(0);
  const [overrideRate, setOverrideRate] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ setCerts(initialCertifications || []); }, [initialCertifications]);

  useEffect(()=>{
    async function load(){
      try { 
        const { data } = await supabase.from('cert_types').select('id, name, amount'); 
        setCertTypes((data||[]).map(d=>{ 
          const code = toCode(d.name); 
          let rate = Number(d.amount||0); 
          if (code === 'standard' && !(rate > 0)) rate = 35; 
          return { code, name: d.name, default_rate: rate }; 
        })); 
      } catch {}
    }
    load();
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedFile('');
      setSelectedType('');
      setDefaultRate(0);
      setOverrideRate('');
      setOverrideReason('');
    }
  }, [open]);

  async function remove(id){
    if (!canEdit) return;
    const resp = await fetch(`/api/admin/quotes/${quoteId}/certifications/${id}`, { method:'DELETE' });
    const json = await resp.json();
    if (json?.success){ setCerts(list => list.filter(c => c.id !== id)); onChange && onChange({ totals: json.totals }); }
  }

  async function save(){
    if (!canEdit) return;
    if (!selectedFile || !selectedType) return;
    setLoading(true);
    try {
      const ct = certTypes.find(c=> c.code===selectedType);
      const payload = {
        cert_type_code: ct.code,
        cert_type_name: ct.name,
        default_rate: ct.default_rate,
        override_rate: overrideRate ? Number(overrideRate) : null,
        override_reason: overrideReason || null,
        applies_to_file_id: selectedFile,
        applies_to_filename: files.find(f=> (f.file_id||f.id)===selectedFile)?.filename || null
      };
      const resp = await fetch(`/api/admin/quotes/${quoteId}/certifications`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (json?.success){
        setCerts(list => [...list, json.certification]);
        onChange && onChange({ totals: json.totals });
        setOpen(false);
      }
    } catch (e) {
      console.error('Certification save error', e);
    } finally { setLoading(false); }
  }

  async function update(certId, patch){
    const resp = await fetch(`/api/admin/quotes/${quoteId}/certifications/${certId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) });
    const json = await resp.json();
    if (json?.success){ setCerts(list => list.map(c => c.id===certId ? json.certification : c)); onChange && onChange({ totals: json.totals }); }
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base">Certifications</h2>
          {canEdit && (
            <button onClick={()=> setOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M3.716 8h9.334M8.382 3.333v9.334"/>
              </svg>
              Add Certification
            </button>
          )}
        </div>

        {certs.length === 0 ? (
          <p className="text-sm text-gray-500">No certifications added</p>
        ) : (
          <div className="space-y-3">
            {certs.map(c => (
              <div key={c.id} className="p-4 rounded-xl border bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.67} d="M12.897 10.742l1.263 7.105a.833.833 0 01-1.318.77L10 16.5l-2.842 2.117a.833.833 0 01-1.318-.77l1.263-7.105M10 11.667a5 5 0 100-10 5 5 0 000 10z"/>
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900">{c.cert_type_name}</h4>
                      <p className="text-sm text-gray-600 mt-1">Applied to: {c.applies_to_filename || '—'}</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        Rate: ${Number(c.default_rate||0).toFixed(2)}
                        {c.override_rate && ` → Override: $${Number(c.override_rate).toFixed(2)}`}
                        {c.override_reason && ` (${c.override_reason})`}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 2H3.333c-.353 0-.692.14-.942.39A1.333 1.333 0 002 3.333v9.334c0 .353.14.692.39.942.25.25.59.39.943.39h9.334c.353 0 .692-.14.942-.39.25-.25.39-.59.39-.943V8M12.25 1.75a1.414 1.414 0 112 2L8.24 9.76a2 2 0 01-.568.403l-1.916.56a.333.333 0 01-.408-.408l.56-1.915a2 2 0 01.403-.569l6.01-6.009z"/>
                        </svg>
                      </button>
                      <button onClick={()=> remove(c.id)} className="p-2 rounded-lg hover:bg-gray-100">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M6.667 7.333v4M9.333 7.333v4M12.667 4v9.333c0 .354-.14.693-.391.943-.25.25-.589.391-.943.391H4.667c-.354 0-.693-.14-.943-.391a1.333 1.333 0 01-.391-.943V4M2 4h12M5.333 4V2.667c0-.354.14-.694.391-.944.25-.25.59-.39.943-.39h2.666c.354 0 .694.14.944.39.25.25.39.59.39.944V4"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Certification Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border bg-white shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h2 className="text-lg font-semibold">Add Certification</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 opacity-70 hover:opacity-100"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M12 4L4 12M4 4l8 8"/>
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4">
              <div className="space-y-4">
                {/* Certification Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Certification Type *</label>
                  <div className="relative">
                    <select
                      value={selectedType}
                      onChange={e=> {
                        const ct = certTypes.find(x=>x.code===e.target.value);
                        setSelectedType(e.target.value);
                        setDefaultRate(ct?.default_rate||0);
                      }}
                      className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm appearance-none pr-8"
                      required
                    >
                      <option value="">Choose certification type...</option>
                      {certTypes.map(ct => (
                        <option key={ct.code} value={ct.code}>{ct.name}</option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M4 6l4 4 4-4"/>
                    </svg>
                  </div>
                </div>

                {/* Apply to File */}
                <div>
                  <label className="block text-sm font-medium mb-2">Apply to File {Array.isArray(files) && files.length > 0 ? '*' : '(optional)'}</label>
                  <div className="relative">
                    <select
                      value={selectedFile}
                      onChange={e=> setSelectedFile(e.target.value)}
                      className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm appearance-none pr-8"
                      required={Array.isArray(files) && files.length > 0}
                    >
                      <option value="">{Array.isArray(files) && files.length > 0 ? 'Choose a file...' : 'No files available'}</option>
                      {(files||[]).map(f => (
                        <option key={f.file_id||f.id} value={f.file_id||f.id}>{f.filename}</option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M4 6l4 4 4-4"/>
                    </svg>
                  </div>
                </div>

                {/* Default Rate */}
                <div>
                  <label className="block text-sm font-medium mb-2">Default Rate</label>
                  <div className="rounded bg-gray-50 px-3 py-3">
                    <p className="font-medium">${Number(defaultRate).toFixed(2)}</p>
                  </div>
                </div>

                {/* Override Rate */}
                <div>
                  <label className="block text-sm font-medium mb-2">Override Rate (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={overrideRate}
                      onChange={e=> setOverrideRate(e.target.value)}
                      className="w-full rounded-lg border-0 bg-gray-100 pl-7 pr-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Override Reason */}
                <div>
                  <label className="block text-sm font-medium mb-2">Override Reason</label>
                  <textarea
                    value={overrideReason}
                    onChange={e=> setOverrideReason(e.target.value)}
                    placeholder="Optional reason for override..."
                    rows={3}
                    className="w-full rounded-lg border-0 bg-gray-100 px-3 py-2 text-sm resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 rounded-lg border text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    disabled={loading || !selectedType || ((Array.isArray(files) && files.length > 0) && !selectedFile)}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Add Certification
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
