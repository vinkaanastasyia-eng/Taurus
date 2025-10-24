// api/models.js
// Simple endpoint to return available models (so frontend can fetch dynamically).
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DEFAULT_MODELS = [
    { id: 'flux', name: 'Flux', icon: '⚡', desc: 'Balanced' },
    { id: 'turbo', name: 'Turbo', icon: '🚀', desc: 'Fast' },
    { id: 'flux-realism', name: 'Realism', icon: '📷', desc: 'Realistic' },
    { id: 'realism', name: 'Realism V2', icon: '🖼️', desc: 'Photoreal' },
    { id: 'stable', name: 'Stable', icon: '🔧', desc: 'Stable-style' }
  ];

  const extra = (process.env.EXTRA_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  // extra can be like "myModelA,myModelB" — we convert to objects with id/name=that string
  const extraObjs = extra.map(id => ({ id, name: id, icon: '✨', desc: 'Extra model' }));

  const models = DEFAULT_MODELS.concat(extraObjs);

  return res.status(200).json({ models });
}
