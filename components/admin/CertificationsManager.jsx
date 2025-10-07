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
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ setCerts(initialCertifications || []); }, [initialCertifications]);

  useEffect(()=>{
    async function load(){
      try { const { data } = await supabase.from('cert_types').select('id, name, amount'); setCertTypes((data||[]).map(d=>({ code: toCode(d.name), name: d.name, default_rate: Number(d.amount||0) }))); }
      catch {}
    }
    load();
  }, []);

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
        applies_to_file_id: selectedFile,
        applies_to_filename: files.find(f=> (f.file_id||f.id)===selectedFile)?.filename || null
      };
      const resp = await fetch(`/api/admin/quotes/${quoteId}/certifications`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const json = await resp.json();
      if (json?.success){ setCerts(list => [...list, json.certification]); onChange && onChange({ totals: json.totals }); setOpen(false); setSelectedFile(''); setSelectedType(''); setDefaultRate(0); setOverrideRate(''); }
    } finally { setLoading(false); }
  }

  async function update(certId, patch){
    const resp = await fetch(`/api/admin/quotes/${quoteId}/certifications/${certId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) });
    const json = await resp.json();
    if (json?.success){ setCerts(list => list.map(c => c.id===certId ? json.certification : c)); onChange && onChange({ totals: json.totals }); }
  }

  return (
    <div className="rounded border bg-white p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Certifications</h3>
      {certs.length === 0 ? (
        <div className="text-sm text-gray-500 mb-3">No certifications added yet</div>
      ):(
        <div className="space-y-3 mb-3">
          {certs.map(c => (
            <div key={c.id} className="border rounded p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{c.cert_type_name}</div>
                  <div className="text-xs text-gray-600">For: {c.applies_to_filename || '—'}</div>
                </div>
                {canEdit && <button onClick={()=> remove(c.id)} className="text-red-600 text-sm">Remove</button>}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                <div>
                  <div className="text-gray-600">Default Rate</div>
                  <div>${Number(c.default_rate||0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Override Rate</div>
                  <div>{c.override_rate ? `$${Number(c.override_rate).toFixed(2)}` : '—'}</div>
                </div>
                {canEdit && (
                  <div className="col-span-2 flex items-center gap-2">
                    <select className="rounded border px-2 py-1" value={c.cert_type_code} onChange={e=> update(c.id, { cert_type_code: e.target.value, cert_type_name: certTypes.find(x=>x.code===e.target.value)?.name, default_rate: certTypes.find(x=>x.code===e.target.value)?.default_rate })}>
                      {certTypes.map(ct => (<option key={ct.code} value={ct.code}>{ct.name} (${ct.default_rate})</option>))}
                    </select>
                    <input type="number" step="0.01" placeholder="Override" className="rounded border px-2 py-1" defaultValue={c.override_rate||''} onBlur={e=> update(c.id, { override_rate: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div>
          {!open ? (
            <button onClick={()=> setOpen(true)} className="w-full rounded border px-3 py-2 text-sm">+ Add Certification</button>
          ):(
            <div className="border rounded p-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Apply to File</label>
                  <select value={selectedFile} onChange={e=> setSelectedFile(e.target.value)} className="w-full rounded border px-2 py-2">
                    <option value="">-- Choose a file --</option>
                    {(files||[]).map(f => (<option key={f.file_id||f.id} value={f.file_id||f.id}>{f.filename}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Certification Type</label>
                  <select value={selectedType} onChange={e=> { const ct = certTypes.find(x=>x.code===e.target.value); setSelectedType(e.target.value); setDefaultRate(ct?.default_rate||0); }} className="w-full rounded border px-2 py-2">
                    <option value="">-- Choose certification --</option>
                    {certTypes.map(ct => (<option key={ct.code} value={ct.code}>{ct.name} (${ct.default_rate})</option>))}
                  </select>
                </div>
              </div>
              {selectedType && (
                <div className="mb-3 text-sm">Default Rate: <span className="font-semibold">${Number(defaultRate).toFixed(2)}</span></div>
              )}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Override Rate (optional)</label>
                <input type="number" step="0.01" min="0.01" value={overrideRate} onChange={e=> setOverrideRate(e.target.value)} className="w-full rounded border px-2 py-2" />
              </div>
              <div className="flex gap-2">
                <button disabled={loading} onClick={save} className="rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50">Add Certification</button>
                <button onClick={()=> { setOpen(false); setSelectedFile(''); setSelectedType(''); setOverrideRate(''); }} className="rounded border px-3 py-2">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
