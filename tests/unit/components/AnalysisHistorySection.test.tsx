import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalysisHistorySection from '../../../components/AnalysisHistorySection';

function makeResponse(json: any){ return { ok: true, json: async () => json, headers: new Headers({ 'content-type': 'application/json' }) } as any; }

describe('AnalysisHistorySection', () => {
  afterEach(() => { jest.resetAllMocks(); });

  it('fetches and displays previous runs', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue(makeResponse({ runs: [ { id: 'r1', version: 1, status: 'ready', created_at: '2025-10-07T22:00:00Z' } ] }));
    render(<AnalysisHistorySection quoteId="q1" activeRunId="r1" onViewRun={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/Run v1/i)).toBeInTheDocument());
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
  });

  it('handles empty state', async () => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue(makeResponse({ runs: [] }));
    render(<AnalysisHistorySection quoteId="q1" />);
    await waitFor(() => expect(screen.getByText(/No previous runs/i)).toBeInTheDocument());
  });

  it('invokes onViewRun when clicking view', async () => {
    const onView = jest.fn();
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue(makeResponse({ runs: [ { id: 'r2', version: 2, status: 'processing', created_at: '2025-10-07T22:00:00Z' } ] }));
    render(<AnalysisHistorySection quoteId="q1" onViewRun={onView} />);
    const btn = await screen.findByRole('button', { name: /View/i });
    fireEvent.click(btn);
    expect(onView).toHaveBeenCalledWith('r2');
  });
});
