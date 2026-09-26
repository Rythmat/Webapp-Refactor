/**
 * Reading structure back out of the source prop-book PDFs.
 *
 * The song library was parsed out of these PDFs and kept little but the
 * chords: 95.3% of charts carry no roadmap mark, and odd meter had nowhere in
 * the schema to live. The PDFs still have all of it.
 *
 * The books are bass parts, so most pages are full notation. None of that is
 * relevant and none of it is read here. What makes that easy is that the
 * engraver used a separate font for each kind of thing — one for the notes,
 * one for the chord symbols, one for the measure numbers — so the numbers can
 * be lifted out without going anywhere near a notehead. Font *names* differ
 * per file (`g_d0_f3` in one, `g_d1_f5` in the next), so fonts are identified
 * by what they contain, never by name.
 *
 * What it deliberately does NOT read:
 *  - chord symbols. The book's own chords are not reliable; those need an ear.
 *  - section letters. The book uses A/B/C rehearsal marks and the library uses
 *    named sections (Intro/Verse/Chorus), which is a deliberate rule.
 *  - the bass line, clefs, rests, beams — the entire notation layer.
 *
 * Development-only; never shipped. The book is not in the repo.
 *
 * Usage:
 *   node src/scripts/extractChartRoadmap.mjs --song="Sir Duke"
 *   node src/scripts/extractChartRoadmap.mjs --json=/tmp/pdfFacts.json
 */

/* global process */
import fs from 'fs';
import path from 'path';

export const BOOK_DIR =
  '/Users/peterjohnstoltzman/Desktop/PJS Music Master Folder/Charts/NEW BASS SOUL PROP BOOK';

const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

/** Every text item with its position, page and font. */
export async function readItems(file) {
  const doc = await getDocument({
    data: new Uint8Array(fs.readFileSync(file)),
  }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    for (const it of (await page.getTextContent()).items) {
      const t = it.str.trim();
      if (!t) continue;
      out.push({
        t,
        x: Math.round(it.transform[4]),
        y: Math.round(vp.height - it.transform[5]),
        fs: +Math.abs(it.transform[0]).toFixed(1),
        font: it.fontName,
        p,
      });
    }
  }
  return { items: out, pages: doc.numPages };
}

/**
 * The font the engraver used for measure numbers: every item in it is a plain
 * integer, they ascend down the page, and there are several. Nothing else in
 * these files looks like that.
 */
export function measureNumberFont(items) {
  const byFont = new Map();
  for (const i of items) {
    if (!byFont.has(i.font)) byFont.set(i.font, []);
    byFont.get(i.font).push(i);
  }
  let best = null;
  for (const [font, list] of byFont) {
    if (list.length < 3) continue;
    if (!list.every((i) => /^\d{1,3}$/.test(i.t))) continue;
    const order = [...list].sort((a, b) => a.p - b.p || a.y - b.y);
    const nums = order.map((i) => +i.t);
    const ascending = nums.every((n, k) => k === 0 || n > nums[k - 1]);
    if (!ascending) continue;
    if (!best || list.length > best.list.length) best = { font, list: order };
  }
  return best;
}

/** Where each system starts, in bars — read straight off the page. */
export function systemStarts(items) {
  const found = measureNumberFont(items);
  if (!found) return [];
  return found.list.map((i) => ({ bar: +i.t, y: i.y, p: i.p }));
}

/**
 * How many bars the chart has.
 *
 * The printed numbers mark the first bar of each system, so they give the
 * length of every system but the last. `atLeast` is what the page proves;
 * `estimate` assumes the final system is as long as the commonest one.
 */
export function barCount(items) {
  const starts = systemStarts(items);
  if (starts.length === 0) return null;
  const lengths = starts
    .slice(1)
    .map((s, k) => s.bar - starts[k].bar)
    .filter((n) => n > 0 && n <= 16);
  if (lengths.length === 0) return null;
  const tally = new Map();
  for (const n of lengths) tally.set(n, (tally.get(n) ?? 0) + 1);
  const usual = [...tally].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const last = starts[starts.length - 1].bar;
  return {
    atLeast: last,
    estimate: last + usual - 1,
    systems: starts.length,
    usualSystem: usual,
    lengths,
  };
}

/**
 * Time signatures: a digit sitting directly above another digit, in the music
 * font, at the same x. That is what a time signature is on a page.
 *
 * Measure numbers are excluded by font, which is what stops "5" over "4" in
 * two different systems being read as a 5/4.
 */
