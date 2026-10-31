/* Deteksi foto gabungan (mis. "Laporan kerja" Marki): dua foto kiri-kanan dipisah jarak putih.
   Modul murni (tanpa DOM) agar bisa diuji di Node. data = RGBA (Uint8ClampedArray), w x h piksel. */
(function (root) {
  'use strict';
  const WHITE = 240; // piksel dianggap "bukan putih" jika kanal terendahnya di bawah ini

  function runs(values, limit) {
    const out = []; let s = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > limit && s < 0) s = i;
      if (values[i] <= limit && s >= 0) { out.push([s, i]); s = -1; }
    }
    if (s >= 0) out.push([s, values.length]);
    return out;
  }

  /* Mengembalikan [[x0,y0,x1,y1],[x0,y0,x1,y1]] (kiri, kanan; x1/y1 eksklusif) atau null jika bukan foto gabungan. */
  function detect(data, w, h) {
    if (!data || w < 40 || h < 40 || data.length < w * h * 4) return null;
    const nw = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 4) nw[i] = Math.min(data[p], data[p + 1], data[p + 2]) < WHITE ? 1 : 0;

    const rowFrac = new Float32Array(h);
    for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) n += nw[y * w + x]; rowFrac[y] = n / w; }
    const band = runs(rowFrac, 0.5).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
    if (!band || band[1] - band[0] < h * 0.25) return null;
    const [y0, y1] = band;

    const colFrac = new Float32Array(w);
    for (let x = 0; x < w; x++) { let n = 0; for (let y = y0; y < y1; y++) n += nw[y * w + x]; colFrac[x] = n / (y1 - y0); }
    const panels = runs(colFrac, 0.5).filter(r => r[1] - r[0] >= w * 0.3);
    if (panels.length !== 2) return null;

    const [a, b] = panels, gap = b[0] - a[1];
    if (gap < w * 0.01 || gap > w * 0.2) return null;
    let gutter = 0; for (let x = a[1]; x < b[0]; x++) gutter += colFrac[x];
    if (gutter / gap > 0.1) return null; // jarak tengah harus benar-benar putih

    const inset = 2, box = r => [r[0] + inset, y0 + inset, r[1] - inset, y1 - inset];
    const out = [box(a), box(b)];
    for (const [x0, ty0, x1, ty1] of out) {
      const ratio = (ty1 - ty0) / (x1 - x0);
      if (!(ratio > 0.6 && ratio < 2.5)) return null;
    }
    return out;
  }

  const api = { detect };
  root.MarkiCollage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
