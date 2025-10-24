// api/logs.js
// Simple serverless endpoint to collect error logs for debugging.
// - POST /api/logs  { level: 'error'|'warn'|'info', message: string, details?: string }
// - GET  /api/logs?lines=200  -> returns recent logs (from runtime /tmp file, best-effort)
// Note: Serverless environments are ephemeral. Logs written to /tmp will not persist across cold starts.
// For production use, wire this to a real log store (Sentry/Logflare/CloudWatch/etc).

import fs from 'fs';
import path from 'path';

const TMP_LOG_PATH = '/tmp/taurus-errors.log'; // runtime temp file (ephemeral)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { level = 'error', message = '', details = '' } = req.body || {};
      const ts = new Date().toISOString();
      const entry = { ts, level, message, details };
      const line = JSON.stringify(entry) + '\n';

      // write to runtime temp file (best-effort)
      try {
        fs.appendFileSync(TMP_LOG_PATH, line);
      } catch (e) {
        // append failure, still console.error
      }

      // Always log to server console so platform logs capture it
      if (level === 'error') console.error('[TAURUS_LOG]', entry);
      else if (level === 'warn') console.warn('[TAURUS_LOG]', entry);
      else console.log('[TAURUS_LOG]', entry);

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      // Return last N lines from temp log file (best-effort)
      const q = Number(req.query.lines || 200);
      try {
        if (!fs.existsSync(TMP_LOG_PATH)) return res.status(200).json({ logs: [] });
        const content = fs.readFileSync(TMP_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
        const last = content.slice(-Math.max(1, q));
        const parsed = last.map(l => {
          try { return JSON.parse(l); } catch (e) { return { raw: l }; }
        });
        return res.status(200).json({ logs: parsed });
      } catch (e) {
        console.error('Error reading logs file', e);
        return res.status(500).json({ error: 'Failed to read logs' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/logs', error);
    return res.status(500).json({ error: 'internal' });
  }
}