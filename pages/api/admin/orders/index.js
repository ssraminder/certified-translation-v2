import { withAdmin } from '../../../../lib/apiAdmin';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = req.supabase;
    const { status, search, page = '1', limit = '20', start_date, end_date } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageLimit;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,id.ilike.%${search}%`);
    }

    if (start_date) {
      query = query.gte('created_at', new Date(start_date).toISOString());
    }

    if (end_date) {
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error, count } = await query.range(offset, offset + pageLimit - 1);

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / pageLimit);

    return res.status(200).json({
      orders: data || [],
      total_count: count || 0,
      pages: totalPages,
      page: pageNum,
      limit: pageLimit,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withAdmin(handler);
