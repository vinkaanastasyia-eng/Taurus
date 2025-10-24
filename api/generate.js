// api/generate.js
// Deploy ini di Vercel sebagai serverless function
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST for generation (GET can be used for health check)
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'Generate endpoint (POST) available' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageUrl, model, width, height, seed, nologo, enhance, nsfw } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build allowed model list (default + optional EXTRA_MODELS env var)
    const DEFAULT_MODELS = ['flux', 'turbo', 'flux-realism', 'realism', 'stable'];
    const extra = (process.env.EXTRA_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
    const allowedModels = Array.from(new Set(DEFAULT_MODELS.concat(extra)));

    const selectedModel = model || 'flux';
    if (!allowedModels.includes(selectedModel)) {
      // Return helpful error so frontend can show a proper message
      return res.status(400).json({
        error: 'Invalid model',
        details: `Model '${selectedModel}' is not available on this instance. Allowed: ${allowedModels.join(', ')}`
      });
    }

    // Use server-side API key if provided (set in environment: POLLINATIONS_API_KEY)
    const apiToken = process.env.POLLINATIONS_API_KEY || null;

    // Build request to Pollinations API
    const pollinationsUrl = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt));

    const params = {
      model: selectedModel,
      width: width || 1024,
      height: height || 1024,
    };

    if (seed) params.seed = seed;
    if (nologo) params.nologo = true;
    if (enhance) params.enhance = true;
    if (!nsfw) params.safe = true; // safe mode if nsfw is disabled

    if (imageUrl) {
      params.image = imageUrl;
    }

    // Add params to URL
    Object.keys(params).forEach(key => {
      pollinationsUrl.searchParams.append(key, params[key]);
    });

    // Prepare headers (include Authorization only if token present)
    const headers = {
      'User-Agent': 'Taurus-AI/1.0'
    };
    if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    // Fetch image from Pollinations
    const response = await fetch(pollinationsUrl.toString(), { headers });

    if (!response.ok) {
      // Try to extract error text for diagnostics
      let details = '';
      try { details = await response.text(); } catch (_) { details = `status ${response.status}`; }

      // Log full URL without exposing secret tokens
      console.error(`Pollinations API error: ${response.status} - ${details} (url=${pollinationsUrl.origin}${pollinationsUrl.pathname} params=${Array.from(pollinationsUrl.searchParams).map(p=>p.join('=')).join('&')})`);

      return res.status(response.status).json({
        error: 'Pollinations API error',
        status: response.status,
        details: details
      });
    }

    // Read image buffer and convert to base64 data URL so frontend can display it directly
    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Return image data URL
    return res.status(200).json({
      success: true,
      imageUrl: dataUrl,
      message: 'Image generated successfully'
    });

  } catch (error) {
    console.error('Error in /api/generate:', error);
    // Return minimal error to client but include details for debugging
    return res.status(500).json({
      error: 'Failed to generate image',
      details: error && error.message ? error.message : String(error)
    });
  }
}