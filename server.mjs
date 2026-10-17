import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const publicRoot = resolve(process.cwd(), 'public');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const aiEndpoint = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const apiKey = process.env.GROQ_API_KEY || '';
const accessCode = process.env.APP_ACCESS_CODE || '';
const configuredLimit = Number(process.env.CHAT_REQUESTS_PER_MINUTE || 10);
const budget = Number.isFinite(configuredLimit) ? Math.min(60, Math.max(1, Math.floor(configuredLimit))) : 10;
const counters = new Map();
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
const aiEnabled = Boolean(apiKey && accessCode && accessCode !== 'replace-with-a-long-random-secret');
const prompt = `You are RoastMaster AI, an expert educational assistant for coffee roasting teachers and students. Answer in clear English with practical, beginner-friendly explanations and accurate technical vocabulary. Cover coffee roasting chemistry, heat transfer, roast defects, roast curve interpretation, sensory analysis, processing, green coffee measurement, equipment maintenance, and small-batch planning. The featured machine is a Kuban Base 5KG gas drum roaster, but you have NOT been given its official operations manual, its calibration, hardware specs or verified manufacturer settings. Never fabricate manufacturer recommended temperatures, motor/drum RPM, gas pressure, button functions, wiring, error codes, minimum batch size or alarm meanings. Instead explain general principles, ask for an actual manual or instrument reading, and distinguish measurement from inference. A temperature reading from one probe is not universally transferable to another roaster. Do not invent fixed optimum first-crack temperatures, development-time ratios or roast durations. When a user provides data, show concise calculations with units and validate their consistency. Distinguish first crack, development time, weight loss, and rate of rise accurately. Suggest logging one change at a time and confirming results by cupping. For fire, gas leak, carbon monoxide, ignition, electrical faults or abnormal smoke: prioritize shutdown when safe, fresh air/evacuation and qualified technicians; never advise bypassing interlocks or attempting repairs on live equipment. Clearly mark uncertain claims. If asked for dangerous instructions, redirect to safe, qualified help. Do not falsely say you have access to current Kuban manuals. Prefer structured steps over long unbroken paragraphs. The product is educational; don't claim the machine is controllable from chat.`;
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
function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }));
  res.end(payload);
}
function secureMatch(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function rateAllowed(req) {
  const forwarded = process.env.TRUST_PROXY === '1' ? req.headers['x-real-ip'] : null;
  const ip = typeof forwarded === 'string' && /^[a-fA-F0-9.:]+$/.test(forwarded) ? forwarded : (req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const entry = counters.get(ip);
  if (!entry || now > entry.until) {
    counters.set(ip, { count: 1, until: now + 60_000 });
    if (counters.size > 3000) {
      for (const [k, v] of counters) if (now > v.until) counters.delete(k);
    }
    return true;
  }
  if (entry.count >= budget) return false;
  entry.count++;
  return true;
}
async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 36_000) throw new Error('too_large');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('invalid_json'); }
}
function normalizeMessages(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 14) return null;
  const messages = [];
  let chars = 0;
  for (const m of input) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') return null;
    const content = m.content.trim();
    if (!content || content.length > 2300) return null;
    chars += content.length;
    if (chars > 13_000) return null;
    messages.push({ role: m.role, content });
  }
  if (messages[messages.length - 1].role !== 'user') return null;
  return messages;
}
async function generate(messages) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 50_000);
  try {
    const response = await fetch(aiEndpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: prompt }, ...messages],
        max_completion_tokens: 1800,
        temperature: 0.4,
        reasoning_effort: 'low',
        include_reasoning: false
      }),
      signal: abortController.signal
    });
    if (!response.ok) {
      const status = response.status;
      console.error(`Groq API responded with HTTP ${status}`);
      if (status === 429) return { status: 429, error: 'The AI service is at its usage or rate limit. Try again later.' };
      if (status === 401 || status === 403) return { status: 502, error: 'The AI account or API key is not authorized. Ask the app owner to check the server configuration.' };
      return { status: 502, error: 'The AI service could not complete this request.' };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const output = (typeof content === 'string' ? content : '').trim();
    if (!output) return { status: 502, error: 'The AI service returned no readable answer. Please try a shorter question.' };
    return { status: 200, answer: output };
  } finally { clearTimeout(timeout); }
}
async function handleChat(req, res) {
  if (!aiEnabled) return json(res, 503, { error: 'AI is not configured. The app owner must add GROQ_API_KEY and APP_ACCESS_CODE on the server.' });
  if (!secureMatch(String(req.headers['x-access-code'] || ''), accessCode)) return json(res, 401, { error: 'Access code is incorrect.' });
  if (!rateAllowed(req)) return json(res, 429, { error: 'Too many questions. Please try again in a minute.' });
  try {
    const body = await readBody(req);
    const messages = normalizeMessages(body.messages);
    if (!messages) return json(res, 400, { error: 'Provide 1–14 valid chat messages (up to 2,300 characters each).' });
    const result = await generate(messages);
    return json(res, result.status, result.status === 200 ? { answer: result.answer } : { error: result.error });
  } catch (error) {
    if (error.message === 'too_large') return json(res, 413, { error: 'Question history is too large.' });
    if (error.message === 'invalid_json') return json(res, 400, { error: 'Invalid JSON request.' });
    console.error('Chat request failed:', error.name);
    return json(res, 502, { error: 'AI request failed or timed out. Please retry.' });
  }
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
  if (pathname === '/api/status' && req.method === 'GET') return json(res, 200, { aiEnabled, model: aiEnabled ? model : null, version: '0.1.0' });
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