export function meters(items) {
  const mnFont = measureNumberFont(items)?.font;
  const digits = items.filter(
    (i) => /^\d$/.test(i.t) && i.font !== mnFont && i.fs >= 8,
  );
  const found = [];
  for (const top of digits)
    for (const bot of digits)
      if (
        top.p === bot.p &&
        top.font === bot.font &&
        Math.abs(top.x - bot.x) <= 3 &&
        bot.y - top.y >= 8 &&
        bot.y - top.y <= 17 &&
        Math.abs(top.fs - bot.fs) < 0.5 &&
        [2, 4, 8, 16].includes(+bot.t) &&
        +top.t >= 2 &&
        +top.t <= 12
      )
        found.push({ n: +top.t, d: +bot.t, x: top.x, y: top.y, p: top.p });

  const seen = new Set();
  return found
    .filter((m) => {
      const k = `${m.p}:${m.x}:${m.y}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.p - b.p || a.y - b.y || a.x - b.x);
}

/** Marks the engraver wrote that say how the chart is read. */
export function roadmap(items) {
  const words = items.filter((i) => /[A-Za-z]/.test(i.t));
  const text = words.map((i) => i.t).join(' ');
  const countItems = (re) => items.filter((i) => re.test(i.t)).length;
  const word = (re) => words.some((i) => re.test(i.t));

  return {
    endings: {
      first: countItems(/^1\.$/),
      second: countItems(/^2\.$/),
      third: countItems(/^3\.$/),
    },
    repeatDots: countItems(/\.\./),
    // "x4" / "6x" — how many times a passage is played.
    times: items
      .filter((i) => /^\d{1,2}\s?x$|^x\s?\d{1,2}$/i.test(i.t))
      .map((i) => i.t),
    fine: word(/^Fine$/i),
    // Only whole-word matches: "D" then "C" as chord symbols must not read
    // as a D.C., which is why this looks at items and not joined text.
    ds: word(/^D\.?\s?S\.?(\s|$)/) || /\bD\.\s?S\./.test(text),
    dc: word(/^D\.?\s?C\.?(\s|$)/) || /\bD\.\s?C\./.test(text),
    coda: word(/coda/i),
    segno: word(/segno/i),
    labels: words
      .filter((i) =>
        /^(intro|outro|verse|chorus|bridge|solos?|vamp|tag|break|head|interlude|ending|out)$/i.test(
          i.t,
        ),
      )
      .map((i) => ({ t: i.t, y: i.y, p: i.p })),
    cues: words
      .filter((i) => /fade|rit\.|tacet|break|solo|unis|fill/i.test(i.t))
      .map((i) => i.t),
  };
}

/**
 * Which bar a mark sits on.
 *
 * The printed measure numbers give the first bar of each system and where that
 * system is on the page, so a mark's y says which system it is in and its x
 * says how far along. Bar width is even across a system, so this is close
 * enough to point a reader at the right place — it is an aid to review, not a
 * measurement, and the review doc says so.
 */
export function barAt(starts, mark, lengths) {
  const above = starts
    .filter((s) => s.p === mark.p && s.y <= mark.y + 6)
    .sort((a, b) => b.y - a.y)[0];
  // The first system carries no printed number — it starts at bar 1.
  if (!above) {
    if (mark.p !== 1) return null;
    const first = starts[0];
    if (!first || mark.y > first.y) return null;
    const len = Math.max(1, (first.bar ?? 5) - 1);
    const along = Math.min(
      len - 1,
      Math.max(0, Math.floor(((mark.x - 90) / (570 - 90)) * len)),
    );
    return { bar: 1 + along, system: 1, systemBar: 1 };
  }
  const idx = starts.findIndex((s) => s.p === above.p && s.y === above.y);
  const len = lengths?.[idx + 1] ?? lengths?.[idx] ?? 4;
  const LEFT = 90;
  const RIGHT = 570;
  const along = Math.min(
    len - 1,
    Math.max(0, Math.floor(((mark.x - LEFT) / (RIGHT - LEFT)) * len)),
  );
  return { bar: above.bar + along, system: idx + 1, systemBar: above.bar };
}

/** Everything worth knowing about one chart, notation ignored. */
export async function readChart(file) {
  const { items, pages } = await readItems(file);
  const starts = systemStarts(items);
  const bars = barCount(items);
  const lengths = bars ? [...bars.lengths, bars.usualSystem] : [];
  const m = meters(items).map((x) => ({ ...x, at: barAt(starts, x, lengths) }));
  return {
    file: path.basename(file, '.pdf'),
    pages,
    bars,
    meters: m,
    roadmap: roadmap(items),
  };
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = arg('song');
  const jsonOut = arg('json');
  const files = fs
    .readdirSync(BOOK_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .filter((f) => !only || f.toLowerCase().includes(only.toLowerCase()))
    .sort();

  const all = [];
  let n = 0;
  for (const f of files) {
    try {
      all.push(await readChart(path.join(BOOK_DIR, f)));
    } catch (e) {
      all.push({ file: f, error: String(e).slice(0, 120) });
    }
    if (++n % 100 === 0) process.stderr.write(`  ${n}/${files.length}\n`);
  }

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify(all, null, 1));
    console.log(`wrote ${all.length} charts to ${jsonOut}`);
  } else {
    for (const c of all) console.log(JSON.stringify(c, null, 1));
  }
}
