/* Pure OCR text parsing helpers for Marki attendance overlays (no DOM, testable in Node). */
(function (root) {
  'use strict';
  const pad = n => String(n).padStart(2, '0');

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  /* Free-form text (whole photo or large region): find a date, a time and the Masuk/Keluar label. */
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

  /* Tight crops that contain ONLY the time line and the date line (digits, ':' and '-' whitelisted).
     Here a missing colon / hyphen is tolerated because we know what the line must look like. */
  function parseLines(text) {
    const original = String(text || '');
    let date = '', time = '', timeDigits = 0;
    original.split(/\r?\n/).forEach(line => {
      let s = line.replace(/[OoQ]/g, '0').replace(/[Il|]/g, '1').replace(/\s+/g, '');
      if (!s) return;
      if (!date) {
        const dm = s.match(/(\d{2})[-/.:]?(\d{2})[-/.:]?(20\d{2})(?!\d)/);
        if (dm) {
          const candidate = `${dm[3]}-${dm[2]}-${dm[1]}`;
          if (validDate(candidate)) { date = candidate; s = s.replace(dm[0], ''); }
        }
      }
      if (!time) {
        let tm = s.match(/(?:^|\D)(\d{1,2}):(\d{2})(?!\d)/);
        let digits = 0, hour, minute;
        if (tm) { digits = tm[1].length; hour = +tm[1]; minute = +tm[2]; }
        else {
          tm = s.match(/^(\d{2})(\d{2})$/); // colon dropped by OCR: "1514"
          if (tm) { digits = 2; hour = +tm[1]; minute = +tm[2]; }
        }
        if (digits && hour < 24 && minute < 60) { time = `${pad(hour)}:${pad(minute)}`; timeDigits = digits; }
      }
    });
    return { date, time, role: null, timeDigits, text: original };
  }

  function tally(values) {
    const counts = Object.create(null);
    values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    return counts;
  }

  /* Vote across several OCR reads.
     - date: the most frequent value; a tie is broken by "inside the selected month" (opts.month = 'YYYY-MM').
     - time: the most frequent value. A one-digit hour ("5:14") is a clipped leading digit, so it is never
       trusted on its own; it only supports a two-digit candidate with the same last hour digit and minutes
       ("15:14"). A tie gives ''.
     Returns the winners plus how many reads agreed (dateVotes / timeVotes). */
  function merge(results, opts) {
    opts = opts || {};
    const month = opts.month || '';
    results = (results || []).filter(Boolean);

    const dateCounts = tally(results.map(r => r.date).filter(Boolean));
    const dateRank = Object.entries(dateCounts)
      .map(([value, votes]) => ({ value, votes, inMonth: !!month && value.slice(0, 7) === month }))
      .sort((a, b) => b.votes - a.votes || (b.inMonth - a.inMonth));
    let date = '', dateVotes = 0;
    if (dateRank.length) {
      const [a, b] = dateRank;
      if (!b || a.votes > b.votes || (a.inMonth && !b.inMonth)) { date = a.value; dateVotes = a.votes; }
    }

    const timeReads = results.filter(r => r.time);
    const twoDigit = timeReads.filter(r => r.timeDigits !== 1);
    const timeCounts = tally(twoDigit.map(r => r.time));
    timeReads.filter(r => r.timeDigits === 1).forEach(r => {
      Object.keys(timeCounts).forEach(value => { if (value.slice(1) === r.time.slice(1)) timeCounts[value] += 1; });
    });
    const timeRank = Object.entries(timeCounts).sort((a, b) => b[1] - a[1]);
    let time = '', timeVotes = 0;
    if (timeRank.length && !(timeRank[1] && timeRank[0][1] === timeRank[1][1])) {
      time = timeRank[0][0];
      timeVotes = timeRank[0][1];
    }

    return {
      date, dateVotes,
      time, timeVotes,
      timeDigits: time ? 2 : 0,
      role: results.find(item => item.role)?.role || null,
      text: results.map(item => item.text).join('\n')
    };
  }

  const api = { parse, parseLines, merge, validDate };
  root.MarkiOCR = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
