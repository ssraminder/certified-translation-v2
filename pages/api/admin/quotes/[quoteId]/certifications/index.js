import { getSupabaseServerClient } from '../../../../../../lib/supabaseServer';
import { recalcAndUpsertUnifiedQuoteResults } from '../../../../../../lib/quoteTotals';
import { logAdminActivity } from '../../../../../../lib/activityLog';

function toCode(name){ return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }

async function handler(req, res){
  if (req.method !== 'POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = getSupabaseServerClient();
  const { quoteId } = req.query;

  // Ensure quote is editable
  const { data: q } = await supabase.from('quote_submissions').select('quote_state').eq('quote_id', quoteId).maybeSingle();
  if (['sent','accepted','converted'].includes(String(q?.quote_state||'').toLowerCase())){
    return res.status(400).json({ error: 'Quote is locked' });
  }

  const { cert_type_code, cert_type_name, default_rate, override_rate, applies_to_file_id, applies_to_filename } = req.body || {};

  let typeName = cert_type_name;
  let typeCode = cert_type_code || (typeName ? toCode(typeName) : null);
  let defaultRate = Number(default_rate || 0);

  // If only code provided, try lookup from cert_types by name/code
  if ((!typeName || !defaultRate) && (typeCode || typeName)){
    const nameOrCode = typeName || typeCode;
    const { data: ct } = await supabase
      .from('cert_types')
      .select('name, amount')
      .ilike('name', `%${String(nameOrCode).replace(/_/g,' ')}%`)
      .maybeSingle();
    if (ct){ typeName = ct.name; defaultRate = Number(ct.amount || 0); typeCode = toCode(ct.name); }
  }

  if (typeName && (!defaultRate || defaultRate <= 0)){
    if (toCode(typeName) === 'standard') defaultRate = 35;
  }
  if (!typeName || !defaultRate){
    return res.status(400).json({ error: 'Invalid certification type' });
  }

  const amount = Number(override_rate || defaultRate);
  if (!(amount > 0)) return res.status(400).json({ error: 'Invalid amount' });

  const insert = {
    quote_id: quoteId,
    cert_type_code: typeCode,
    cert_type_name: typeName,
    default_rate: defaultRate,
    override_rate: override_rate ? Number(override_rate) : null,
    certification_amount: amount,
    applies_to_file_id: applies_to_file_id || null,
    applies_to_filename: applies_to_filename || null
  };

  console.log('API certifications.insert payload', insert);
  const { data: row, error } = await supabase.from('quote_certifications').insert([insert]).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  console.log('API certifications.insert row', row);

  const totals = await recalcAndUpsertUnifiedQuoteResults(quoteId);
  await logAdminActivity({ action: 'quote_certification_added', actor_id: req.admin?.id || null, target_id: quoteId, details: { cert_id: row?.id, cert_type_name: typeName } });
  return res.status(200).json({ success: true, certification: row, totals });
}

import { withPermission } from '../../../../../../lib/apiAdmin';
export default withPermission('quotes','edit')(handler);
