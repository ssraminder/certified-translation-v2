import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';
import FileManager from '../../../components/admin/FileManager';
import ManualLineItemForm from '../../../components/admin/ManualLineItemForm';
import CertificationsManager from '../../../components/admin/CertificationsManager';

export const getServerSideProps = getServerSideAdminWithPermission('quotes','view');

function Field({ label, children }){
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }){
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function Page({ initialAdmin }){
  const [quote, setQuote] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [totals, setTotals] = useState(null);
  const [files, setFiles] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    fetch(`/api/admin/quotes/${id}`)
      .then(r => r.json())
      .then(json => {
        setQuote(json.quote); setLineItems(json.line_items||[]); setAdjustments(json.adjustments||[]); setTotals(json.totals||null); setFiles(json.documents||[]); setCertifications(json.certifications||[]);
      })
      .finally(()=> setLoading(false));
  }, []);

  const canEdit = quote?.can_edit;

  async function updateLineItem(id, patch){
    const resp = await fetch(`/api/admin/quotes/${quote.id}/line-items`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line_item_id: id, updates: patch }) });
    const json = await resp.json();
    if (json?.success){
      setLineItems(items => items.map(it => it.id === id ? json.line_item : it));
      setTotals(json.totals || totals);
    }
  }

  async function addAdjustment(payload){
    const resp = await fetch(`/api/admin/quotes/${quote.id}/adjustments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await resp.json();
    if (json?.success){ setAdjustments(a => [...a, json.adjustment]); setTotals(json.totals || totals); }
  }

  async function deleteAdjustment(id){
    const resp = await fetch(`/api/admin/quotes/${quote.id}/adjustments/${id}`, { method: 'DELETE' });
    const json = await resp.json();
    if (json?.success){ setAdjustments(a => a.filter(x => x.id !== id)); setTotals(json.totals || totals); }
  }

  async function changeDelivery(speed){
    const resp = await fetch(`/api/admin/quotes/${quote.id}/delivery`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery_speed: speed }) });
    const json = await resp.json();
    if (json?.success){ setQuote(q => ({ ...q, delivery_speed: speed, delivery_date: json.delivery_date })); setTotals(json.totals || totals); }
  }

  async function sendToCustomer(){
    const resp = await fetch(`/api/admin/quotes/${quote.id}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '' }) });
    const json = await resp.json();
    if (json?.success){ setQuote(q => ({ ...q, quote_state: 'sent' })); }
  }

  if (loading) return (
    <AdminLayout title="Quote" initialAdmin={initialAdmin}>
      <div className="rounded bg-white p-6">Loading...</div>
    </AdminLayout>
  );

  if (!quote) return (
    <AdminLayout title="Quote" initialAdmin={initialAdmin}>
      <div className="rounded bg-white p-6">Not found</div>
    </AdminLayout>
  );

  return (
    <AdminLayout title={`Quote ${quote.order_id}`} initialAdmin={initialAdmin}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded border bg-white p-4">
            <div className="mb-2 text-sm text-gray-600">{quote.customer_name} • {quote.customer_email}</div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-700">
              <div>Source: <span className="font-medium">{quote.source_language||'—'}</span></div>
              <div>Target: <span className="font-medium">{quote.target_language||'—'}</span></div>
              <div>Intended Use: <span className="font-medium">{quote.intended_use||'—'}</span></div>
            </div>
          </div>

          <FileManager quoteId={quote.id} initialFiles={files} canEdit={canEdit} onChange={(c)=>{ if (c?.totals) setTotals(c.totals); fetch(`/api/admin/quotes/${quote.id}`).then(r=>r.json()).then(j=>{ setFiles(j.documents||[]); setLineItems(j.line_items||[]); setCertifications(j.certifications||[]); setTotals(j.totals||null); }); }} />

          <div className="rounded border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-2 font-semibold">
              <div>Line Items</div>
              {canEdit && <button className="rounded border px-3 py-1 text-sm" onClick={()=> setShowManual(true)}>+ Add Manual Line Item</button>}
            </div>
            <div className="p-4 space-y-3">
              {lineItems.map(it => {
                const effectiveRate = ((it.unit_rate_override ?? it.unit_rate) ?? 0);
                const computedLineTotal = (Number(effectiveRate) * Number(it.billable_pages || 0)) + Number(it.certification_amount || 0);
                const displayTotal = Number(it.line_total ?? computedLineTotal);
                return (
                  <div key={it.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{it.filename || it.doc_type || 'Document'}</div>
                        <div className="text-xs text-gray-500">{it.total_pages ? `${it.total_pages} pages` : null}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{Number(it.billable_pages||0)} billable page(s)</div>
                        <div className="font-semibold">${displayTotal.toFixed(2)}</div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <Field label="Billable Pages">
                          <input type="number" step="0.1" defaultValue={it.billable_pages} className="w-full rounded border px-2 py-1" onBlur={e=> updateLineItem(it.id, { billable_pages: e.target.value })} />
                        </Field>
                        <Field label="Unit Rate ($)">
                          <input type="number" step="0.01" defaultValue={it.unit_rate} className="w-full rounded border px-2 py-1" onBlur={e=> updateLineItem(it.id, { unit_rate: e.target.value })} />
                        </Field>
                        <Field label="Override Rate ($)">
                          <input type="number" step="0.01" defaultValue={it.unit_rate_override || ''} placeholder="optional" className="w-full rounded border px-2 py-1" onBlur={e=> updateLineItem(it.id, { unit_rate_override: e.target.value || null })} />
                        </Field>
                        <Field label="Override Reason">
                          <input type="text" defaultValue={it.override_reason || ''} className="w-full rounded border px-2 py-1" onBlur={e=> updateLineItem(it.id, { override_reason: e.target.value || null })} />
                        </Field>
                        <Field label="Certification Amount ($)">
                          <input type="number" step="0.01" defaultValue={it.certification_amount || 0} className="w-full rounded border px-2 py-1" onBlur={e=> updateLineItem(it.id, { certification_amount: e.target.value })} />
                        </Field>
                      </div>
                    )}
                  </div>
                );
              })}
              {lineItems.length === 0 && <div className="text-sm text-gray-500">No line items</div>}
            </div>
          </div>

          <CertificationsManager quoteId={quote.id} initialCertifications={certifications} files={files} canEdit={canEdit} onChange={(c)=>{ if (c?.totals) setTotals(c.totals); }} />

          <div className="rounded border bg-white">
            <div className="border-b px-4 py-2 font-semibold">Adjustments</div>
            <div className="p-4 space-y-3">
              {adjustments.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded border p-3 text-sm">
                  <div>
                    <div className="font-medium">{a.type}: {a.description}</div>
                    {a.discount_type && <div className="text-xs text-gray-500">{a.discount_type} {a.discount_value}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">{a.type==='discount' ? '-' : ''}${Number(a.total_amount||0).toFixed(2)}</div>
                    {canEdit && <button className="text-red-600 text-xs" onClick={()=> deleteAdjustment(a.id)}>Delete</button>}
                  </div>
                </div>
              ))}
              {canEdit && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="rounded border px-3 py-1 text-sm" onClick={()=> addAdjustment({ type:'additional_item', description:'Custom item', quantity:1, unit_amount:50, is_taxable:true })}>+ Add Item</button>
                  <button className="rounded border px-3 py-1 text-sm" onClick={()=> addAdjustment({ type:'discount', description:'Manual discount', discount_type:'percentage', discount_value:10, is_taxable:false })}>+ Add Discount</button>
                  <button className="rounded border px-3 py-1 text-sm" onClick={()=> addAdjustment({ type:'surcharge', description:'Rush surcharge', discount_type:'fixed', discount_value:25, is_taxable:true })}>+ Add Surcharge</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            <div className="rounded border bg-white p-4">
              <div className="mb-2 text-sm font-semibold">Pricing Summary</div>
              <SummaryRow label="Translation" value={`$${Number(totals?.translation || 0).toFixed(2)}`} />
              <SummaryRow label="Certification" value={`$${Number(totals?.certification || 0).toFixed(2)}`} />
              <div className="my-2 border-t" />
              <SummaryRow label="Subtotal" value={`$${Number(totals?.subtotal || 0).toFixed(2)}`} />
              <SummaryRow label="Tax" value={`$${Number(totals?.tax || 0).toFixed(2)}`} />
              <div className="my-2 border-t" />
              <SummaryRow label="Total" value={`$${Number(totals?.total || 0).toFixed(2)}`} />
            </div>

            <div className="rounded border bg-white p-4">
              <div className="mb-2 text-sm font-semibold">Delivery</div>
              <select disabled={!canEdit} className="w-full rounded border px-2 py-2 text-sm" value={quote.delivery_speed || 'standard'} onChange={e=> changeDelivery(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="rush">Rush</option>
              </select>
              <div className="mt-2 text-sm text-gray-600">Estimated: {quote.delivery_date ? new Date(quote.delivery_date).toLocaleDateString() : '—'}</div>
            </div>

            <div className="rounded border bg-white p-4 space-y-2">
              <button disabled={!canEdit} className="w-full rounded bg-cyan-600 px-3 py-2 text-white disabled:opacity-50" onClick={sendToCustomer}>Send to Customer</button>
              <a className="w-full rounded border px-3 py-2 text-center text-sm" href={`/quote-review?id=${encodeURIComponent(quote.order_id)}`} target="_blank" rel="noreferrer">View as Customer</a>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
