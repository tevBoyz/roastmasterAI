import { timingSafeEqual } from 'node:crypto';

const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const aiEndpoint = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const apiKey = process.env.GROQ_API_KEY || '';
const accessCode = process.env.APP_ACCESS_CODE || '';
const configuredLimit = Number(process.env.CHAT_REQUESTS_PER_MINUTE || 10);
const budget = Number.isFinite(configuredLimit) ? Math.min(60, Math.max(1, Math.floor(configuredLimit))) : 10;
const counters = new Map();
const aiEnabled = Boolean(apiKey && accessCode && accessCode !== 'replace-with-a-long-random-secret');
const prompt = `You are RoastMaster AI, an expert educational assistant for coffee roasting teachers and students. Answer in clear English with practical, beginner-friendly explanations and accurate technical vocabulary. Cover coffee roasting chemistry, heat transfer, roast defects, roast curve interpretation, sensory analysis, processing, green coffee measurement, equipment maintenance, and small-batch planning. The featured machine is a Kuban Base 5KG gas drum roaster, but you have NOT been given its official operations manual, its calibration, hardware specs or verified manufacturer settings. Never fabricate manufacturer recommended temperatures, motor/drum RPM, gas pressure, button functions, wiring, error codes, minimum batch size or alarm meanings. Instead explain general principles, ask for an actual manual or instrument reading, and distinguish measurement from inference. A temperature reading from one probe is not universally transferable to another roaster. Do not invent fixed optimum first-crack temperatures, development-time ratios or roast durations. When a user provides data, show concise calculations with units and validate their consistency. Distinguish first crack, development time, weight loss, and rate of rise accurately. Suggest logging one change at a time and confirming results by cupping. For fire, gas leak, carbon monoxide, ignition, electrical faults or abnormal smoke: prioritize shutdown when safe, fresh air/evacuation and qualified technicians; never advise bypassing interlocks or attempting repairs on live equipment. Clearly mark uncertain claims. If asked for dangerous instructions, redirect to safe, qualified help. Do not falsely say you have access to current Kuban manuals. Prefer structured steps over long unbroken paragraphs. The product is educational; don't claim the machine is controllable from chat. Use markdown for emphasis and lists. Do not wrap greetings, headings, or emphasized phrases in quotation marks.`;

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
export function json(res, status, body) {
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
function clientAddress(req) {
  const vercelIp = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] : null;
  const proxyIp = process.env.TRUST_PROXY === '1' ? req.headers['x-real-ip'] : null;
  const candidate = typeof vercelIp === 'string' ? vercelIp.split(',')[0].trim() : (typeof proxyIp === 'string' ? proxyIp : '');
  if (/^[a-fA-F0-9.:]+$/.test(candidate)) return candidate;
  return req.socket?.remoteAddress || 'unknown';
}
function rateAllowed(req) {
  const ip = clientAddress(req);
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
  if (req.body != null && req.body !== '') {
    const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(text) > 36_000) throw new Error('too_large');
    if (typeof req.body === 'object') return req.body;
    try { return JSON.parse(text); }
    catch { throw new Error('invalid_json'); }
  }
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
export function statusBody() {
  return { aiEnabled, model: aiEnabled ? model : null, version: '0.1.0' };
}
export async function handleChat(req, res) {
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
export { aiEnabled };
