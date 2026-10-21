#!/usr/bin/env node
/**
 * Imports the owner's rhythm libraries into Echo's data: the melody phrase
 * rhythms and the chord comping patterns, one bar and two.
 *
 *   node scripts/echo/importRhythms.mjs \
 *     "<Melody_Phrase_Rhythm_Library.csv>" \
 *     "<Chord_Comping_1Bar_Patterns.csv>" \
 *     "<Chord_Comping_2Bar_Patterns.csv>"
 *   npx prettier --write src/curriculum/data/echo/melodyRhythms.json \
 *     src/curriculum/data/echo/chordRhythms.json
 *
 * The files may come in any order: each is known by its columns (a melody
 * file has `note_count`, a one-bar comping file `genre_use`). A rhythm is
 * its `computer_array`, [onset, duration] pairs in ticks at 480 a quarter,
 * 1920 a bar of 4/4.
 *
 * WHAT ECHO TAKES
 * Echo plays over a straight 4/4 groove, and a melody call is one contour
 * of three to five notes, so it keeps:
 *
 *   - rhythms on the straight 16th grid: no triplets, no shuffle, not 3/4;
 *   - rows whose grid agrees with their array (a row that disagrees is left
 *     out until the owner says which is right);
 *   - melody rhythms of one bar (three to five notes, a contour's);
 *   - comping that strikes each bar's chord before its last beat, and never
 *     more than three times in a beat.
 *
 * Every row left out is printed with why, and written in the file's
 * `leftOut`. A rhythm that repeats another's exactly (one rhythm in several
 * genres) is kept once, the others named in its `sameAs`, so each distinct
 * rhythm is as likely as the next.
 *
 * THE TIERS (Echo's levels draw on them: echo/levels.ts)
 *
 *   melody  1  quarters and eighths from beat 1, nothing held over a beat,
 *              the last note by beat 4
 *           2  eighths with a syncopation, an offbeat start, or a last note
 *              on the "and" of 4
 *           3  one 16th, from beat 1
 *           4  more 16ths, or a 16th start: the funk
 *
 *   chords  1  on the beats, from beat 1
 *           2  on the eighths, from beat 1
 *           3  eighths off the beat (a skank), or a few 16ths from beat 1
 *              (two a bar at most, two strikes a beat at most)
 *           4  the rest: three strikes a beat at most
 *
 * A comping pattern is read as a chord call plays it: a one-bar pattern
 * struck in both of the call's bars.
 *
 * Plain .mjs with node: imports only, like the other scripts here.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'src/curriculum/data/echo');

const BEAT = 480;
const EIGHTH = 240;
const SIXTEENTH = 120;
const BAR = 1920;

/** One CSV line as its fields: commas inside double quotes stay put. */
function fields(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(field);
      field = '';
    } else field += c;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/** A CSV file's rows, by its header's column names. */
function readRows(path) {
  const [head, ...lines] = readFileSync(path, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.trim());
  const names = fields(head);
  return {
    names,
    rows: lines.map((line) => {
      const values = fields(line);
      return Object.fromEntries(names.map((n, i) => [n, values[i] ?? '']));
    }),
  };
}

/** The onsets a grid writes, x a note on a 16th: null if it doesn't read. */
function gridOnsets(grid) {
  const cells = grid.replace(/\s*\|\s*/g, '');
  if (!/^[x.-]+$/.test(cells)) return null;
  return [...cells].flatMap((c, i) => (c === 'x' ? [i * SIXTEENTH] : []));
}

/**
 * A row's hits, or why it's left out (`{ why }`): the array must read, be on
 * the straight 16th grid, in order, and agree with the grid.
 */
function rowHits(row) {
  if (!row.computer_array) return { why: 'no rhythm' };
  let hits;
  try {
    hits = JSON.parse(row.computer_array);
  } catch {
    return { why: 'the array does not read' };
  }
  if (!Array.isArray(hits) || hits.length === 0) return { why: 'no rhythm' };
  if (!hits.every((h) => h.length === 2 && h.every(Number.isInteger))) {
    return { why: 'the array does not read' };
  }
  if (!hits.every(([o, d]) => o % SIXTEENTH === 0 && d % SIXTEENTH === 0)) {
    return { why: 'triplets or shuffle: not the straight 16th grid' };
  }
  for (let i = 1; i < hits.length; i++) {
    if (hits[i][0] < hits[i - 1][0] + hits[i - 1][1]) {
      return { why: 'notes overlap' };
    }
  }
  const written = gridOnsets(row.grid_notation);
  if (!written) return { why: 'the grid does not read' };
  const onsets = hits.map(([o]) => o);
  if (written.join() !== onsets.join()) {
    return {
      why: `the grid (${written.join(' ')}) and the array (${onsets.join(' ')}) disagree`,
    };
  }
  return { hits };
}

