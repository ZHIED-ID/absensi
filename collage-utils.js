/* Deteksi foto gabungan (mis. "Laporan kerja" Marki): beberapa foto dipisah jarak putih (kiri-kanan, bisa beberapa baris).
   Modul murni (tanpa DOM) agar bisa diuji di Node. data = RGBA (Uint8ClampedArray), w x h piksel. */
(function (root) {
  'use strict';
  const WHITE = 248; // piksel dianggap "bukan putih" jika kanal terendahnya di bawah ini

  function runs(values, limit) {
    const out = []; let s = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > limit && s < 0) s = i;
      if (values[i] <= limit && s >= 0) { out.push([s, i]); s = -1; }
    }
    if (s >= 0) out.push([s, values.length]);
    return out;
  }

  /* Mengembalikan daftar kotak [x0,y0,x1,y1] (x1/y1 eksklusif) berurutan baris demi baris, kiri ke kanan,
     atau null jika bukan foto gabungan. Syarat: ada minimal satu baris berisi dua foto yang dipisah jarak putih. */
  function detect(data, w, h) {
    if (!data || w < 40 || h < 40 || data.length < w * h * 4) return null;
    const nw = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < w * h; i++, p += 4) nw[i] = Math.min(data[p], data[p + 1], data[p + 2]) < WHITE ? 1 : 0;

    const rowFrac = new Float32Array(h);
    for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) n += nw[y * w + x]; rowFrac[y] = n / w; }
    const bands = runs(rowFrac, 0.3).filter(r => r[1] - r[0] >= h * 0.12); // garis/teks header terlalu tipis
    if (!bands.length) return null;

    const inset = 2, panels = []; let pair = false;
    for (const [y0, y1] of bands) {
      const colFrac = new Float32Array(w);
      for (let x = 0; x < w; x++) { let n = 0; for (let y = y0; y < y1; y++) n += nw[y * w + x]; colFrac[x] = n / (y1 - y0); }
      const cols = runs(colFrac, 0.05).filter(r => r[1] - r[0] >= w * 0.3);
      if (cols.length > 1) pair = true;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (c[1] - c[0] > w * 0.6) return null; // satu foto lebar penuh = foto biasa
        if (i > 0) { const gap = c[0] - cols[i - 1][1]; if (gap < w * 0.01 || gap > w * 0.2) return null; }
        const box = [c[0] + inset, y0 + inset, c[1] - inset, y1 - inset], ratio = (box[3] - box[1]) / (box[2] - box[0]);
        if (!(ratio > 0.6 && ratio < 2.5)) return null;
        panels.push(box);
      }
    }
    return pair && panels.length >= 2 && panels.length <= 12 ? panels : null;
  }

  /* Dua foto dari satu gambar harus berisi satu masuk dan satu pulang. a = kiri, b = kanan ({role,date,time}).
     Jenis hasil badge/OCR dipakai bila saling melengkapi; bila kembar atau kosong, pakai tanggal/jam, terakhir urutan kiri = masuk. */
  function resolvePair(a, b) {
    const opp = r => (r === 'in' ? 'out' : r === 'out' ? 'in' : null);
    if (a.role && b.role && a.role !== b.role) return [a.role, b.role];
    if (a.role && !b.role) return [a.role, opp(a.role)];
    if (!a.role && b.role) return [opp(b.role), b.role];
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? ['in', 'out'] : ['out', 'in'];
    if (a.date && a.date === b.date && a.time && b.time && a.time !== b.time) return a.time < b.time ? ['in', 'out'] : ['out', 'in'];
    return ['in', 'out'];
  }

  /* Dua foto dari satu gambar biasanya satu hari kerja: tanggal yang gagal dibaca dilengkapi dari pasangannya.
     Pulang dini hari (< 06:00) jatuh di tanggal kalender berikutnya dari masuk. Mengubah objek a/b langsung. */
  const mins = t => (/^\d\d:\d\d$/.test(t || '') ? +t.slice(0, 2) * 60 + +t.slice(3) : null);
  const early = p => p.role === 'out' && mins(p.time) !== null && mins(p.time) < 360;
  function shiftDay(date, n) {
    const [y, m, d] = date.split('-').map(Number), t = new Date(y, m - 1, d + n);
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }
  function inheritDate(a, b) {
    const fill = (miss, have) => {
      if (miss.date || !/^\d{4}-\d{2}-\d{2}$/.test(have.date || '')) return;
      let d = have.date;
      if (early(have) && miss.role === 'in') d = shiftDay(d, -1);
      else if (early(miss) && have.role === 'in') d = shiftDay(d, 1);
      miss.date = d;
    };
    fill(a, b); fill(b, a);
  }

  const api = { detect, resolvePair, inheritDate };
  root.MarkiCollage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
