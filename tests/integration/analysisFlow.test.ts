import callbackHandler from '../../pages/api/n8n/callback';
import statusHandler from '../../pages/api/analysis-runs/[runId]/status';
import resultsHandler from '../../pages/api/analysis-runs/[runId]/index';
import { createMockReqRes } from '../utils/mockNext';

// In-memory mock database
const db = {
  analysis_runs: new Map<string, any>(),
  quote_submissions: new Map<string, any>(),
  quote_sub_orders: new Map<string, any[]>(),
};

function resetDb(){ db.analysis_runs.clear(); db.quote_submissions.clear(); db.quote_sub_orders.clear(); }

jest.mock('../../lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: (table: string) => {
      if (table === 'analysis_runs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: function(key: string, id: string){ this._id = id; return this; },
          maybeSingle: jest.fn().mockImplementation(async function(){
            const id = (this as any)._id; const row = db.analysis_runs.get(id) || null;
            return { data: row, error: null };
          }),
          update: jest.fn().mockImplementation(function(payload: any){ const id = (this as any)._id; const row = db.analysis_runs.get(id) || {}; db.analysis_runs.set(id, { ...row, ...payload }); return this; }),
          insert: jest.fn().mockImplementation(function(rows: any[]){ const row = rows[0]; db.analysis_runs.set(row.id, row); return { select: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }; }),
          order: jest.fn().mockReturnThis(),
        } as any;
      }
      if (table === 'quote_submissions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: function(key: string, id: string){ this._id = id; return this; },
          maybeSingle: jest.fn().mockImplementation(async function(){ const id = (this as any)._id; const row = db.quote_submissions.get(id) || null; return { data: row, error: null }; }),
          update: jest.fn().mockImplementation(function(payload: any){ const id = (this as any)._id; const row = db.quote_submissions.get(id) || {}; db.quote_submissions.set(id, { ...row, ...payload }); return this; }),
          insert: jest.fn().mockReturnThis(),
        } as any;
      }
      if (table === 'quote_sub_orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: function(key: string, id: string){ this._id = id; return this; },
          order: jest.fn().mockResolvedValue({ data: db.quote_sub_orders.get((this as any)._id) || [] }),
          insert: jest.fn().mockImplementation(function(rows: any[]){ const id = (this as any)._id; db.quote_sub_orders.set(id, rows); return { data: rows, error: null }; }),
        } as any;
      }
      return {} as any;
    },
  })),
}));

describe('Analysis Flow Integration', () => {
  const secret = 'test-secret';
  const oldEnv = { ...process.env };
  beforeEach(() => { resetDb(); process.env.N8N_WEBHOOK_SECRET = secret; });
  afterAll(() => { process.env = oldEnv; });

  it('completes full analysis workflow', async () => {
    const runId = 'run-1';
    const quoteId = 'q1';
    // 1. Create analysis run and initial rows
    db.analysis_runs.set(runId, { id: runId, quote_id: quoteId, status: 'pending', updated_at: new Date().toISOString() });
    db.quote_submissions.set(quoteId, { quote_id: quoteId, n8n_status: 'processing', updated_at: new Date().toISOString() });

    // 2. Simulate n8n callback
    const { req: cReq, res: cRes } = createMockReqRes('POST', {
      headers: { 'X-Webhook-Secret': secret },
      body: { quote_id: quoteId, run_id: runId, status: 'ready' },
    });
    // @ts-ignore
    await callbackHandler(cReq, cRes);
    expect(cRes.statusCode).toBe(200);

    // Populate documents
    db.quote_sub_orders.set(runId, [
      { filename: 'doc.pdf', doc_type: 'Birth', total_pages: 2, billable_pages: 2.5, average_confidence_score: 0.95, complexity_multiplier: 1.1, source_language: 'en', target_language: 'es' },
    ]);

    // 3. Check status endpoint
    const { req: sReq, res: sRes } = createMockReqRes('GET', { query: { runId } });
    // @ts-ignore
    await statusHandler(sReq, sRes);
    expect(sRes.statusCode).toBe(200);
    expect(sRes.body.status).toBeDefined();

    // 4. Check results endpoint
    const { req: rReq, res: rRes } = createMockReqRes('GET', { query: { runId } });
    // @ts-ignore
    await resultsHandler(rReq, rRes);
    expect(rRes.statusCode).toBe(200);
    expect(rRes.body.summary.total_documents).toBe(1);
  });
});
