export default function handler(req, res) {
  return res.status(410).json({ error: 'Analysis runs are no longer supported' });
}
