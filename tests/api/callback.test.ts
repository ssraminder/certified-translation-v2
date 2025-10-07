import handler from '../../pages/api/n8n/callback';
import { createMockReqRes } from '../utils/mockNext';

jest.mock('../../lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: (table: string) => {
      const api: any = {
        _table: table,
        _updates: [] as any[],
        update(payload: any){ this._updates.push(payload); return this; },
        eq(){ return this; },
        select(){ return this; },
        insert(){ return this; },
        delete(){ return this; },
        maybeSingle: jest.fn(),
      };
      return api;
    }
  })),
}));

const { getSupabaseServerClient } = require('../../lib/supabaseServer');

describe('POST /api/n8n/callback', () => {
  const secret = 'test-secret';
  const oldEnv = { ...process.env };
  beforeEach(() => { jest.resetModules(); process.env.N8N_WEBHOOK_SECRET = secret; });
  afterAll(() => { process.env = oldEnv; });

  it('rejects requests without valid webhook secret', async () => {
    const { req, res } = createMockReqRes('POST', {
      headers: { 'X-Webhook-Secret': 'invalid' },
      body: { quote_id: 'q1', run_id: 'r1', status: 'ready' },
    });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid webhook secret' });
  });

  it('updates quote_submissions and analysis_runs with normalized status', async () => {
    const mockClient = getSupabaseServerClient();
    const fromSpy = jest.spyOn(mockClient, 'from');
    const { req, res } = createMockReqRes('POST', {
      headers: { 'X-Webhook-Secret': secret },
      body: { quote_id: 'q1', run_id: 'r1', status: 'Completed' },
    });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // First call updates quote_submissions.status
    const subApi: any = fromSpy.mock.results[0].value;
    expect(subApi._table).toBe('quote_submissions');
    expect(subApi._updates[0]).toEqual({ status: 'analysis_complete' });
    // Second call updates analysis_runs.status
    const runApi: any = fromSpy.mock.results[1].value;
    expect(runApi._table).toBe('analysis_runs');
    expect(runApi._updates[0]).toEqual({ status: 'analysis_complete' });
  });

  it('handles database errors gracefully', async () => {
    // Force first update to error
    (getSupabaseServerClient as jest.Mock).mockReturnValueOnce({
      from: (table: string) => ({
        update(){ return { eq: () => ({ error: { message: 'db err' } }) }; },
        eq(){ return this; },
      })
    });

    const { req, res } = createMockReqRes('POST', {
      headers: { 'X-Webhook-Secret': secret },
      body: { quote_id: 'q1', run_id: 'r1', status: 'ready' },
    });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to update status' });
  });

  it('handles missing run_id by only updating quote_submissions', async () => {
    const mockClient = getSupabaseServerClient();
    const fromSpy = jest.spyOn(mockClient, 'from');
    const { req, res } = createMockReqRes('POST', {
      headers: { 'X-Webhook-Secret': secret },
      body: { quote_id: 'q1', status: 'ready' },
    });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(fromSpy).toHaveBeenCalledTimes(1);
    const subApi: any = fromSpy.mock.results[0].value;
    expect(subApi._table).toBe('quote_submissions');
    expect(subApi._updates[0]).toEqual({ status: 'ready' });
  });
});
