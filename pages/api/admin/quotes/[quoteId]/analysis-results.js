import { withPermission } from '../../../../../lib/apiAdmin';
function handler(req, res){
  return res.status(410).json({ error: 'Disabled in Simplified Admin Phase 1' });
}
export default withPermission('quotes','edit')(handler);
