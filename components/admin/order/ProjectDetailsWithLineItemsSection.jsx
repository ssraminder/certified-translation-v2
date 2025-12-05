import { useState, useEffect } from 'react';
import { toDateInputFormat, toISOString, formatDateForDisplay } from '../../../lib/dateUtils';
import EditLineItemModal from '../EditLineItemModal';

const documentTypes = ['Academic', 'Legal', 'Medical', 'Business', 'Personal', 'Other'];
const urgencyLevels = [
  { value: 'standard', label: 'Standard (2-3 days)' },
  { value: 'rush', label: 'Rush (24 hours)' },
  { value: 'express', label: 'Express (12 hours)' },
];
const statuses = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_translation', label: 'In Translation', color: 'bg-blue-100 text-blue-800' },
  { value: 'quality_review', label: 'Quality Review', color: 'bg-orange-100 text-orange-800' },
  { value: 'complete', label: 'Complete', color: 'bg-green-100 text-green-800' },
];

export default function ProjectDetailsWithLineItemsSection({ order, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    source_language: order.source_language || '',
    target_language: order.target_language || '',
    document_type: order.document_type || '',
    page_count: order.page_count || null,
    word_count: order.word_count || null,
    urgency: order.urgency || '',
    due_date: toDateInputFormat(order.due_date) || '',
    project_status: order.project_status || '',
    special_instructions: order.special_instructions || '',
    internal_notes: order.internal_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [loadingLineItems, setLoadingLineItems] = useState(true);
  const [lineItemError, setLineItemError] = useState('');
  const [editingLineItem, setEditingLineItem] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (order?.quote_id) {
      fetchLineItems();
    } else {
      setLoadingLineItems(false);
    }
  }, [order?.quote_id]);

  const fetchLineItems = async () => {
    try {
      setLoadingLineItems(true);
      const resp = await fetch(`/api/orders/${order.id}/ocr-analysis`);
      if (!resp.ok) {
        throw new Error('Failed to fetch line items');
      }
      const data = await resp.json();
      const items = data.quote_sub_orders || [];
      setLineItems(items);
      setLineItemError('');
    } catch (err) {
      console.error('Error fetching line items:', err);
      setLineItemError(err.message);
    } finally {
      setLoadingLineItems(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        due_date: formData.due_date ? toISOString(formData.due_date) : null,
      };

      const resp = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (!resp.ok) throw new Error('Failed to update');
      const data = await resp.json();
      onUpdate(data.order);
      setIsEditing(false);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const s = statuses.find(st => st.value === status);
    return s ? s.color : 'bg-gray-100 text-gray-800';
  };

  const calculateTotals = () => {
    const totalPages = lineItems.reduce((sum, item) => sum + (parseFloat(item.billable_pages) || 0), 0);
    const totalWords = lineItems.reduce((sum, item) => sum + (parseInt(item.word_count) || 0), 0);
    return { totalPages, totalWords };
  };

  const { totalPages, totalWords } = calculateTotals();
  const isSingleLineItem = lineItems.length === 1;

  const handleLineItemSave = async (patch) => {
    if (!editingLineItem) return;

    try {
      const resp = await fetch(
        `/api/admin/quotes/${order.quote_id}/line-items`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            line_item_id: editingLineItem.id,
            updates: patch,
          }),
        }
      );

      if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.error || 'Failed to update line item');
      }

      const data = await resp.json();

      setLineItems(prev =>
        prev.map(item =>
          item.id === editingLineItem.id ? { ...item, ...patch } : item
        )
      );
      setEditingLineItem(null);
    } catch (err) {
      alert('Error updating line item: ' + err.message);
    }
  };

  const toggleRowExpansion = (itemId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Project Details</h2>
        <button
          onClick={() => {
            if (isEditing) {
              setFormData({
                source_language: order.source_language || '',
                target_language: order.target_language || '',
                document_type: order.document_type || '',
                page_count: order.page_count || null,
                word_count: order.word_count || null,
                urgency: order.urgency || '',
                due_date: toDateInputFormat(order.due_date) || '',
                project_status: order.project_status || '',
                special_instructions: order.special_instructions || '',
                internal_notes: order.internal_notes || '',
              });
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Project Info Grid */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Source Language */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Source Language <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.source_language}
              onChange={(e) => handleChange('source_language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Hindi, Spanish"
            />
          ) : (
            <p className="text-gray-900">{formData.source_language || '—'}</p>
          )}
        </div>

        {/* Target Language */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Target Language <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.target_language}
              onChange={(e) => handleChange('target_language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., English"
            />
          ) : (
            <p className="text-gray-900">{formData.target_language || '—'}</p>
          )}
        </div>

        {/* Document Type */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Document Type
          </label>
          {isEditing ? (
            <select
              value={formData.document_type}
              onChange={(e) => handleChange('document_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Document Type</option>
              {documentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          ) : (
            <p className="text-gray-900">{formData.document_type || '—'}</p>
          )}
        </div>

        {/* Urgency Level */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Urgency Level
          </label>
          {isEditing ? (
            <div className="space-y-2">
              {urgencyLevels.map(level => (
                <label key={level.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="urgency"
                    value={level.value}
                    checked={formData.urgency === level.value}
                    onChange={(e) => handleChange('urgency', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{level.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-900">
              {formData.urgency ? (urgencyLevels.find(l => l.value === formData.urgency)?.label || formData.urgency) : '—'}
            </p>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Due Date
          </label>
          {isEditing ? (
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">
              {formatDateForDisplay(order.due_date)}
            </p>
          )}
        </div>

        {/* Project Status */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Project Status
          </label>
          {isEditing ? (
            <select
              value={formData.project_status}
              onChange={(e) => handleChange('project_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Status</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          ) : (
            formData.project_status ? (
              <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(formData.project_status)}`}>
                {statuses.find(s => s.value === formData.project_status)?.label || formData.project_status}
              </span>
            ) : (
              <p className="text-gray-900">—</p>
            )
          )}
        </div>
      </div>

      {/* Save Bar for Project Details */}
      {isEditing && (
        <div className="mb-8 pt-6 border-t border-gray-200 flex items-center justify-between bg-blue-50 -m-6 px-6 py-3 rounded-t-lg">
          <p className="text-sm text-blue-900">You have unsaved changes</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFormData({
                  source_language: order.source_language || '',
                  target_language: order.target_language || '',
                  document_type: order.document_type || '',
                  page_count: order.page_count || null,
                  word_count: order.word_count || null,
                  urgency: order.urgency || '',
                  due_date: toDateInputFormat(order.due_date) || '',
                  project_status: order.project_status || '',
                  special_instructions: order.special_instructions || '',
                  internal_notes: order.internal_notes || '',
                });
                setIsEditing(false);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Full Width Fields */}
      {isEditing && (
        <div className="mb-8 space-y-6">
          {/* Special Instructions */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
              Special Instructions (Visible to translator)
            </label>
            <div>
              <textarea
                value={formData.special_instructions}
                onChange={(e) => handleChange('special_instructions', e.target.value)}
                rows="4"
                maxLength="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.special_instructions.length}/1000 characters
              </p>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <label className="block text-xs uppercase text-gray-500 font-medium">
                Internal Notes (PM only)
              </label>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3">
              <textarea
                value={formData.internal_notes}
                onChange={(e) => handleChange('internal_notes', e.target.value)}
                rows="3"
                maxLength="2000"
                className="w-full px-0 py-0 border-0 bg-transparent text-gray-900 focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                {formData.internal_notes.length}/2000 characters
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="my-8 border-t border-gray-200" />

      {/* Documents Section */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Documents ({lineItems.length})</h3>

        {loadingLineItems ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : lineItemError ? (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-600">Error loading documents: {lineItemError}</p>
          </div>
        ) : lineItems.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No documents in this order</p>
        ) : (
          <>
            {/* Line Items Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Filename</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Doc Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Pages</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Word Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Unit Rate</th>
                    {isSingleLineItem && <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium break-words max-w-xs">
                        {item.filename || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {item.doc_type || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {item.billable_pages != null ? item.billable_pages : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {item.word_count != null ? item.word_count.toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        ${item.unit_rate ? item.unit_rate.toFixed(2) : '0.00'}
                      </td>
                      {isSingleLineItem && (
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => setEditingLineItem(item)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleRowExpansion(item.id)}
                          className="inline-flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 focus:outline-none"
                          aria-label="Expand details"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${expandedRows.has(item.id) ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Row Details */}
            {expandedRows.size > 0 && (
              <div className="border border-gray-200 rounded-lg bg-gray-50 mb-4">
                {lineItems.map((item) =>
                  expandedRows.has(item.id) && (
                    <div key={`${item.id}-details`} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
                      <div className="grid grid-cols-2 gap-4">
                        {item.total_pages != null && (
                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Total Pages</p>
                            <p className="text-sm text-gray-900">{item.total_pages}</p>
                          </div>
                        )}
                        {item.line_total != null && (
                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Line Total</p>
                            <p className="text-sm text-gray-900">${item.line_total.toFixed(2)}</p>
                          </div>
                        )}
                        {item.certification_amount != null && (
                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Certification Amount</p>
                            <p className="text-sm text-gray-900">${item.certification_amount.toFixed(2)}</p>
                          </div>
                        )}
                        {item.certification_type_name && (
                          <div>
                            <p className="text-xs text-gray-600 font-semibold">Certification Type</p>
                            <p className="text-sm text-gray-900">{item.certification_type_name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Computed Totals Section */}
            <div className="border border-gray-200 rounded-lg bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-600 font-medium mb-1">
                    Total Pages
                  </label>
                  <p className="text-2xl font-bold text-blue-900">{totalPages.toFixed(2)}</p>
                  <p className="text-xs text-gray-600 mt-1">Read-only (computed)</p>
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-600 font-medium mb-1">
                    Total Words
                  </label>
                  <p className="text-2xl font-bold text-blue-900">{totalWords.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Read-only (computed)</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Line Item Modal */}
      {editingLineItem && (
        <EditLineItemModal
          lineItem={editingLineItem}
          open={!!editingLineItem}
          onClose={() => setEditingLineItem(null)}
          onSave={handleLineItemSave}
        />
      )}
    </div>
  );
}
