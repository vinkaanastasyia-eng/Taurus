// api/generate.js
// Deploy ini di Vercel sebagai serverless function

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageUrl, apiToken, model, width, height, seed, nologo, enhance, nsfw } = req.body;

    if (!apiToken) {
      return res.status(400).json({ error: 'API Token required' });
    }

    // Build request to Pollinations API
    const pollinationsUrl = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt));
    
    const params = {
      model: model || 'flux',
      width: width || 1024,
      height: height || 1024,
    };

    if (seed) params.seed = seed;
    if (nologo) params.nologo = true;
    if (enhance) params.enhance = true;
    if (!nsfw) params.safe = true; // safe mode if nsfw is disabled
    
    // Image-to-image support
    if (imageUrl) {
      params.image = imageUrl;
    }

    // Add params to URL
    Object.keys(params).forEach(key => {
      pollinationsUrl.searchParams.append(key, params[key]);
    });

    // Make request with authentication
    const response = await fetch(pollinationsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'User-Agent': 'Taurus-AI/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Pollinations API error: ${response.status}`);
    }

    // Return image URL
    return res.status(200).json({ 
      success: true, 
      imageUrl: pollinationsUrl.toString(),
      message: 'Image generated successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate image', 
      details: error.message 
    });
  }
}
