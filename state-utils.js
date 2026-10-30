/* Simpan & muat progres lewat PDF: state JSON disematkan di properti PDF (Keywords) lalu dibaca kembali.
   Modul murni (tanpa DOM) agar bisa diuji di Node. Isi file yang dimuat dianggap data tak tepercaya → disanitasi. */
(function (root) {
  'use strict';
  const MARK = 'ABSENSI-STATE:';
  const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
  const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/, MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
  const SHIFTS = ['op', 'mid', 'cl', 'full'];

  function toB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromB64(b64) {
    const bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encode(state) { return MARK + toB64(JSON.stringify(Object.assign({ v: 1 }, state))); }
  function extract(text) {
    const m = /ABSENSI-STATE:([A-Za-z0-9+/=]+)/.exec(String(text || ''));
    if (!m) return null;
    try { return JSON.parse(fromB64(m[1])); } catch (e) { return null; }
  }

  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : 0);
  const days = a => Array.isArray(a) ? [...new Set(a.filter(n => Number.isInteger(n) && n >= 1 && n <= 31))].sort((x, y) => x - y) : [];
  const stampOf = (date, time) => {
    if (!DATE.test(date) || !TIME.test(time)) return null;
    const [y, m, d] = date.split('-').map(Number), [h, n] = time.split(':').map(Number);
    return new Date(y, m - 1, d, h, n, 0, 0).getTime();
  };
  function image(o) {
    if (!o || typeof o !== 'object' || !JPEG.test(o.d || '')) return null;
    return { d: o.d, w: int(o.w, 1, 8000), h: int(o.h, 1, 8000) };
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || raw.v !== 1 || !raw.C || typeof raw.C !== 'object') return null;
    if (!MONTH.test(raw.C.mo || '')) return null;
    const C = {
      n: str(raw.C.n, 120), b: str(raw.C.b, 120), mo: raw.C.mo,
      last: int(raw.C.last, 0, 31),
      libur: days(raw.C.libur), sakit: days(raw.C.sakit), izin: days(raw.C.izin),
      note: str(raw.C.note, 300)
    };
    const SH = {}, SW = {};
    if (raw.SH && typeof raw.SH === 'object') Object.keys(raw.SH).forEach(k => { if (/^([1-9]|[12]\d|3[01])$/.test(k) && SHIFTS.includes(raw.SH[k])) SH[k] = raw.SH[k]; });
    if (raw.SW && typeof raw.SW === 'object') Object.keys(raw.SW).forEach(k => { if (/^([1-9]|[12]\d|3[01])$/.test(k) && raw.SW[k] === true) SW[k] = true; });
    const P = [];
    (Array.isArray(raw.P) ? raw.P.slice(0, 200) : []).forEach(p => {
      if (!p || typeof p !== 'object' || !/^[A-Za-z0-9_-]{1,64}$/.test(p.id || '')) return;
      const date = DATE.test(p.date || '') ? p.date : '', time = TIME.test(p.time || '') ? p.time : '', img = image(p) || { d: '', w: 0, h: 0 };
      const out = {
        id: p.id, name: str(p.name, 200) || 'foto.jpg', date, time, t: stampOf(date, time),
        role: p.role === 'in' || p.role === 'out' ? p.role : null,
        conf: ['high', 'low', 'manual'].includes(p.conf) ? p.conf : '',
        src: ['ocr', 'partial', 'manual'].includes(p.src) ? p.src : 'manual',
        ocrTier: int(p.ocrTier, 0, 3), d: img.d, w: img.w, h: img.h
      };
      if (SHIFTS.includes(p.shift)) out.shift = p.shift;
      P.push(out);
    });
    return { C, SH, SW, doc: image(raw.doc), P };
  }

  const api = { encode, extract, sanitize };
  root.AbsensiState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
