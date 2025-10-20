const FILE_PURPOSE_LABELS = {
  'translate': 'To Translate',
  'reference': 'Reference Material',
  'draft_translation': 'Draft Translation',
  'final_translation': 'Final Translation',
  'certified_copy': 'Certified Copy',
  'template': 'Template',
  'glossary': 'Glossary',
  'certification': 'Certification',
  'already_translated': 'Already Translated',
  'notes': 'Notes'
};

const FILE_PURPOSE_COLORS = {
  'translate': 'bg-blue-50 border-blue-200 text-blue-900',
  'reference': 'bg-purple-50 border-purple-200 text-purple-900',
  'draft_translation': 'bg-amber-50 border-amber-200 text-amber-900',
  'final_translation': 'bg-green-50 border-green-200 text-green-900',
  'certified_copy': 'bg-green-50 border-green-200 text-green-900',
  'template': 'bg-indigo-50 border-indigo-200 text-indigo-900',
  'glossary': 'bg-cyan-50 border-cyan-200 text-cyan-900',
  'certification': 'bg-pink-50 border-pink-200 text-pink-900',
  'already_translated': 'bg-gray-50 border-gray-200 text-gray-900',
  'notes': 'bg-gray-50 border-gray-200 text-gray-900'
};

export function getFilePurposeLabel(purpose) {
  return FILE_PURPOSE_LABELS[purpose] || (purpose ? purpose.replace(/_/g, ' ').charAt(0).toUpperCase() + purpose.slice(1).replace(/_/g, ' ') : 'Document');
}

export function getFilePurposeColor(purpose) {
  return FILE_PURPOSE_COLORS[purpose] || 'bg-gray-50 border-gray-200 text-gray-900';
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}
