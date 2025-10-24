// api/generate.js
// Supports optional clientKey in request body for one-time authenticated requests.
// Prefer server-side POLLINATIONS_API_KEY for production (set in Vercel env).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, message: 'Generate endpoint (POST) available' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, imageUrl, model, width, height, seed, nologo, enhance, nsfw, clientKey } = req.body || {};

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const DEFAULT_MODELS = ['flux', 'turbo', 'flux-realism', 'realism', 'stable', 'kontext'];
    const extra = (process.env.EXTRA_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
    const allowedModels = Array.from(new Set(DEFAULT_MODELS.concat(extra)));
    const selectedModel = model || 'flux';
    if (!allowedModels.includes(selectedModel)) {
      return res.status(400).json({ error: 'Invalid model', details: `Allowed: ${allowedModels.join(', ')}` });
    }

    // Determine API key to use for this request:
    // Priority: clientKey (one-time from browser) -> POLLINATIONS_API_KEY env var -> null
    const apiToken = clientKey || process.env.POLLINATIONS_API_KEY || null;

    // If kontext (img2img) requires auth, ensure we have a key
    if (selectedModel === 'kontext' && !apiToken) {
      return res.status(403).json({
        error: 'Model requires authentication',
        details: "The 'kontext' (img2img) model requires a Pollinations API key (seed tier or higher). Use 'Test key' in Settings or set POLLINATIONS_API_KEY in Vercel."
      });
    }

    // Build request to Pollinations API
    const pollinationsUrl = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt));
    const params = { model: selectedModel, width: width || 1024, height: height || 1024 };
    if (seed) params.seed = seed;
    if (nologo) params.nologo = true;
    if (enhance) params.enhance = true;
    if (!nsfw) params.safe = true;
    if (imageUrl) params.image = imageUrl;

    Object.keys(params).forEach(k => pollinationsUrl.searchParams.append(k, params[k]));

    const headers = { 'User-Agent': 'Taurus-AI/1.0' };
    if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;

    const response = await fetch(pollinationsUrl.toString(), { headers });
    if (!response.ok) {
      let details = '';
      try { details = await response.text(); } catch (_) { details = `status ${response.status}`; }
      console.error('Pollinations API error:', response.status, details);
      return res.status(response.status).json({ error: 'Pollinations API error', status: response.status, details });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return res.status(200).json({ success: true, imageUrl: dataUrl, message: 'Image generated successfully' });

  } catch (error) {
    console.error('Error in /api/generate:', error && (error.stack || error.message) ? (error.stack || error.message) : String(error));
    return res.status(500).json({ error: 'Failed to generate image', details: error && error.message ? error.message : String(error) });
  }
}