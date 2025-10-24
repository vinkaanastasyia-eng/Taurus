// api/models.js
// Returns list of models available for frontend. Add extras via EXTRA_MODELS env var.
// Includes an image-to-image model (kontext) for Pollinations-style image2image.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const DEFAULT_MODELS = [
    { id: 'flux', name: 'Flux', icon: '⚡', desc: 'Balanced' },
    { id: 'turbo', name: 'Turbo', icon: '🚀', desc: 'Fast' },
    { id: 'flux-realism', name: 'Flux Realism', icon: '📷', desc: 'Realistic' },
    { id: 'realism', name: 'Realism', icon: '🖼️', desc: 'Photoreal' },
    { id: 'stable', name: 'Stable', icon: '🔧', desc: 'Stable-style' },
    // Pollinations / kontext for image-to-image needs: include kontext (image2image)
    { id: 'kontext', name: 'Kontext (Img2Img)', icon: '🖼️', desc: 'Image-to-Image / reference' }
  ];

  const extra = (process.env.EXTRA_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  const extraObjs = extra.map(id => ({ id, name: id, icon: '✨', desc: 'Extra model' }));

  const models = DEFAULT_MODELS.concat(extraObjs);
  return res.status(200).json({ models });
}