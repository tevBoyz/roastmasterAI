import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, formatTime, calculateRoast, csvEscape, formatChatMarkdown } from '../public/lib.js';

test('time parsing and formatting', () => {
  assert.equal(parseTime('10:30'), 630);
  assert.equal(parseTime('0:05'), 5);
  assert.equal(parseTime('10:60'), null);
  assert.equal(parseTime('foo'), null);
  assert.equal(formatTime(630), '10:30');
});
test('weight loss, development time and DTR', () => {
  const result = calculateRoast({ green: 2, roasted: 1.7, firstCrack: 480, drop: 600 });
  assert.ok(Math.abs(result.weightLossPct - 15) < 0.00001);
  assert.equal(result.developmentSeconds, 120);
  assert.equal(result.dtrPct, 20);
});
test('reject impossible measurements', () => {
  assert.throws(() => calculateRoast({ green: 2, roasted: 2.3, firstCrack: 480, drop: 600 }));
  assert.throws(() => calculateRoast({ green: 2, roasted: 1.8, firstCrack: 650, drop: 600 }));
});
test('CSV injection mitigation and quote handling', () => {
  assert.equal(csvEscape('=SUM(A1:A9)'), '"\'=SUM(A1:A9)"');
  assert.equal(csvEscape('"Sidama", Natural'), '"""Sidama"", Natural"');
});
test('chat markdown renders emphasis and lists without wrapping quotes', () => {
  const html = formatChatMarkdown('**"Hello!"**\n\nA "first crack" is audible.\n\n- Track the curve\n- Cup the result');
  assert.equal(html, '<p><strong>Hello!</strong></p><p>A &quot;first crack&quot; is audible.</p><ul><li>Track the curve</li><li>Cup the result</li></ul>');
  assert.equal(formatChatMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});
