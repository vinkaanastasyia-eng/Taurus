# Logs for Taurus AI

This folder contains instructions for error logging used by the app.

- /api/logs (serverless) — accepts POST to collect errors; writes to runtime `/tmp/taurus-errors.log` (ephemeral) and prints to stdout/stderr so your hosting platform collects them.
- For persistent logging in production, replace or forward logs to a dedicated service, e.g. Sentry, Logflare, Datadog, CloudWatch, etc.

Example client POST:
```js
fetch('/api/logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ level: 'error', message: 'Generate failed', details: 'quota exceeded' })
});