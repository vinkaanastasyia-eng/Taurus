// api/generate.js
// Serverless generate handler supporting extra params:
// - negative_prompt, cfg_scale, steps, sampler
// - clientKey (one-time session key from UI) OR process.env.POLLINATIONS_API_KEY (recommended in Vercel)
// - imageUrl for kontext (img2img)
// - nsfw flag to allow explicit
// Returns { success: true, imageUrl: dataUrl, message: ... } on success

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, message: 'Generate endpoint (POST) available' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const { prompt, imageUrl, model, width, height, seed, nologo, enhance, nsfw, clientKey, negative_prompt, cfg_scale, steps, sampler } = body;

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // allowed models - keep consistent with api/models.js
    const DEFAULT_MODELS = ['flux','turbo','flux-realism','realism','stable','kontext'];
    const extra = (process.env.EXTRA_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
    const allowedModels = Array.from(new Set(DEFAULT_MODELS.concat(extra)));
    const selectedModel = model || 'flux';
    if (!allowedModels.includes(selectedModel)) {
      return res.status(400).json({ error: 'Invalid model', details: `Allowed: ${allowedModels.join(', ')}` });
    }

    // determine API token: clientKey (from browser session) has priority, otherwise server env
    const apiToken = clientKey || process.env.POLLINATIONS_API_KEY || null;

    // kontext requires auth on Pollinations
    if (selectedModel === 'kontext' && !apiToken) {
      return res.status(403).json({
        error: 'Model requires authentication',
        details: "The 'kontext' (img2img) model requires a Pollinations API key (seed tier or higher). Set POLLINATIONS_API_KEY on server or use Test Key in UI."
      });
    }

    const baseUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt);
    const urlObj = new URL(baseUrl);

    // build params: include common and optional parameters
    const params = new URLSearchParams();
    params.append('model', selectedModel);
    params.append('width', String(width || 1024));
    params.append('height', String(height || 1024));
    if (typeof seed !== 'undefined' && seed !== null) params.append('seed', String(seed));
    if (nologo) params.append('nologo', 'true');
    if (enhance) params.append('enhance', 'true');
    if (!nsfw) params.append('safe', 'true');
    if (negative_prompt) params.append('negative_prompt', negative_prompt);
    if (typeof cfg_scale !== 'undefined') params.append('cfg_scale', String(cfg_scale));
    if (typeof steps !== 'undefined') params.append('steps', String(steps));
    if (sampler) params.append('sampler', sampler);

    // image reference handling: if kontext, prefer inline small images (handled previously),
    // but here we attempt simple server fetch fallback if client provided URL
    if (imageUrl) {
      // If kontext and we have apiToken, try to fetch and inline if small; otherwise just pass the URL
      try {
        if (selectedModel === 'kontext') {
          // try fetch server-side
          const fetchResp = await fetch(imageUrl);
          if (fetchResp.ok) {
            const contentType = fetchResp.headers.get('content-type') || 'image/png';
            const ab = await fetchResp.arrayBuffer();
            const buf = Buffer.from(ab);
            // inline if small <= 3MB (keep payload reasonable)
            if (buf.length <= 3 * 1024 * 1024) {
              const dataUrl = `data:${contentType};base64,${buf.toString('base64')}`;
              params.append('image', dataUrl);
            } else {
              // too large to inline, send original URL
              params.append('image', imageUrl);
            }
          } else {
            // couldn't fetch; fallback to sending URL
            params.append('image', imageUrl);
          }
        } else {
          params.append('image', imageUrl);
        }
      } catch (e) {
        // network issue - fallback to URL param
        params.append('image', imageUrl);
      }
    }

    // append params to URL
    urlObj.search = params.toString();

    // prepare headers
    const headers = { 'User-Agent': 'Taurus-AI/1.0' };
    if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;

    // call Pollinations
    const response = await fetch(urlObj.toString(), { headers, method: 'GET' });
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok || !contentType.startsWith('image/')) {
      // read body text for diagnostics
      let details = '';
      try { details = await response.text(); } catch (e) { details = `<failed to read body: ${String(e)}>`; }
      console.error('Pollinations API error', response.status, details);
      return res.status(response.status || 502).json({ error: 'Pollinations API error', status: response.status, details });
    }

    // convert image to data URL
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return res.status(200).json({ success: true, imageUrl: dataUrl, message: 'Image generated successfully' });

  } catch (error) {
    console.error('Error in /api/generate:', error && (error.stack || error.message) ? (error.stack || error.message) : String(error));
    try { await fetch('/api/logs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ level:'error', message:'generate handler error', details: String(error) }) }); } catch(e){}
    return res.status(500).json({ error: 'Failed to generate image', details: error && error.message ? error.message : String(error) });
  }
}
