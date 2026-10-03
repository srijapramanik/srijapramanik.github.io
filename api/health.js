export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'Method not allowed' });
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ ok:false, error:'GITHUB_TOKEN not configured' });
  return res.status(200).json({ ok:true, message:'SRIJA API ready' });
}
