import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import AnalysisResultsModal from '../../../components/AnalysisResultsModal';

function mockFetchSequence(seq: any[]) {
  const fn = jest.fn();
  seq.forEach(v => fn.mockResolvedValueOnce(v));
  // @ts-ignore
  global.fetch = fn;
  return fn;
}

describe('AnalysisResultsModal', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); jest.resetAllMocks(); });

  it('shows loading then results when ready', async () => {
    mockFetchSequence([
      // status pending
      { ok: true, json: async () => ({ status: 'pending' }), headers: new Headers({ 'content-type': 'application/json' }) },
      // status ready
      { ok: true, json: async () => ({ status: 'ready' }), headers: new Headers({ 'content-type': 'application/json' }) },
      // results
      { ok: true, json: async () => ({ documents: [{ filename: 'a.pdf', document_type: 'X', pages: 2, billable_pages: 2.5 }] }), headers: new Headers({ 'content-type': 'application/json' }) },
    ]);

    render(<AnalysisResultsModal open quoteId="q1" runId="r1" onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText(/Processing/i)).toBeInTheDocument());
    await act(async () => { jest.advanceTimersByTime(2000); });
    await waitFor(() => expect(screen.getByText(/Documents/i)).toBeInTheDocument());
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
  });

  it('handles missing runId gracefully', async () => {
    render(<AnalysisResultsModal open quoteId="q1" runId={null} onClose={jest.fn()} />);
    expect(screen.getByText(/Missing run ID/i)).toBeInTheDocument();
  });

  it('disables action button while not ready', async () => {
    mockFetchSequence([
      { ok: true, json: async () => ({ status: 'pending' }), headers: new Headers({ 'content-type': 'application/json' }) },
    ]);
    render(<AnalysisResultsModal open quoteId="q1" runId="r1" onClose={jest.fn()} />);
    const useBtn = await screen.findByRole('button', { name: /Use Analysis/i });
    expect(useBtn).toBeDisabled();
  });
});
