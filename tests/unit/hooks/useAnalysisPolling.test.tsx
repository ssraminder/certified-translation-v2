import { renderHook, act } from '@testing-library/react';
import * as swr from 'swr';
import { useAnalysisPolling } from '../../../hooks/useAnalysisPolling';

describe('useAnalysisPolling', () => {
  it('polls every 2 seconds when status is pending', () => {
    const spy = jest.spyOn(swr, 'default' as any).mockImplementation((key, fetcher, opts) => ({ data: { status: 'pending' }, error: null, isLoading: false, mutate: jest.fn() }));
    const { result } = renderHook(() => useAnalysisPolling('run-1'));
    expect(result.current.refreshInterval).toBe(2000);
    spy.mockRestore();
  });

  it('stops polling when status is ready', () => {
    const spy = jest.spyOn(swr, 'default' as any).mockImplementation((key, fetcher, opts) => ({ data: { status: 'ready' }, error: null, isLoading: false, mutate: jest.fn() }));
    const { result } = renderHook(() => useAnalysisPolling('run-1'));
    expect(result.current.refreshInterval).toBe(0);
    spy.mockRestore();
  });

  it('restarts polling when restartPolling is called', () => {
    const mutate = jest.fn();
    const spy = jest.spyOn(swr, 'default' as any).mockImplementation((key, fetcher, opts) => ({ data: { status: 'ready' }, error: null, isLoading: false, mutate }));
    const { result } = renderHook(() => useAnalysisPolling('run-1'));
    act(() => { result.current.restartPolling(); });
    expect(mutate).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles errors gracefully', () => {
    const spy = jest.spyOn(swr, 'default' as any).mockImplementation((key, fetcher, opts) => ({ data: undefined, error: new Error('fail'), isLoading: false, mutate: jest.fn() }));
    const { result } = renderHook(() => useAnalysisPolling('run-1'));
    expect(result.current.error).toBeInstanceOf(Error);
    spy.mockRestore();
  });
});