const isEighth = (o) => o % EIGHTH === 0;

/**
 * Offbeat notes held over the beat after them: no note starts on it. In a
 * one-bar melody the beat after the last is the response's, so a note on
 * the "and" of 4 counts.
 */
function syncopations(onsets) {
  const starts = new Set(onsets);
  return onsets.filter(
    (o) => o % BEAT !== 0 && !starts.has((Math.floor(o / BEAT) + 1) * BEAT),
  ).length;
}

function melodyTier(onsets) {
  const sixteenths = onsets.filter((o) => !isEighth(o)).length;
  const fromOne = onsets[0] === 0;
  if (sixteenths === 0) {
    const last = onsets[onsets.length - 1];
    return fromOne && syncopations(onsets) === 0 && last <= 3 * BEAT ? 1 : 2;
  }
  return fromOne && sixteenths === 1 ? 3 : 4;
}

/** Strikes in each beat of a chord call's two bars. */
function strikesPerBeat(onsets) {
  const counts = new Map();
  for (const o of onsets) {
    const beat = Math.floor(o / BEAT);
    counts.set(beat, (counts.get(beat) ?? 0) + 1);
  }
  return Math.max(...counts.values());
}

/** A chord pattern's tier, or why it's left out, over a call's two bars. */
function chordTier(hits, bars) {
  const call =
    bars === 1 ? [...hits, ...hits.map(([o, d]) => [o + BAR, d])] : hits;
  const onsets = call.map(([o]) => o);
  const inBar = (b) =>
    onsets
      .filter((o) => o >= b * BAR && o < (b + 1) * BAR)
      .map((o) => o - b * BAR);
  for (const b of [0, 1]) {
    if (!inBar(b).some((o) => o < 3 * BEAT)) {
      return { why: `bar ${b + 1}'s chord is not struck before its last beat` };
    }
  }
  const perBeat = strikesPerBeat(onsets);
  if (perBeat > 3) return { why: `${perBeat} strikes in a beat` };
  const fromOne = onsets[0] === 0;
  if (onsets.every((o) => o % BEAT === 0) && fromOne) return { tier: 1 };
  if (onsets.every(isEighth)) return { tier: fromOne ? 2 : 3 };
  const sixteenths = Math.max(
    ...[0, 1].map((b) => inBar(b).filter((o) => !isEighth(o)).length),
  );
  return { tier: fromOne && sixteenths <= 2 && perBeat <= 2 ? 3 : 4 };
}

/** Durations clipped at the bar line: a chord changes on it. */
const clipToBars = (hits) =>
  hits.map(([o, d]) => [o, Math.min(d, (Math.floor(o / BAR) + 1) * BAR - o)]);

function importMelody(rows, source) {
  const kept = new Map();
  const leftOut = [];
  for (const row of rows) {
    const read = rowHits(row);
    const notes = Number(row.note_count);
    let why = read.why;
    if (!why && Number(row.bars) !== 1) {
      why = `${row.bars} bars of ${notes} notes: a call is one contour, three to five notes`;
    }
    if (!why && read.hits.some(([o, d]) => o + d > BAR)) {
      why = 'runs past its bar';
    }
    if (!why && notes !== read.hits.length) {
      why = `note_count ${notes}, ${read.hits.length} in the array`;
    }
    if (why) {
      leftOut.push({ id: row.id, why });
      continue;
    }
    const key = JSON.stringify(read.hits);
    const same = kept.get(key);
    if (same) {
      same.sameAs.push(row.id);
      if (!same.genres.includes(row.genre)) same.genres.push(row.genre);
      continue;
    }
    kept.set(key, {
      id: row.id,
      name: row.name,
      notes,
      tier: melodyTier(read.hits.map(([o]) => o)),
      genres: [row.genre],
      grid: row.grid_notation,
      hits: read.hits,
      sameAs: [],
    });
  }
  return {
    about:
      "The owner's melody phrase rhythms (Melody_Phrase_Rhythm_Library.csv), as Echo plays them: one bar each, three to five notes, a contour's notes on them. hits: [onset, duration] in ticks, 480 a quarter. Written by scripts/echo/importRhythms.mjs; its tiers and what it leaves out are in its comment.",
    source,
    tiers: {
      1: 'quarters and eighths from beat 1, nothing held over a beat, the last note by beat 4',
      2: 'eighths with a syncopation, an offbeat start, or a last note on the "and" of 4',
      3: 'one 16th, from beat 1',
      4: 'more 16ths, or a 16th start',
    },
    rhythms: [...kept.values()].sort(
      (a, b) => a.tier - b.tier || a.notes - b.notes,
    ),
    leftOut,
  };
}

