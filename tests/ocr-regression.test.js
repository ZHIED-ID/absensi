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
