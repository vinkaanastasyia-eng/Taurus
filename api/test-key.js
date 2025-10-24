// api/test-key.js
// POST { key: "<pollinations-key>" } -> tries a small authenticated request to Pollinations (kontext).
// WARNING: This endpoint DOES NOT store the key. It's only for testing validity.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const key = body.key;
    if (!key) return res.status(400).json({ ok: false, error: 'Missing key in request body' });

    // Build a small test request to Pollinations using kontext (requires auth)
    const prompt = 'Auth test';
    const url = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt));
    url.searchParams.append('model', 'kontext');
    url.searchParams.append('width', 256);
    url.searchParams.append('height', 256);
    // safe true by default unless user wants otherwise
    url.searchParams.append('safe', true);

    const headers = { 'User-Agent': 'Taurus-AI/1.0', 'Authorization': `Bearer ${key}` };

    const resp = await fetch(url.toString(), { method: 'GET', headers });
    const contentType = resp.headers.get('content-type') || '';

    // If service returns an image, key is valid for kontext
    if (resp.ok && contentType.startsWith('image/')) {
      return res.status(200).json({ ok: true, message: 'Key valid for kontext (image returned)' });
    }

    // else read body text/json for diagnostics
    let text = '';
    try { text = await resp.text(); } catch (e) { text = `<failed to read body: ${String(e)}>`; }

    // Pollinations often returns JSON error; try parse
    try {
      const parsed = JSON.parse(text);
      return res.status(200).json({ ok: false, message: 'Key rejected or insufficient permissions', details: parsed });
    } catch (e) {
      return res.status(200).json({ ok: false, message: 'Key rejected or insufficient permissions', details: text });
    }
  } catch (err) {
    console.error('Error in /api/test-key:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error', details: err && err.message ? err.message : String(err) });
  }
}