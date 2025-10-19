import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { getServerSideAdminWithPermission } from '../../../lib/withAdminPage';
import ManualLineItemForm from '../../../components/admin/ManualLineItemForm';
import AdditionalItemModal from '../../../components/admin/adjustments/AdditionalItemModal';
import DiscountModal from '../../../components/admin/adjustments/DiscountModal';
import SurchargeModal from '../../../components/admin/adjustments/SurchargeModal';
import CertificationsManager from '../../../components/admin/CertificationsManager';
import EditQuoteHeaderModal from '../../../components/admin/EditQuoteHeaderModal';
import EditLineItemModal from '../../../components/admin/EditLineItemModal';
import DocumentUploadSection from '../../../components/admin/DocumentUploadSection';
import CustomerDetailsCard from '../../../components/admin/CustomerDetailsCard';
import QuoteNumberCard from '../../../components/admin/QuoteNumberCard';
import OrderDetailsCard from '../../../components/admin/OrderDetailsCard';
import SendMagicLinkModal from '../../../components/admin/SendMagicLinkModal';

export const getServerSideProps = getServerSideAdminWithPermission('quotes','view');

export default function Page({ initialAdmin }){
  const [quote, setQuote] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [totals, setTotals] = useState(null);
  const [files, setFiles] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showSurcharge, setShowSurcharge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEditHeader, setShowEditHeader] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditLine, setShowEditLine] = useState(false);
  const [showSendMagicLink, setShowSendMagicLink] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

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
  const isSent = quote?.quote_state === 'sent';

  async function refetchFiles(){
    const id = quote.id;
    try {
      const resp = await fetch(`/api/admin/quotes/${id}`);
      const json = await resp.json();
      if (json?.documents){
        setFiles(json.documents);
      }
    } catch (err) {
      console.error('Error refetching files:', err);
    }
  }

  async function updateLineItem(id, patch){
    const resp = await fetch(`/api/admin/quotes/${quote.id}/line-items`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line_item_id: id, updates: patch }) });
    const json = await resp.json();
    if (json?.success){
      setLineItems(items => items.map(it => it.id === id ? json.line_item : it));
      setTotals(json.totals || totals);
    }
  }

  async function addAdjustment(payload){
    try {
      const resp = await fetch(`/api/admin/quotes/${quote.id}/adjustments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      let json = null;
      try { json = await resp.json(); } catch { json = { error: 'Invalid response' }; }
      if (!resp.ok || !json?.success){ throw new Error(json?.error || `Request failed (${resp.status})`); }
      setAdjustments(a => [...a, json.adjustment]); setTotals(json.totals || totals);
    } catch (e) {
      alert(`Failed to add adjustment: ${e.message}`);
    }
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

  async function updateDeliveryDate(dateString){
    const resp = await fetch(`/api/admin/quotes/${quote.id}/delivery`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery_date: new Date(dateString).toISOString() }) });
    const json = await resp.json();
    if (json?.success){ setQuote(q => ({ ...q, delivery_date: json.delivery_date })); setTotals(json.totals || totals); }
  }

  async function sendToCustomer(){
    try {
      const resp = await fetch(`/api/admin/quotes/send-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quote.id, recipient_email: quote.customer_email })
      });
      const json = await resp.json();
      if (!resp.ok) {
        alert(`Error: ${json.error || 'Failed to send quote'}`);
        return;
      }
      if (json?.success){
        setQuote(q => ({ ...q, quote_state: 'sent' }));
        alert('Quote sent successfully with magic link!');
      }
    } catch (err) {
      alert(`Error sending quote: ${err.message}`);
    }
  }

  async function editAndResend(){
    try {
      const stateResp = await fetch(`/api/admin/quotes/${quote.id}/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_state: 'under_review' }) });
      const stateJson = await stateResp.json();
      if (!stateResp.ok) throw new Error(stateJson?.error || 'Failed to change state');
      setQuote(q => ({ ...q, quote_state: 'under_review', can_edit: true }));
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  }

  if (loading) return (
    <AdminLayout title="Quote" initialAdmin={initialAdmin}>
      <div className="rounded-xl bg-white p-6">Loading...</div>
    </AdminLayout>
  );

  if (!quote) return (
    <AdminLayout title="Quote" initialAdmin={initialAdmin}>
      <div className="rounded-xl bg-white p-6">Not found</div>
    </AdminLayout>
  );

  const additionalItems = adjustments.filter(a=>a.type==='additional_item');
  const discounts = adjustments.filter(a=>a.type==='discount');
  const surcharges = adjustments.filter(a=>a.type==='surcharge');

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  const handleEdit = () => { setShowEditHeader(true); };

  return (
    <AdminLayout title="Quote Details" initialAdmin={initialAdmin}>
      {/* Quote Number Card */}
      <QuoteNumberCard quote={quote} />

      {/* Customer Details Card */}
      <CustomerDetailsCard quote={quote} onEdit={() => setShowEditHeader(true)} />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - 65% */}
        <div className="flex-1 lg:w-[65%] space-y-8">

          {/* Order Details Card */}
          <OrderDetailsCard quote={quote} certifications={certifications} />

          {/* Document Upload Section */}
          <DocumentUploadSection
            quoteId={quote?.id}
            initialFiles={uploadedFiles}
            onFilesChange={setUploadedFiles}
            canEdit={canEdit}
          />

          {/* Line Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base">Line Items</h2>
              {canEdit && (
                <button onClick={()=> setShowManual(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M4.287 8h9.333M8.953 3.333v9.334"/>
                  </svg>
                  Add Manual Line Item
                </button>
              )}
            </div>
            <div className="space-y-3">
              {lineItems.map(it => {
                const effectiveRate = ((it.unit_rate_override ?? it.unit_rate) ?? 0);
                const computedLineTotal = (Number(effectiveRate) * Number(it.billable_pages || 0));
                return (
                  <div key={it.id} className="p-4 rounded-xl border bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.67} d="M12.5 1.667H5c-.442 0-.866.175-1.179.488A1.667 1.667 0 003.333 3.333v13.334c0 .442.176.866.488 1.179.313.313.737.487 1.179.487h10c.442 0 .866-.174 1.179-.487.313-.313.488-.737.488-1.179V5.833l-4.167-4.166z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.67} d="M11.667 1.667v3.333c0 .442.175.866.488 1.179.313.313.737.488 1.179.488h3.333M8.333 7.5h-1.666M13.333 10.833H6.667M13.333 14.167H6.667"/>
                        </svg>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{it.filename || it.doc_type || 'Document'}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Pages: {it.total_pages||it.billable_pages} | Billable: {it.billable_pages} | Rate: ${Number(effectiveRate).toFixed(2)}/page
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">Total: ${computedLineTotal.toFixed(2)}</p>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button className="p-2 rounded-lg hover:bg-gray-100" onClick={()=> { setEditingItem(it); setShowEditLine(true); }}>
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 2H3.333c-.353 0-.692.14-.942.39A1.333 1.333 0 002 3.333v9.334c0 .353.14.692.39.942.25.25.59.39.943.39h9.334c.353 0 .692-.14.942-.39.25-.25.39-.59.39-.943V8"/>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M12.25 1.75a1.414 1.414 0 112 2L8.24 9.76a2 2 0 01-.568.403l-1.916.56a.333.333 0 01-.408-.408l.56-1.915a2 2 0 01.403-.569l6.01-6.009z"/>
                            </svg>
                          </button>
                          <button onClick={async ()=>{ const r = await fetch(`/api/admin/quotes/${quote.id}/line-items/${it.id}`, { method:'DELETE' }); const j = await r.json(); if (j?.success){ setLineItems(list=> list.filter(x=> x.id !== it.id)); if (j.totals) setTotals(j.totals); } }} className="p-2 rounded-lg hover:bg-gray-100">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M6.667 7.333v4M9.333 7.333v4M12.667 4v9.333c0 .354-.14.693-.391.943-.25.25-.589.391-.943.391H4.667c-.354 0-.693-.14-.943-.391a1.333 1.333 0 01-.391-.943V4M2 4h12M5.333 4V2.667c0-.354.14-.694.391-.944.25-.25.59-.39.943-.39h2.666c.354 0 .694.14.944.39.25.25.39.59.39.944V4"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {lineItems.length === 0 && <p className="text-sm text-gray-500">No line items</p>}
            </div>
          </div>

          {/* Certifications Section */}
          <CertificationsManager
            quoteId={quote.id}
            initialCertifications={certifications}
            files={files}
            canEdit={canEdit}
            onChange={(res)=> { if (res?.totals) setTotals(res.totals); }}
          />

          {/* Adjustments Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base">Adjustments</h2>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button onClick={()=> setShowAddItem(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M4.185 8h9.333M8.852 3.333v9.334"/>
                    </svg>
                    Add Item
                  </button>
                  <button onClick={()=> setShowDiscount(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M3.474 8h9.333M8.14 3.333v9.334"/>
                    </svg>
                    Add Discount
                  </button>
                  <button onClick={()=> setShowSurcharge(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M4.216 8h9.334M8.883 3.333v9.334"/>
                    </svg>
                    Add Surcharge
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Additional Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Additional Items:</h3>
                {additionalItems.length > 0 ? (
                  <div className="space-y-3">
                    {additionalItems.map(a => (
                      <div key={a.id} className="p-4 rounded-xl border bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.67} d="M9.167 18.108a1.667 1.667 0 001.666 0l5.834-3.333a1.667 1.667 0 00.833-1.442V6.667c0-.507-.183-.994-.515-1.358a1.667 1.667 0 00-.318-.308L10.833 1.892a1.667 1.667 0 00-1.666 0L3.333 5.225a1.667 1.667 0 00-.833 1.442v6.666c0 .508.183.995.515 1.359.118.13.256.24.408.324l5.744 3.092zM10 18.333V10M2.742 5.833L10 10l7.258-4.167M6.25 3.558L13.75 7.85"/>
                            </svg>
                            <div>
                              <h4 className="font-medium text-gray-900">{a.description}</h4>
                              <p className="text-sm text-gray-600 mt-1">Amount: ${Number(a.total_amount||0).toFixed(2)}</p>
                              {a.notes && <p className="text-sm text-gray-500 mt-1">{a.notes}</p>}
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <button className="p-2 rounded-lg hover:bg-gray-100">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 2H3.333c-.353 0-.692.14-.942.39A1.333 1.333 0 002 3.333v9.334c0 .353.14.692.39.942.25.25.59.39.943.39h9.334c.353 0 .692-.14.942-.39.25-.25.39-.59.39-.943V8M12.25 1.75a1.414 1.414 0 112 2L8.24 9.76a2 2 0 01-.568.403l-1.916.56a.333.333 0 01-.408-.408l.56-1.915a2 2 0 01.403-.569l6.01-6.009z"/>
                                </svg>
                              </button>
                              <button onClick={()=> deleteAdjustment(a.id)} className="p-2 rounded-lg hover:bg-gray-100">
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
                ) : null}
              </div>

              {/* Discounts */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Discounts:</h3>
                {discounts.length > 0 ? (
                  <div className="space-y-3">
                    {discounts.map(a => (
                      <div key={a.id} className="p-4 rounded-xl border bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.67} d="M15.833 4.167L4.167 15.833M5.417 7.5a2.083 2.083 0 100-4.167 2.083 2.083 0 000 4.167zM14.583 16.667a2.083 2.083 0 100-4.167 2.083 2.083 0 000 4.167z"/>
                            </svg>
                            <div>
                              <h4 className="font-medium text-gray-900">{a.description}</h4>
                              <p className="text-sm text-gray-600 mt-1">Type: {a.discount_type === 'percentage' ? `Percentage (${a.discount_value}%)` : `Fixed Amount`}</p>
                              <p className="text-sm text-gray-600">Applied to: ${Number(totals?.subtotal||0).toFixed(2)} subtotal = -${Number(a.total_amount||0).toFixed(2)}</p>
                              {a.notes && <p className="text-sm text-gray-500 mt-1">{a.notes}</p>}
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <button className="p-2 rounded-lg hover:bg-gray-100">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 2H3.333c-.353 0-.692.14-.942.39A1.333 1.333 0 002 3.333v9.334c0 .353.14.692.39.942.25.25.59.39.943.39h9.334c.353 0 .692-.14.942-.39.25-.25.39-.59.39-.943V8M12.25 1.75a1.414 1.414 0 112 2L8.24 9.76a2 2 0 01-.568.403l-1.916.56a.333.333 0 01-.408-.408l.56-1.915a2 2 0 01.403-.569l6.01-6.009z"/>
                                </svg>
                              </button>
                              <button onClick={()=> deleteAdjustment(a.id)} className="p-2 rounded-lg hover:bg-gray-100">
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
                ) : null}
              </div>

              {/* Surcharges */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Surcharges:</h3>
                {surcharges.length > 0 ? (
                  <div className="space-y-3">
                    {surcharges.map(a => (
                      <div key={a.id} className="p-4 rounded-xl border bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.67} d="M13.333 5.833h5v5M18.333 5.833l-7.083 7.084-4.167-4.167L1.667 14.167"/>
                            </svg>
                            <div>
                              <h4 className="font-medium text-gray-900">{a.description}</h4>
                              <p className="text-sm text-gray-600 mt-1">Type: {a.discount_type === 'percentage' ? `Percentage (${a.discount_value}%)` : `Fixed Amount`}</p>
                              <p className="text-sm text-gray-600">Applied: +${Number(a.total_amount||0).toFixed(2)}</p>
                              {a.notes && <p className="text-sm text-gray-500 mt-1">Reason: {a.notes}</p>}
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <button className="p-2 rounded-lg hover:bg-gray-100">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.33} d="M8 2H3.333c-.353 0-.692.14-.942.39A1.333 1.333 0 002 3.333v9.334c0 .353.14.692.39.942.25.25.59.39.943.39h9.334c.353 0 .692-.14.942-.39.25-.25.39-.59.39-.943V8M12.25 1.75a1.414 1.414 0 112 2L8.24 9.76a2 2 0 01-.568.403l-1.916.56a.333.333 0 01-.408-.408l.56-1.915a2 2 0 01.403-.569l6.01-6.009z"/>
                                </svg>
                              </button>
                              <button onClick={()=> deleteAdjustment(a.id)} className="p-2 rounded-lg hover:bg-gray-100">
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
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sticky Pricing Summary - 35% */}
        <div className="lg:w-[35%]">
          <div className="sticky top-4">
            <div className="rounded-xl border bg-white p-6 shadow-lg">
              <h2 className="text-base mb-4">Pricing Summary</h2>
              
              <div className="space-y-4">
                {/* Translation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Translation</span>
                    <span className="font-medium">${Number(totals?.translation || 0).toFixed(2)}</span>
                  </div>
                  <ul className="ml-4 space-y-1 text-sm text-gray-600">
                    {lineItems.map(it => {
                      const rate = Number((it.unit_rate_override ?? it.unit_rate) || 0);
                      const pages = Number(it.billable_pages||0);
                      const amount = (rate * pages);
                      return (
                        <li key={it.id} className="flex items-center justify-between">
                          <span>• {(it.filename || it.doc_type || 'Document')}</span>
                          <span>${amount.toFixed(2)}</span>
                        </li>
                      );
                    })}
                    {lineItems.length === 0 && <li className="text-gray-400">No items</li>}
                  </ul>
                </div>

                {/* Certification */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Certification</span>
                    <span className="font-medium">${Number(totals?.certification || 0).toFixed(2)}</span>
                  </div>
                  <ul className="ml-4 space-y-1 text-sm text-gray-600">
                    {(certifications||[]).map(c => {
                      const label = c.cert_type_name || 'Certification';
                      const rate = Number((c.override_rate ?? c.default_rate) || 0);
                      const isOverride = Number(c.override_rate) > 0;
                      return (
                        <li key={c.id} className="flex items-center justify-between">
                          <span>• {label}{isOverride ? ' (override)' : ''}</span>
                          <span>${rate.toFixed(2)}</span>
                        </li>
                      );
                    })}
                    {((certifications?.length||0)) === 0 && <li className="text-gray-400">No items</li>}
                  </ul>
                </div>

                {/* Additional Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Additional Items</span>
                    <span className="font-medium">${Number(additionalItems.reduce((s,a)=> s + Number(a.total_amount||0), 0)).toFixed(2)}</span>
                  </div>
                  <ul className="ml-4 space-y-1 text-sm text-gray-600">
                    {additionalItems.map(a => (
                      <li key={a.id} className="flex items-center justify-between">
                        <span>• {a.description}</span>
                        <span>${Number(a.total_amount||0).toFixed(2)}</span>
                      </li>
                    ))}
                    {additionalItems.length === 0 && <li className="text-gray-400">None</li>}
                  </ul>
                </div>

                {/* Discounts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-700">Discounts</span>
                    <span className="font-medium text-green-700">-${Number(discounts.reduce((s,a)=> s + Number(a.total_amount||0), 0)).toFixed(2)}</span>
                  </div>
                  <ul className="ml-4 space-y-1 text-sm text-gray-600">
                    {discounts.map(a => (
                      <li key={a.id} className="flex items-center justify-between">
                        <span>• {a.description}</span>
                        <span>-${Number(a.total_amount||0).toFixed(2)}</span>
                      </li>
                    ))}
                    {discounts.length === 0 && <li className="text-gray-400">None</li>}
                  </ul>
                </div>

                {/* Surcharges */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-orange-700">Surcharges</span>
                    <span className="font-medium text-orange-700">+${Number(surcharges.reduce((s,a)=> s + Number(a.total_amount||0), 0)).toFixed(2)}</span>
                  </div>
                  <ul className="ml-4 space-y-1 text-sm text-gray-600">
                    {surcharges.map(a => (
                      <li key={a.id} className="flex items-center justify-between">
                        <span>• {a.description}</span>
                        <span>+${Number(a.total_amount||0).toFixed(2)}</span>
                      </li>
                    ))}
                    {surcharges.length === 0 && <li className="text-gray-400">None</li>}
                  </ul>
                </div>
              </div>

              <div className="border-t my-4" />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-medium">${Number(totals?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Tax (0%)</span>
                  <span>${Number(totals?.tax || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t my-4" />

              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${Number(totals?.total || 0).toFixed(2)}</span>
              </div>

              <div className="border-t my-4" />

              {/* Delivery Date Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Delivery Date</label>
                <input
                  type="date"
                  disabled={!canEdit}
                  className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm disabled:opacity-50"
                  value={quote.delivery_date ? new Date(quote.delivery_date).toISOString().split('T')[0] : ''}
                  onChange={e => updateDeliveryDate(e.target.value)}
                />
              </div>

              <div className="border-t pt-4" />

              {/* Action Buttons */}
              <div className="space-y-2">
                {isSent ? (
                  <>
                    <button onClick={editAndResend} className="w-full rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-white text-sm font-medium">
                      Edit Quote
                    </button>
                    <button onClick={() => setShowSendMagicLink(true)} className="w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
                      Copy & Send Link
                    </button>
                    <p className="text-xs text-gray-500 text-center">Edit quote to make changes. Use copy link to share with customer.</p>
                  </>
                ) : (
                  <>
                    <button disabled={!canEdit} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white text-sm font-medium disabled:opacity-50" onClick={async ()=>{ const r = await fetch(`/api/admin/quotes/${quote.id}`); const j = await r.json(); if (j?.totals) setTotals(j.totals); }}>
                      Confirm and Update Summary
                    </button>
                    <button disabled={!canEdit} onClick={sendToCustomer} className="w-full rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
                      Send to Customer
                    </button>
                  </>
                )}
                <a href={`/quote-review?id=${encodeURIComponent(quote.order_id)}`} target="_blank" rel="noreferrer" className="block w-full rounded-lg border px-4 py-2 text-center text-sm font-medium">
                  View as Customer
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditQuoteHeaderModal
        open={showEditHeader}
        onClose={()=> setShowEditHeader(false)}
        quote={quote}
        onSaved={(updated)=> setQuote(q=> ({ ...q, ...updated }))}
      />
      <ManualLineItemForm open={showManual} onClose={()=> setShowManual(false)} quoteId={quote.id} files={files} onCreated={(li, t)=> { setLineItems(list => [...list, li]); if (t) setTotals(t); }} />
      <AdditionalItemModal
        open={showAddItem}
        onClose={()=> setShowAddItem(false)}
        onSubmit={async ({ description, amount }) => {
          setShowAddItem(false);
          await addAdjustment({ type: 'additional_item', description, quantity: 1, unit_amount: amount, is_taxable: true });
        }}
      />
      <DiscountModal
        open={showDiscount}
        onClose={()=> setShowDiscount(false)}
        subtotal={Number(totals?.subtotal||0)}
        onSubmit={async ({ description, discount_type, discount_value }) => {
          setShowDiscount(false);
          await addAdjustment({ type:'discount', description, discount_type, discount_value, subtotal: Number(totals?.subtotal||0), is_taxable:false });
        }}
      />
      <SurchargeModal
        open={showSurcharge}
        onClose={()=> setShowSurcharge(false)}
        subtotal={Number(totals?.subtotal||0)}
        onSubmit={async ({ description, discount_type, discount_value }) => {
          setShowSurcharge(false);
          await addAdjustment({ type:'surcharge', description, discount_type, discount_value, subtotal: Number(totals?.subtotal||0), is_taxable:true });
        }}
      />
      <EditLineItemModal
        open={showEditLine}
        onClose={()=> { setShowEditLine(false); setEditingItem(null); }}
        lineItem={editingItem}
        onSave={async (patch)=> { if (editingItem) await updateLineItem(editingItem.id, patch); }}
      />
      <SendMagicLinkModal
        open={showSendMagicLink}
        onClose={()=> setShowSendMagicLink(false)}
        quoteId={quote?.id}
        customerEmail={quote?.customer_email}
        customerName={quote?.customer_name}
      />
    </AdminLayout>
  );
}
