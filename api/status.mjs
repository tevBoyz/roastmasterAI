import { json, statusBody } from '../lib/ai.mjs';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }
  return json(res, 200, statusBody());
}
