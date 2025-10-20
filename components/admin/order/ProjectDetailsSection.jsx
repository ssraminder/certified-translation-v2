import { useState } from 'react';

const serviceTypes = ['Translation', 'Certification', 'Notarization', 'Interpretation'];
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

export default function ProjectDetailsSection({ order, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    service_type: order.service_type || '',
    source_language: order.source_language || '',
    target_language: order.target_language || '',
    document_type: order.document_type || '',
    page_count: order.page_count || null,
    word_count: order.word_count || null,
    urgency: order.urgency || '',
    assigned_to: order.assigned_to || '',
    due_date: order.due_date || '',
    project_status: order.project_status || '',
    special_instructions: order.special_instructions || '',
    internal_notes: order.internal_notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Project Information</h2>
        <button
          onClick={() => {
            if (isEditing) {
              setFormData({
                service_type: order.service_type || '',
                source_language: order.source_language || '',
                target_language: order.target_language || '',
                document_type: order.document_type || '',
                page_count: order.page_count || null,
                word_count: order.word_count || null,
                urgency: order.urgency || '',
                assigned_to: order.assigned_to || '',
                due_date: order.due_date || '',
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

      <div className="grid grid-cols-2 gap-6">
        {/* Service Type */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Service Type <span className="text-red-500">*</span>
          </label>
          {isEditing ? (
            <select
              value={formData.service_type}
              onChange={(e) => handleChange('service_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {serviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          ) : (
            <p className="text-gray-900">{formData.service_type}</p>
          )}
        </div>

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
            <p className="text-gray-900">{formData.source_language}</p>
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
            <p className="text-gray-900">{formData.target_language}</p>
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
              {documentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          ) : (
            <p className="text-gray-900">{formData.document_type}</p>
          )}
        </div>

        {/* Page Count */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Number of Pages
          </label>
          {isEditing ? (
            <input
              type="number"
              value={formData.page_count}
              onChange={(e) => handleChange('page_count', parseInt(e.target.value))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{formData.page_count}</p>
          )}
        </div>

        {/* Word Count */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Word Count
          </label>
          {isEditing ? (
            <input
              type="number"
              value={formData.word_count}
              onChange={(e) => handleChange('word_count', parseInt(e.target.value))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{formData.word_count.toLocaleString()}</p>
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
              {urgencyLevels.find(l => l.value === formData.urgency)?.label || formData.urgency}
            </p>
          )}
        </div>

        {/* Assigned To */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Assigned To
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.assigned_to}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Select translator"
            />
          ) : (
            <p className="text-gray-900">{formData.assigned_to || '—'}</p>
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
              {formData.due_date ? new Date(formData.due_date).toLocaleDateString() : '—'}
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
              {statuses.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          ) : (
            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(formData.project_status)}`}>
              {statuses.find(s => s.value === formData.project_status)?.label || formData.project_status}
            </span>
          )}
        </div>
      </div>

      {/* Full Width Fields */}
      <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
        {/* Special Instructions */}
        <div>
          <label className="block text-xs uppercase text-gray-500 font-medium mb-2">
            Special Instructions (Visible to translator)
          </label>
          {isEditing ? (
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
          ) : (
            <p className="text-gray-900">{formData.special_instructions || '—'}</p>
          )}
        </div>

        {/* Internal Notes */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <label className="block text-xs uppercase text-gray-500 font-medium">
              Internal Notes (PM only - not visible to customer or translator)
            </label>
          </div>
          {isEditing ? (
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
          ) : (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-3 text-sm text-gray-900">
              {formData.internal_notes || '—'}
            </div>
          )}
        </div>
      </div>

      {/* Save Bar */}
      {isEditing && (
        <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between bg-blue-50 -m-6 px-6 py-3 rounded-b-lg">
          <p className="text-sm text-blue-900">You have unsaved changes</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFormData({
                  service_type: order.service_type || '',
                  source_language: order.source_language || '',
                  target_language: order.target_language || '',
                  document_type: order.document_type || '',
                  page_count: order.page_count || null,
                  word_count: order.word_count || null,
                  urgency: order.urgency || '',
                  assigned_to: order.assigned_to || '',
                  due_date: order.due_date || '',
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
    </div>
  );
}
