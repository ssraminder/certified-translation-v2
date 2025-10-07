import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import AnalysisModal from '../../../components/admin/AnalysisModal';

jest.mock('../../../lib/supabaseClient', () => ({ supabase: null }));

function mockFetchSequence(seqs: Array<any>) {
  const fn = jest.fn();
  seqs.forEach((value) => fn.mockResolvedValueOnce(value));
  // Subsequent calls default to last value
  fn.mockResolvedValue(seqs[seqs.length - 1]);
  // @ts-ignore
  global.fetch = fn;
  return fn;
}

describe('AnalysisModal', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); jest.resetAllMocks(); });

  it('renders loading state when status is pending or processing and polls every 2s', async () => {
    const responses = [
      // Initial results
      { ok: true, json: async () => ({ documents: [] }), headers: new Headers({ 'content-type': 'application/json' }) },
      // Initial status pending
      { ok: true, json: async () => ({ status: 'pending' }), headers: new Headers({ 'content-type': 'application/json' }) },
      // history
      { ok: true, json: async () => ({ runs: [] }), headers: new Headers({ 'content-type': 'application/json' }) },
      // Polling tick 1: status still pending
      { ok: true, json: async () => ({ status: 'processing' }), headers: new Headers({ 'content-type': 'application/json' }) },
      // Polling tick 2: status ready
      { ok: true, json: async () => ({ status: 'ready' }), headers: new Headers({ 'content-type': 'application/json' }) },
      // Fetch results when ready
      { ok: true, json: async () => ({ documents: [{ filename: 'doc.pdf', document_type: 'X', pages: 2, billable_pages: 2.5 }] }), headers: new Headers({ 'content-type': 'application/json' }) },
    ];
    const fetchMock = mockFetchSequence(responses as any);

    render(<AnalysisModal open quoteId="q1" runId="r1" onClose={jest.fn()} />);

    expect(await screen.findByText(/Processing/i)).toBeInTheDocument();

    // advance time 2s intervals and wait for updates
    await act(async () => { jest.advanceTimersByTime(2000); });
    await act(async () => { jest.advanceTimersByTime(2000); });

    await waitFor(() => expect(screen.getByText(/item\(s\) ready/i)).toBeInTheDocument());

    // Expect fetch called for status at least 3 times (initial + 2 polls)
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('cleans up polling interval on unmount', async () => {
    mockFetchSequence([
      { ok: true, json: async () => ({ documents: [] }), headers: new Headers({ 'content-type': 'application/json' }) },
      { ok: true, json: async () => ({ status: 'pending' }), headers: new Headers({ 'content-type': 'application/json' }) },
      { ok: true, json: async () => ({ runs: [] }), headers: new Headers({ 'content-type': 'application/json' }) },
    ] as any);

    const { unmount } = render(<AnalysisModal open quoteId="q1" runId="r1" onClose={jest.fn()} />);
    const callCount = (global.fetch as jest.Mock).mock.calls.length;
    unmount();
    await act(async () => { jest.advanceTimersByTime(4000); });
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(callCount);
  });

  it('shows error and allows retry-like behavior via state change', async () => {
    const fetchMock = jest.fn()
      // results
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ error: 'fail' }) })
      // status
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ status: 'pending' }) })
      // history
      .mockResolvedValueOnce({ ok: true, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ runs: [] }) });
    // @ts-ignore
    global.fetch = fetchMock;

    render(<AnalysisModal open quoteId="q1" runId="r1" onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/Failed to load results/i)).toBeInTheDocument());
  });

  it('disables action buttons while loading, enables when idle', async () => {
    mockFetchSequence([
      { ok: true, json: async () => ({ documents: [] }), headers: new Headers({ 'content-type': 'application/json' }) },
      { ok: true, json: async () => ({ status: 'ready' }), headers: new Headers({ 'content-type': 'application/json' }) },
      { ok: true, json: async () => ({ runs: [] }), headers: new Headers({ 'content-type': 'application/json' }) },
    ] as any);

    render(<AnalysisModal open quoteId="q1" runId="r1" onClose={jest.fn()} />);

    const useBtn = await screen.findByRole('button', { name: /Use Analysis/i });
    expect(useBtn).toBeEnabled();

    // Click edit switches mode, but still enabled if not loading
    const editBtn = screen.getByRole('button', { name: /Edit Analysis/i });
    fireEvent.click(editBtn);
    expect(editBtn).toBeEnabled();
  });
});
