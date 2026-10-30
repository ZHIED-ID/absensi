/* Pure OCR text parsing helpers for Marki attendance overlays. */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }
  function parse(text) {
    const original = String(text || '');
    const raw = original
      .replace(/[OoQ]/g, '0')
      .replace(/[I|]/g, '1');
    let date = '', time = '', role = null, timeDigits = 0;
    const dateMatch = raw.match(/(?:^|\D)([0-3]?\d)\s*[-/.]\s*(0?\d|1[0-2])\s*[-/.]\s*(20\d{2})(?!\d)/);
    if (dateMatch) {
      const day = +dateMatch[1], month = +dateMatch[2], year = +dateMatch[3];
      const candidate = `${year}-${pad(month)}-${pad(day)}`;
      if (day >= 1 && day <= 31 && validDate(candidate)) date = candidate;
    }
    const timeMatch = raw.match(/(?:^|\D)(2[0-3]|[01]?\d)\s*[:;]\s*([0-5]\d)(?!\d)/);
    if (timeMatch) {
      const hour = +timeMatch[1], minute = +timeMatch[2];
      if (hour < 24 && minute < 60) { time = `${pad(hour)}:${pad(minute)}`; timeDigits = timeMatch[1].length; }
    }
    if (/jam\s*masuk|absen\s*masuk/i.test(original)) role = 'in';
    else if (/jam\s*keluar|absen\s*keluar/i.test(original)) role = 'out';
    return { date, time, role, timeDigits, text: original };
  }
  function merge(results) {
    const pick = key => {
      const values = results.map(item => item[key]).filter(Boolean);
      const counts = Object.create(null);
      values.forEach(value => { counts[value] = (counts[value] || 0) + 1; });
      const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (!ranked.length || (ranked[1] && ranked[0][1] === ranked[1][1])) return '';
      const [value, count] = ranked[0];
      // A lone one-digit hour is often a clipped leading digit (e.g. 15:14 -> 5:14).
      if (key === 'time' && results.find(item => item[key] === value)?.timeDigits === 1 && count === 1) return '';
      return value;
    };
    return {
      date: pick('date'),
      time: pick('time'),
      timeDigits: results.find(item => item.time === pick('time'))?.timeDigits || 0,
      role: results.find(item => item.role)?.role || null,
      text: results.map(item => item.text).join('\n')
    };
  }
  const api = { parse, merge, validDate };
  root.MarkiOCR = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
