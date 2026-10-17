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
export function csvEscape(value) {
  const text = String(value ?? '');
  // Also prevent formula execution in Excel/Sheets by prefixing formula-looking cells.
  const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}
