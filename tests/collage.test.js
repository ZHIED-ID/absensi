const test = require('node:test');
const assert = require('node:assert/strict');
const { detect } = require('../collage-utils.js');

function canvas(w, h, rects) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  rects.forEach(([x0, y0, x1, y1, rgb]) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = (y * w + x) * 4; data[p] = rgb[0]; data[p + 1] = rgb[1]; data[p + 2] = rgb[2]; }
  });
  return data;
}

test('mendeteksi laporan gabungan: header putih + dua foto kiri-kanan', () => {
  const w = 1008, h = 1195;
  const data = canvas(w, h, [[24, 315, 984, 321, [40, 90, 255]], [24, 363, 491, 978, [120, 150, 90]], [516, 363, 983, 978, [200, 200, 215]]]);
  const r = detect(data, w, h);
  assert.ok(r);
  assert.ok(Math.abs(r[0][0] - 26) <= 2 && Math.abs(r[0][2] - 489) <= 2);
  assert.ok(Math.abs(r[1][0] - 518) <= 2 && Math.abs(r[1][2] - 981) <= 2);
  assert.ok(r[0][1] >= 363 && r[0][3] <= 978);
});

test('foto biasa (satu foto penuh) tidak dianggap gabungan', () => {
  assert.equal(detect(canvas(600, 800, [[0, 0, 600, 800, [90, 120, 80]]]), 600, 800), null);
});

test('satu foto dengan margin putih tidak dianggap gabungan', () => {
  assert.equal(detect(canvas(600, 800, [[40, 100, 560, 700, [90, 120, 80]]]), 600, 800), null);
});

test('dua panel tanpa jarak putih bukan gabungan', () => {
  assert.equal(detect(canvas(600, 800, [[0, 100, 300, 700, [90, 120, 80]], [300, 100, 600, 700, [200, 120, 80]]]), 600, 800), null);
});

test('input rusak aman', () => {
  assert.equal(detect(null, 10, 10), null);
  assert.equal(detect(new Uint8ClampedArray(4), 100, 100), null);
});
