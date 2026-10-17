import { handleChat, json } from '../lib/ai.mjs';

export const config = { maxDuration: 60 };

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }
  return handleChat(req, res);
}
