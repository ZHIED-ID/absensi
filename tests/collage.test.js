const test = require('node:test');
const assert = require('node:assert/strict');
const { detect, resolvePair, inheritDate } = require('../collage-utils.js');

function canvas(w, h, rects, noise) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  if (noise) for (let i = 0; i < w * h; i++) { const v = 255 - ((i * 7919) % (noise + 1)); data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v; }
  rects.forEach(([x0, y0, x1, y1, rgb]) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = (y * w + x) * 4; data[p] = rgb[0]; data[p + 1] = rgb[1]; data[p + 2] = rgb[2]; }
  });
  return data;
}
const G = [90, 120, 80], B = [200, 120, 80], HEAD = [40, 90, 255];
const near = (a, b) => Math.abs(a - b) <= 3;

test('laporan 2 foto: header putih + dua foto kiri-kanan', () => {
  const w = 1008, h = 1195;
  const r = detect(canvas(w, h, [[24, 315, 984, 321, HEAD], [24, 363, 491, 978, G], [516, 363, 983, 978, B]]), w, h);
  assert.equal(r.length, 2);
  assert.ok(near(r[0][0], 26) && near(r[0][2], 489) && near(r[1][0], 518) && near(r[1][2], 981));
  assert.ok(r[0][1] >= 363 && r[0][3] <= 978);
});

test('laporan 4 foto (grid 2x2): semua foto terdeteksi, urut baris demi baris', () => {
  const w = 1008, h = 1700;
  const r = detect(canvas(w, h, [[24, 363, 491, 800, G], [516, 363, 983, 800, B], [24, 830, 491, 1270, B], [516, 830, 983, 1270, G]]), w, h);
  assert.equal(r.length, 4);
  assert.ok(r[0][1] < r[2][1] && r[0][0] < r[1][0] && r[2][0] < r[3][0]);
});

test('laporan 3 foto (2 + 1): foto sendirian di baris kedua tetap ikut', () => {
  const w = 1008, h = 1700;
  const r = detect(canvas(w, h, [[24, 363, 491, 800, G], [516, 363, 983, 800, B], [24, 830, 491, 1270, B]]), w, h);
  assert.equal(r.length, 3);
});

test('panel yang sangat terang (dinding abu-abu muda) tetap terdeteksi', () => {
  const w = 1008, h = 1195;
  const r = detect(canvas(w, h, [[24, 363, 491, 978, G], [516, 363, 983, 978, [244, 244, 244]], [700, 500, 850, 900, [60, 50, 50]]]), w, h);
  assert.equal(r && r.length, 2);
});

test('derau kompresi JPEG pada latar putih tidak merusak deteksi', () => {
  const w = 1008, h = 1195;
  const r = detect(canvas(w, h, [[24, 363, 491, 978, G], [516, 363, 983, 978, B]], 4), w, h);
  assert.equal(r && r.length, 2);
});

test('foto biasa, foto dengan margin putih, dan dua panel tanpa jarak bukan gabungan', () => {
  assert.equal(detect(canvas(600, 800, [[0, 0, 600, 800, G]]), 600, 800), null);
  assert.equal(detect(canvas(600, 800, [[40, 100, 560, 700, G]]), 600, 800), null);
  assert.equal(detect(canvas(600, 800, [[0, 100, 300, 700, G], [300, 100, 600, 700, B]]), 600, 800), null);
});

test('dua baris foto tunggal (tanpa pasangan kiri-kanan) bukan gabungan', () => {
  assert.equal(detect(canvas(600, 1400, [[100, 50, 500, 650, G], [100, 750, 500, 1350, B]]), 600, 1400), null);
});

test('input rusak aman', () => {
  assert.equal(detect(null, 10, 10), null);
  assert.equal(detect(new Uint8ClampedArray(4), 100, 100), null);
});

test('resolvePair: jenis yang saling melengkapi dipertahankan', () => {
  assert.deepEqual(resolvePair({ role: 'in' }, { role: 'out' }), ['in', 'out']);
  assert.deepEqual(resolvePair({ role: 'out' }, { role: 'in' }), ['out', 'in']);
  assert.deepEqual(resolvePair({ role: 'in' }, { role: null }), ['in', 'out']);
  assert.deepEqual(resolvePair({ role: null }, { role: 'in' }), ['out', 'in']);
});

test('resolvePair: jenis kembar/kosong diselesaikan lewat tanggal, jam, lalu urutan', () => {
  assert.deepEqual(resolvePair({ role: 'out', date: '2026-10-04', time: '13:20' }, { role: 'out', date: '2026-10-04', time: '23:48' }), ['in', 'out']);
  assert.deepEqual(resolvePair({ role: null, date: '2026-10-04', time: '23:48' }, { role: null, date: '2026-10-04', time: '13:20' }), ['out', 'in']);
  assert.deepEqual(resolvePair({ role: null, date: '2026-10-04' }, { role: null, date: '2026-10-05' }), ['in', 'out']);
  assert.deepEqual(resolvePair({ role: null }, { role: null }), ['in', 'out']);
});

test('inheritDate: tanggal yang kosong dilengkapi dari foto pasangannya', () => {
  const a = { role: 'in', date: '', time: '13:20' }, b = { role: 'out', date: '2026-10-04', time: '23:48' };
  inheritDate(a, b);
  assert.equal(a.date, '2026-10-04');
  assert.equal(b.date, '2026-10-04');
});

test('inheritDate: pulang dini hari berarti masuk di hari sebelumnya, dan sebaliknya', () => {
  const a = { role: 'in', date: '', time: '22:00' }, b = { role: 'out', date: '2026-10-05', time: '00:30' };
  inheritDate(a, b);
  assert.equal(a.date, '2026-10-04');
  const c = { role: 'in', date: '2026-10-31', time: '22:00' }, d = { role: 'out', date: '', time: '00:30' };
  inheritDate(c, d);
  assert.equal(d.date, '2026-11-01');
});

test('inheritDate: tidak menimpa tanggal yang sudah ada dan aman bila keduanya kosong', () => {
  const a = { role: 'in', date: '2026-10-03', time: '09:00' }, b = { role: 'out', date: '2026-10-04', time: '17:00' };
  inheritDate(a, b);
  assert.equal(a.date, '2026-10-03');
  const c = { role: 'in', date: '', time: '' }, d = { role: 'out', date: '', time: '' };
  inheritDate(c, d);
  assert.equal(c.date, '');
});
