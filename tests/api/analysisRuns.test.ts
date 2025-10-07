import handler from '../../pages/api/analysis-runs/[runId]/index';
import { createMockReqRes } from '../utils/mockNext';

function makeClient(documents: any[]) {
  return {
    from: (table: string) => {
      if (table === 'analysis_runs') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'test-run-id', quote_id: 'q1', status: 'ready', updated_at: '2025-10-07T22:05:00Z' }, error: null }),
        } as any;
      }
      if (table === 'quote_sub_orders') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          then: undefined,
          // emulate supabase .select returning data via await on method chain
          // We will just return the documents in a resolved promise when .order is awaited
          // But simpler: return an object with order() and finally a promise on access via await
          // Instead, mock select to return { data: documents }
          // We'll implement as below:
        } as any;
      }
      return {} as any;
    },
  };
}

jest.mock('../../lib/supabaseServer', () => ({
  getSupabaseServerClient: jest.fn(() => makeClient([])),
}));

describe('GET /api/analysis-runs/[runId]', () => {
  it('returns complete analysis results', async () => {
    const { getSupabaseServerClient } = require('../../lib/supabaseServer');
    (getSupabaseServerClient as jest.Mock).mockReturnValueOnce({
      from: (table: string) => {
        if (table === 'analysis_runs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'test-run-id', quote_id: 'q1', status: 'ready', updated_at: '2025-10-07T22:05:00Z' }, error: null }),
          } as any;
        }
        if (table === 'quote_sub_orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [
              { filename: 'a.pdf', doc_type: 'Birth', total_pages: 2, billable_pages: 2.5, average_confidence_score: 0.9, complexity_multiplier: 1.1, source_language: 'en', target_language: 'es' }
            ] }),
          } as any;
        }
        return {} as any;
      },
    });

    const { req, res } = createMockReqRes('GET', { query: { runId: 'test-run-id' } });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      quote_id: expect.any(String),
      run_id: expect.any(String),
      summary: {
        total_documents: expect.any(Number),
        total_pages: expect.any(Number),
        billable_pages: expect.any(Number),
        estimated_total: expect.any(Number),
      },
      documents: expect.arrayContaining([
        expect.objectContaining({ filename: expect.any(String), document_type: expect.any(String), pages: expect.any(Number) })
      ])
    });
  });

  it('calculates summary correctly from documents', async () => {
    const docs = [
      { filename: 'a.pdf', doc_type: 'A', total_pages: 2, billable_pages: 1.5, average_confidence_score: 0.9, complexity_multiplier: 1.0, source_language: 'en', target_language: 'es' },
      { filename: 'b.pdf', doc_type: 'B', total_pages: 3, billable_pages: 2.0, average_confidence_score: 0.8, complexity_multiplier: 1.2, source_language: 'en', target_language: 'fr' },
    ];
    const { getSupabaseServerClient } = require('../../lib/supabaseServer');
    (getSupabaseServerClient as jest.Mock).mockReturnValueOnce({
      from: (table: string) => {
        if (table === 'analysis_runs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'test-run-id', quote_id: 'q1', status: 'ready', updated_at: '2025-10-07T22:05:00Z' }, error: null }),
          } as any;
        }
        if (table === 'quote_sub_orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: docs }),
          } as any;
        }
        return {} as any;
      },
    });
    const { req, res } = createMockReqRes('GET', { query: { runId: 'test-run-id' } });
    // @ts-ignore
    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.summary.total_documents).toBe(2);
    expect(res.body.summary.total_pages).toBe(5);
    expect(res.body.summary.billable_pages).toBeCloseTo(3.5);
  });
});
