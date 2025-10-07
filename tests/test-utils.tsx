import React from 'react';
import { render } from '@testing-library/react';

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui);
}

export const mockAnalysisRun = {
  run_id: 'test-run-id',
  quote_id: 'test-quote-id',
  status: 'ready',
  n8n_status: 'ready',
  created_at: '2025-10-07T22:00:00Z',
  updated_at: '2025-10-07T22:05:00Z'
};

export const mockDocuments = [
  {
    filename: 'test.pdf',
    document_type: 'Birth Certificate',
    language: 'English',
    pages: 2,
    billable_pages: 2.5,
    confidence_score: 0.95,
    line_total: 175.0,
  },
];
