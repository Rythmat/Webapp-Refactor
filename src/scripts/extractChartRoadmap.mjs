/**
 * Reading the roadmap out of the source prop-book PDFs.
 *
 * The song library was parsed out of these PDFs and lost almost everything
 * except the chords: 95.3% of charts carry no roadmap mark, and odd meter had
 * nowhere in the schema to live. The PDFs still have all of it — repeat
 * barlines, 1st/2nd endings, "x4" counts, Fine, and the time-signature changes
 * — so this recovers structure from the source rather than guessing at it.
 *
 * What it deliberately does NOT take:
 *  - chord symbols. The book's own chords are not reliable; those need an ear.
 *  - section letters. The book uses A/B/C rehearsal letters and the library
 *    uses named sections (Intro/Verse/Chorus), which is a deliberate rule.
 *
 * Development-only; never shipped. The book is not in the repo.
 *
 * Usage: node src/scripts/extractChartRoadmap.mjs [--song="Sir Duke"] [--json=out.json]
 */

export const BOOK_DIR =
  '/Users/peterjohnstoltzman/Desktop/PJS Music Master Folder/Charts/NEW BASS SOUL PROP BOOK';

import fs from 'fs';
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

/** Positional text items for one chart. */
export async function items(file) {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    for (const it of (await page.getTextContent()).items) {
      const t = it.str.trim();
      if (!t) continue;
      out.push({ t, x: Math.round(it.transform[4]), y: Math.round(vp.height - it.transform[5]),
                 fs: +Math.abs(it.transform[0]).toFixed(1), p });
    }
  }
  return out;
}

/**
 * A time signature is a digit sitting directly above another digit at the
 * same x — the numerator over the denominator, exactly as engraved.
 */
export function meters(all) {
  const digits = all.filter((i) => /^\d$/.test(i.t));
  const found = [];
  for (const top of digits)
    for (const bot of digits)
      if (top.p === bot.p && Math.abs(top.x - bot.x) <= 4 &&
          bot.y - top.y >= 8 && bot.y - top.y <= 18 &&
          Math.abs(top.fs - bot.fs) < 0.6)
        found.push({ n: +top.t, d: +bot.t, x: top.x, y: top.y, p: top.p });
  // Only real denominators, and only one per position.
  const seen = new Set();
  return found.filter((m) => [2,4,8,16].includes(m.d) && m.n >= 2 && m.n <= 12)
    .filter((m) => { const k = `${m.p}:${m.x}:${m.y}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.p - b.p || a.y - b.y || a.x - b.x);
}

/** Roadmap words and marks the engraver wrote. */
export function roadmap(all) {
  const text = all.map((i) => i.t).join(' ');
  const hits = {};
  const add = (k, n) => { if (n) hits[k] = n; };
  add('ending1', all.filter((i) => /^1\.$/.test(i.t)).length);
  add('ending2', all.filter((i) => /^2\.$/.test(i.t)).length);
  add('ending3', all.filter((i) => /^3\.$/.test(i.t)).length);
  add('repeatDots', all.filter((i) => /^\.\.$/.test(i.t) || /\.\./.test(i.t)).length);
  add('times', all.filter((i) => /^\d+ ?x$/i.test(i.t)).length);
  for (const [k, re] of [
    ['DS', /\bD\.?\s?S\.?/], ['DC', /\bD\.?\s?C\.?/], ['alCoda', /al\s*Coda/i],
    ['alFine', /al\s*Fine/i], ['Fine', /\bFine\b/], ['Coda', /Coda/i],
    ['Solo', /\bSolos?\b/i], ['Vamp', /\bvamp/i], ['Fade', /fade/i],
    ['Break', /\bbreak\b/i], ['Intro', /\bintro\b/i], ['Outro', /\boutro\b/i],
    ['rit', /\brit\b/i], ['Tacet', /tacet/i],
  ]) if (re.test(text)) hits[k] = (text.match(new RegExp(re, 'gi')) || []).length;
  return hits;
}

/** Printed measure numbers at the left margin → bars per system. */
export const measureNumbers = (all) =>
  all.filter((i) => /^\d+$/.test(i.t) && i.x < 85 && i.fs >= 7.5 && i.fs <= 10.5 && +i.t > 1)
     .map((i) => ({ n: +i.t, y: i.y, p: i.p }))
     .sort((a, b) => a.p - b.p || a.y - b.y);