function importChords(files) {
  const kept = new Map();
  const leftOut = [];
  for (const { rows, bars } of files) {
    for (const row of rows) {
      const name = row.description || row.genre_use || row.id;
      const said = `${name} ${row.section}`;
      // A bar of 12 cells is the triplet grid, whatever its array says.
      const tripletGrid = row.grid_notation
        .split('|')
        .some((bar) => bar.trim().length === 12);
      const read = rowHits(row);
      let why = /3\/4/.test(said) ? 'not 4/4' : null;
      if (!why && (tripletGrid || /12\/8|triplet|shuffle/i.test(said))) {
        why = "a shuffle or 12/8 feel: Echo's groove is straight";
      }
      why ??= read.why;
      if (!why && read.hits.some(([o]) => o >= bars * BAR)) {
        why = `runs past its ${bars} bar${bars > 1 ? 's' : ''}`;
      }
      const hits = why ? [] : clipToBars(read.hits);
      const graded = why ? null : chordTier(hits, bars);
      why ??= graded.why;
      if (why) {
        leftOut.push({ id: row.id, why });
        continue;
      }
      const key = `${bars}:${JSON.stringify(hits)}`;
      const same = kept.get(key);
      if (same) {
        same.sameAs.push(row.id);
        continue;
      }
      kept.set(key, {
        id: row.id,
        name,
        bars,
        tier: graded.tier,
        style: bars === 1 ? row.genre_use : row.section,
        grid: row.grid_notation,
        hits,
        sameAs: [],
      });
    }
  }
  return {
    about:
      "The owner's chord comping patterns (Chord_Comping_1Bar_Patterns.csv, Chord_Comping_2Bar_Patterns.csv), as Echo's chord calls strike them: a one-bar pattern in each of the call's two bars, a two-bar pattern across both. hits: [onset, duration] in ticks, 480 a quarter. Written by scripts/echo/importRhythms.mjs; its tiers and what it leaves out are in its comment.",
    source: files.map((f) => f.source),
    tiers: {
      1: 'on the beats, from beat 1',
      2: 'on the eighths, from beat 1',
      3: 'eighths off the beat, or a few 16ths from beat 1',
      4: 'the rest, three strikes a beat at most',
    },
    rhythms: [...kept.values()].sort(
      (a, b) => a.tier - b.tier || a.bars - b.bars,
    ),
    leftOut,
  };
}

function main() {
  const paths = process.argv.slice(2);
  if (paths.length !== 3) {
    console.error(
      'Usage: node scripts/echo/importRhythms.mjs <melody.csv> <comping 1-bar.csv> <comping 2-bar.csv>',
    );
    process.exit(1);
  }
  let melody = null;
  const chords = [];
  for (const path of paths) {
    const { names, rows } = readRows(path);
    const source = basename(path);
    if (names.includes('note_count')) melody = { rows, source };
    else if (names.includes('genre_use'))
      chords.push({ rows, bars: 1, source });
    else if (names.includes('description'))
      chords.push({ rows, bars: 2, source });
    else throw new Error(`${source}: not a rhythm library this knows`);
  }
  if (!melody || chords.length !== 2) {
    throw new Error('Give the melody library and both comping files');
  }
  chords.sort((a, b) => a.bars - b.bars);

  const outputs = [
    ['melodyRhythms.json', importMelody(melody.rows, melody.source)],
    ['chordRhythms.json', importChords(chords)],
  ];
  for (const [file, data] of outputs) {
    writeFileSync(join(OUT_DIR, file), `${JSON.stringify(data, null, 2)}\n`);
    const tiers = {};
    for (const r of data.rhythms) tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
    console.log(
      `${file}: ${data.rhythms.length} rhythms (tiers ${JSON.stringify(tiers)}), ${data.leftOut.length} left out`,
    );
    for (const { id, why } of data.leftOut)
      console.log(`  left out ${id}: ${why}`);
  }
}

main();
