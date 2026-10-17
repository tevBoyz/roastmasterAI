export function parseTime(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = /^(\d{1,3}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
}
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.round(seconds % 60).toString().padStart(2, '0')}`;
}
export function calculateRoast({green, roasted, firstCrack, drop}) {
  if (![green, roasted, firstCrack, drop].every(Number.isFinite)) throw new Error('All measurements must be numbers.');
  if (green <= 0 || roasted <= 0 || roasted > green) throw new Error('Roasted weight must be greater than zero and no more than green weight.');
  if (firstCrack < 0 || drop <= 0 || firstCrack >= drop) throw new Error('First crack must occur before drop time.');
  const development = drop - firstCrack;
  return {
    weightLossPct: (green - roasted) / green * 100,
    developmentSeconds: development,
    dtrPct: development / drop * 100
  };
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function unwrapQuoted(text) {
  return text.replace(/^(?:&quot;|&#39;|[“”])([\s\S]+?)(?:&quot;|&#39;|[“”])$/, '$1');
}
function formatInline(text) {
  return unwrapQuoted(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, (_, inner) => `<strong>${unwrapQuoted(inner)}</strong>`)
    .replace(/__([^_]+)__/g, (_, inner) => `<strong>${unwrapQuoted(inner)}</strong>`)
    .replace(/(^|[^*])\*([^*\n]+)\*/g, (_, prefix, inner) => `${prefix}<em>${unwrapQuoted(inner)}</em>`);
}
export function formatChatMarkdown(value) {
  const lines = escapeHtml(value).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) { index++; continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(lines[index]);
    if (heading) {
      blocks.push(`<h3>${formatInline(heading[2])}</h3>`);
      index++;
      continue;
    }
    if (/^[-*]\s+/.test(lines[index])) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(`<li>${formatInline(lines[index].replace(/^[-*]\s+/, ''))}</li>`);
        index++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(lines[index])) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${formatInline(lines[index].replace(/^\d+\.\s+/, ''))}</li>`);
        index++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !/^[-*]\s+/.test(lines[index]) && !/^\d+\.\s+/.test(lines[index]) && !/^#{1,3}\s+/.test(lines[index])) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push(`<p>${formatInline(paragraph.join('<br>'))}</p>`);
  }
  return blocks.join('');
}
export function csvEscape(value) {
  const text = String(value ?? '');
  // Also prevent formula execution in Excel/Sheets by prefixing formula-looking cells.
  const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
