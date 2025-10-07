import handler from '../../pages/api/analysis-runs/[runId]/status';
import { createMockReqRes } from '../utils/mockNext';

jest.mock('../../lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'analysis_runs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'test-run-id', quote_id: 'q1', status: 'ready', updated_at: '2025-10-07T22:05:00Z' }, error: null }),
        } as any;
      }
      if (table === 'quote_submissions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { n8n_status: 'ready', updated_at: '2025-10-07T22:06:00Z' }, error: null }),
        } as any;
      }
      return {} as any;
    },
  })),
}));

describe('GET /api/analysis-runs/[runId]/status', () => {
  it('returns status for valid runId', async () => {
    const { req, res } = createMockReqRes('GET', { query: { runId: 'test-run-id' } });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ready',
      n8n_status: 'ready',
      updated_at: expect.any(String),
      is_active: expect.any(Boolean),
      discarded: expect.any(Boolean),
    });
  });

  it('returns 404 for non-existent runId', async () => {
    const { getSupabaseServerClient } = require('../../lib/supabaseServer');
    (getSupabaseServerClient as jest.Mock).mockReturnValueOnce({
      from: (table: string) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })
    });
    const { req, res } = createMockReqRes('GET', { query: { runId: 'invalid' } });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });
});
