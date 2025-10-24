// api/models.js
// Returns list of models available for frontend. Includes metadata for UI (silhouette id, description, requiresAuth).
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const hasKey = Boolean(process.env.POLLINATIONS_API_KEY);

  const DEFAULT_MODELS = [
    { id: 'flux', name: 'Flux', silhouette: 'flux', desc: 'Balanced general-purpose model', requiresAuth: false },
    { id: 'turbo', name: 'Turbo', silhouette: 'turbo', desc: 'Fast, lower-latency renders', requiresAuth: false },
    { id: 'flux-realism', name: 'Flux Realism', silhouette: 'flux-realism', desc: 'Realistic photographic style', requiresAuth: false },
    { id: 'realism', name: 'Realism V2', silhouette: 'realism', desc: 'High-fidelity photorealism', requiresAuth: false },
    { id: 'stable', name: 'Stable', silhouette: 'stable', desc: 'Stable-like rendering', requiresAuth: false },
    // kontext supports image->image but requires auth on Pollinations
    { id: 'kontext', name: 'Kontext (Img2Img)', silhouette: 'kontext', desc: 'Image→Image / reference-based generation', requiresAuth: true, available: hasKey }
  ];

  const extra = (process.env.EXTRA_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  const extraObjs = extra.map(id => ({ id, name: id, silhouette: 'default', desc: 'Extra model', requiresAuth: false }));

  const models = DEFAULT_MODELS.concat(extraObjs);
  return res.status(200).json({ models });
}
