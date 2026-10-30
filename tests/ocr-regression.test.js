const test = require('node:test');
const assert = require('node:assert/strict');
const { parse, merge, validDate } = require('../ocr-utils.js');

test('reads the standard Jam Masuk overlay', () => {
  const result = parse('Jam Masuk Kamis 08:58 | 01-10-2026');
  assert.equal(result.date, '2026-10-01');
  assert.equal(result.time, '08:58');
  assert.equal(result.role, 'in');
});

test('reads the Jam Keluar overlay and role', () => {
  const result = parse('Jam Keluar 15:14 | 01-10-2026');
  assert.equal(result.date, '2026-10-01');
  assert.equal(result.time, '15:14');
  assert.equal(result.role, 'out');
});

test('reads Marki Cam date and time without a vertical separator', () => {
  const result = parse('23:44 Sabtu 03-10-2026');
  assert.equal(result.date, '2026-10-03');
  assert.equal(result.time, '23:44');
});

test('reads labeled Waktu and Tanggal layout', () => {
  const result = parse('Waktu: 13:20 Tanggal: 04-10-2026 Minggu');
  assert.equal(result.date, '2026-10-04');
  assert.equal(result.time, '13:20');
});

test('does not guess a clipped one-digit hour from a single OCR pass', () => {
  const single = parse('5:14 01-10-2026');
  assert.equal(merge([single]).time, '');
  const confirmed = parse('15:14 01-10-2026');
  assert.equal(merge([confirmed, confirmed]).time, '15:14');
});

test('rejects truncated dates and impossible times', () => {
  assert.equal(parse('08:58 01-10-').date, '');
  assert.equal(parse('24:70 01-10-2026').time, '');
  assert.equal(validDate('2026-02-30'), false);
});

test('does not mistake coordinates or the date label for an attendance time', () => {
  const result = parse('Tanggal: 04-10-2026 Koordinat: 6,359892° E Waktu diverifikasi');
  assert.equal(result.date, '2026-10-04');
  assert.equal(result.time, '');
});

test('a confirmed leading-zero hour is accepted by candidate merge', () => {
  const result = parse('08:58 01-10-2026');
  assert.equal(merge([result]).time, '08:58');
});

test('does not interpret a dotted date separator as a clock separator', () => {
  const result = parse('03.10.2026');
  assert.equal(result.date, '2026-10-03');
  assert.equal(result.time, '');
});

/* ---- parseLines: tight crops of only the time line / date line ---- */
const { parseLines } = require('../ocr-utils.js');

test('parseLines reads stacked time + date crops', () => {
  const result = parseLines('15:14\n01-10-2026');
  assert.equal(result.time, '15:14');
  assert.equal(result.timeDigits, 2);
  assert.equal(result.date, '2026-10-01');
});

test('parseLines tolerates a dropped colon and dropped hyphens', () => {
  const result = parseLines('0858\n01102026');
  assert.equal(result.time, '08:58');
  assert.equal(result.date, '2026-10-01');
});

test('parseLines handles time and date on one line', () => {
  const result = parseLines('23:44 03-10-2026');
  assert.equal(result.time, '23:44');
  assert.equal(result.date, '2026-10-03');
});

test('parseLines rejects impossible values and flags a clipped hour', () => {
  assert.equal(parseLines('99:99\n32-13-2026').time, '');
  assert.equal(parseLines('99:99\n32-13-2026').date, '');
  assert.equal(parseLines('5:14\n01-10-2026').timeDigits, 1);
});

/* ---- merge: voting across reads ---- */
test('merge counts agreeing reads (votes) for date and time', () => {
  const read = parseLines('08:58\n01-10-2026');
  const merged = merge([read, read, parseLines('08:50\n01-10-2026')], { month: '2026-10' });
  assert.equal(merged.time, '08:58');
  assert.equal(merged.timeVotes, 2);
  assert.equal(merged.date, '2026-10-01');
  assert.equal(merged.dateVotes, 3);
});

test('merge: a clipped "5:14" supports "15:14" instead of being trusted alone', () => {
  const merged = merge([parseLines('5:14\n01-10-2026'), parseLines('15:14\n01-10-2026')]);
  assert.equal(merged.time, '15:14');
  assert.equal(merged.timeVotes, 2);
});

test('merge: two identical clipped reads are still not trusted', () => {
  const clipped = parseLines('5:14\n01-10-2026');
  assert.equal(merge([clipped, clipped]).time, '');
});

test('merge: date tie is broken by the selected month', () => {
  const a = parseLines('08:58\n01-10-2026');
  const b = parseLines('08:58\n01-11-2026');
  assert.equal(merge([a, b], { month: '2026-10' }).date, '2026-10-01');
  assert.equal(merge([a, b]).date, '');
});

test('merge: conflicting times with equal votes give no time', () => {
  const merged = merge([parseLines('08:58\n01-10-2026'), parseLines('09:58\n01-10-2026')]);
  assert.equal(merged.time, '');
});
