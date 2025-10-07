import { renderHook } from '@testing-library/react';
import * as swr from 'swr';
import { useAnalysisResults } from '../../../hooks/useAnalysisResults';

describe('useAnalysisResults', () => {
  it('does not fetch when shouldFetch is false', () => {
    const spy = jest.spyOn(swr, 'default' as any).mockImplementation((key) => { expect(key).toBeNull(); return { data: undefined, error: null, isLoading: false, mutate: jest.fn() }; });
    renderHook(() => useAnalysisResults('run-1', false));
    spy.mockRestore();
  });

  it('fetches results when runId and shouldFetch are true', () => {
    const spy = jest.spyOn(swr, 'default' as any).mockImplementation((key, fetcher, opts) => ({ data: { documents: [] }, error: null, isLoading: false, mutate: jest.fn() }));
    const { result } = renderHook(() => useAnalysisResults('run-1', true));
    expect(result.current.data).toBeDefined();
    spy.mockRestore();
  });

  it('calculates summary correctly', () => {
    const docs = [{ pages: 2, billable_pages: 1.5 }, { pages: 3, billable_pages: 2 }];
    const spy = jest.spyOn(swr, 'default' as any).mockImplementation(() => ({ data: { documents: docs }, error: null, isLoading: false, mutate: jest.fn() }));
    const { result } = renderHook(() => useAnalysisResults('run-1', true));
    expect(result.current.summary.total_documents).toBe(2);
    expect(result.current.summary.total_pages).toBe(5);
    expect(result.current.summary.billable_pages).toBeCloseTo(3.5);
    spy.mockRestore();
  });
});
