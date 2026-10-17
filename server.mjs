import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { aiEnabled, handleChat, json, statusBody } from './lib/ai.mjs';

const publicRoot = resolve(process.cwd(), 'public');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};
function headers(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    ...extra
  };
}
async function serveStatic(pathname, res) {
  let requested;
  try { requested = decodeURIComponent(pathname); }
  catch { return json(res, 400, { error: 'Invalid path.' }); }
  if (requested.includes('\0') || requested.includes('\\')) return json(res, 400, { error: 'Invalid path.' });
  if (requested === '/') requested = '/index.html';
  const file = resolve(publicRoot, '.' + requested);
  const rel = relative(publicRoot, file);
  if (rel.startsWith('..') || rel.startsWith('/') || rel.startsWith('\\')) return json(res, 403, { error: 'Forbidden' });
  try {
    const info = await stat(file);
    if (!info.isFile()) return json(res, 404, { error: 'Not found' });
    const body = await readFile(file);
    const maxAge = /\.(?:png|svg)$/.test(file) ? 'public, max-age=86400' : 'no-cache';
    res.writeHead(200, headers({ 'Content-Type': contentTypes[extname(file)] || 'application/octet-stream', 'Cache-Control': maxAge }));
    return res.end(body);
  } catch { return json(res, 404, { error: 'Not found' }); }
}
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname === '/api/status' && req.method === 'GET') return json(res, 200, statusBody());
  if (pathname === '/api/chat') {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Method not allowed' }); }
    return handleChat(req, res);
  }
  if (pathname.startsWith('/api/')) return json(res, 404, { error: 'API endpoint not found' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
  return serveStatic(pathname, res);
});
server.listen(port, host, () => {
  console.log(`RoastMaster AI listening on http://${host}:${port}`);
  console.log(`AI service: ${aiEnabled ? 'configured' : 'not configured, educational features still available'}`);
});
