export default function handler(req, res){
  return res.status(410).json({ error: 'Disabled in Simplified Admin Phase 1' });
}
