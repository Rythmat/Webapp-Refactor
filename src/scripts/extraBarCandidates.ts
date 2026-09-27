import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';

/**
 * Sections written 4k+1 bars long, and the bar that might not belong.
 *
 * 18.9% of sections have an odd bar count and about half of those are exactly
 * one bar past a four-bar phrase. The theory the chart work plan wants tested
 * is that the extra bar duplicates its neighbour and got there by a parsing
 * slip. This measures it: for every 4k+1 section it finds the deletions that
 * would take the section back to 4k *without any chord leaving the section*,
 * and classifies the bar each one would drop.
 *
 * It decides nothing and writes nothing back. A deletion changes what is
 * played, so every row is a question for the owner; `reviewMarkdown` lays them
 * out as the sheet he answers on. See `__tests__/extraBarCandidates.run.test.ts`
 * for how to run it over the corpus.
 */

/** Everything on a bar that is not a chord. A bar carrying any of these is
 *  never a deletion candidate: dropping it would drop the mark with it. */
const ROADMAP_KEYS = [
  'fermata',
  'restBars',
  'repeatStart',
  'repeatEnd',
  'repeatTimes',
  'ending',
  'segno',
  'coda',
  'toCoda',
  'jump',
  'fine',
  'cue',
  'keyChange',
] as const satisfies readonly (keyof ChordBar)[];

const marksOf = (bar: ChordBar) =>
  ROADMAP_KEYS.filter((key) => bar[key] !== undefined);

/** Key order in the song files is incidental, so sort before comparing. */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
};

/** Two bars with the same key are the same bar: chords, beats, durations,
 *  voicing hints and roadmap marks all alike. */
export const barKey = (bar: ChordBar) => JSON.stringify(canonical(bar));

/** The same, with the roadmap marks ignored. */
const chordsKey = (bar: ChordBar) =>
  JSON.stringify(canonical({ chords: bar.chords }));

/** A `restBars` bar stands for several bars of the phrase, so a section's
 *  written length and its played length come apart. */
const playedLength = (section: SongSection) =>
  section.bars.reduce((total, bar) => total + (bar.restBars ?? 1), 0);

/** Sections numbered off one name: Verse 1, Verse 2, Verse 3 → 'Verse'. */
export const labelFamily = (label: string) => label.replace(/\s+\d+$/, '');

export type ExtraBarClass =
  | 'duplicate of the bar before it'
  | 'duplicate of the bar after it'
  | 'empty'
  | 'distinct'
  /** Written 4k+1, but a multi-bar rest makes the played phrase 4k. */
  | 'no extra bar to find';

export interface ExtraBarRow {
  songId: string;
  title: string;
  sectionId: string;
  label: string;
  /** Written bars in the section. */
  length: number;
  /** 1-indexed bar the script would drop. 0 when there is nothing to drop. */
  bar: number;
  /** 1-indexed bar it duplicates, or the bar beside an empty one. */
  neighbour: number;
  /** Bars in the run this bar belongs to. 1 for a lone empty bar. */
  run: number;
  /** Deletions available that lose no chord. 1 means the answer is forced. */
  choices: number;
  /** Where in the section the deletion falls. */
  position: 'end' | 'head' | 'inside' | 'none';
  cls: ExtraBarClass;
  /** Sort rank: 1 is the most obviously safe, 7 is not a candidate at all. */
  tier: number;
  /** 1-indexed bar of a pair that matches on chords but not on marks, in a
   *  section otherwise called distinct. 0 when there is none. */
  blockedAt: number;
  /** Which mark holds it back — a repeat barline, a fermata, a cue. */
  blockedBy: string;
}

interface Spot {
  start: number;
  end: number;
  empty: boolean;
}

/**
 * Every place in a section where one bar could be deleted without a chord
 * leaving the section.
 *
 * Two kinds qualify. A run of adjacent identical bars: the chord survives in
 * the other members, and deleting any one of them leaves the same section, so a
 * run is one choice and not L. And a bar holding no chords, which takes nothing
 * with it either way. Empty bars form runs too — three empty bars in a row are
 * one choice, not three.
 *
 * A bar carrying a roadmap mark is never a spot: the mark would go with it.
 */
function removableSpots(bars: ChordBar[]): Spot[] {
  const free = (i: number) => marksOf(bars[i]).length === 0;
  const spots: Spot[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (!free(i)) continue;
    let end = i;
    while (
      end + 1 < bars.length &&
      free(end + 1) &&
      barKey(bars[end + 1]) === barKey(bars[i])
    )
      end += 1;
    const empty = bars[i].chords.length === 0;
    if (end > i || empty) spots.push({ start: i, end, empty });
    i = end;
  }
  return spots;
}

/**
 * An adjacent pair holding the same chords where one of them carries a
 * roadmap mark, which is why the strict rule did not see a run.
 *
 * Collapsing repeated sections into repeat signs puts a barline on a section's
 * first and last bar, and that is often exactly the bar a duplicate pair would
 * have nominated. Deleting it would take the barline with it, so it is not a
 * deletion — the barline has to move first. Reported separately rather than
 * quietly counted as a five-bar phrase.
 */
function markBlockedPair(bars: ChordBar[]): { at: number; by: string } {
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].chords.length === 0) continue;
    if (chordsKey(bars[i]) !== chordsKey(bars[i - 1])) continue;
    const marks = [...marksOf(bars[i]), ...marksOf(bars[i - 1])];
    // Any mark blocks it, not only a barline: naming which one is the
    // difference between an instruction the owner can follow and a guess.
    if (marks.length > 0)
      return { at: i + 1, by: [...new Set(marks)].join(', ') };
  }
  return { at: 0, by: '' };
}

/** Null for a section that is not written 4k+1 bars long. */
export function classifySection(
  song: Pick<Song, 'id' | 'title'>,
  section: SongSection,
): ExtraBarRow | null {
  const bars = section.bars;
  const n = bars.length;
  // k >= 1: a one-bar section is not a four-bar phrase with a bar too many.
  if (n <= 1 || n % 4 !== 1) return null;

  const base = {
    songId: song.id,
    title: song.title,
    sectionId: section.id,
    label: section.label,
    length: n,
  };
  const nothing = {
    bar: 0,
    neighbour: 0,
    run: 1,
    choices: 0,
    position: 'none' as const,
    blockedAt: 0,
    blockedBy: '',
  };

  if (playedLength(section) % 4 !== 1)
    return { ...base, ...nothing, cls: 'no extra bar to find', tier: 7 };

  const spots = removableSpots(bars);
  if (spots.length === 0)
    return {
      ...base,
      ...nothing,
      cls: 'distinct',
      tier: 6,
      blockedAt: markBlockedPair(bars).at,
      blockedBy: markBlockedPair(bars).by,
    };

  // A parser drops or carries a bar at a phrase boundary, so a spot touching
  // the end of the section is read first and the head of it second. Failing
  // both, the last spot inside the phrase.
  const spot =
    spots.find((s) => s.end === n - 1) ??
    spots.find((s) => s.start === 0) ??
    spots[spots.length - 1];
  const position =
    spot.end === n - 1 ? 'end' : spot.start === 0 ? 'head' : 'inside';
  const bar = position === 'head' ? spot.start : spot.end;
  const neighbour =
    spot.end > spot.start
      ? // The bar it duplicates: its partner inside the run.
        bar === spot.start
        ? bar + 1
        : bar - 1
      : // A lone empty bar has no partner, so show whatever sits beside it.
        bar > 0
        ? bar - 1
        : bar + 1;

  const forced = spots.length === 1;
  const cls: ExtraBarClass = spot.empty
    ? 'empty'
    : neighbour < bar
      ? 'duplicate of the bar before it'
      : 'duplicate of the bar after it';
  const tier = spot.empty
    ? 4
    : !forced
      ? 5
      : position === 'end'
        ? 1
        : position === 'head'
          ? 2
          : 3;

  return {
    ...base,
    bar: bar + 1,
    neighbour: neighbour + 1,
    run: spot.end - spot.start + 1,
    choices: spots.length,
    position,
    cls,
    tier,
    blockedAt: 0,
    blockedBy: '',
  };
}

export const extraBarRows = (songs: Song[]): ExtraBarRow[] =>
  songs.flatMap((song) =>
    song.sections
      .map((section) => classifySection(song, section))
      .filter((row): row is ExtraBarRow => row !== null),
  );

/* ── The review sheet ───────────────────────────────────────────────── */

const chordText = (bar: ChordBar | undefined) => {
  if (!bar) return '—';
  if (bar.restBars !== undefined) return `${bar.restBars}-bar rest`;
  if (bar.chords.length === 0) return '_(empty)_';
  return bar.chords.map((hit) => hit.chordName).join(' · ');
};

const GROUPS: { tier: number; heading: string; blurb: string }[] = [
  {
    tier: 1,
    heading:
      'The last bar repeats the one before it, and nothing else could go',
    blurb:
      'The safest rows in the sheet. The section ends on identical bars, and they are the only place in it where a bar could be dropped without a chord disappearing — so if there is an extra bar, this is it, and there is no second reading to weigh. Where the chord column says "written 5×" in a five-bar section, the whole section is one chord: five bars of it where four would do.',
  },
  {
    tier: 2,
    heading:
      'The first bar repeats the one after it, and nothing else could go',
    blurb:
      'Same evidence at the other end of the phrase. Worth a beat more thought than the group above: two bars of the tonic at the top of a verse is ordinary writing, not necessarily a slip.',
  },
  {
    tier: 3,
    heading: 'One repeated pair inside the phrase, and nothing else could go',
    blurb:
      'The duplicate pair sits in the middle. The deletion is still forced — one pair, no other option — but the middle of a phrase is where a genuinely held chord lives, so more of these will be right as written.',
  },
  {
    tier: 4,
    heading: 'An empty bar',
    blurb:
      'The section carries a bar with no chords in it. That may be the extra bar, or it may be a bar whose chord was lost on the way in — in which case the fix is to write the chord, not to delete the bar. Read these as "look at this bar", not "delete this bar". Ones at the end or the head of the section come first; an empty bar in the middle of a phrase is the most suspicious row in the sheet.',
  },
  {
    tier: 5,
    heading: 'More than one bar could be the extra one',
    blurb:
      'Several repeated runs, so the section is 4k+1 and a bar still looks spare, but the script cannot say which one. The bar named is the one at a phrase boundary, chosen for want of better evidence, and the count beside it says how many readings there are in all. These need your eye on the whole section. Rows are ordered boundary-first and then by length, and the long sections at the bottom of the group are the weakest evidence in the document — in a 25-bar bridge, being one bar past a multiple of four barely means anything.',
  },
];

/** `4×3 · 5×1` — the lengths of the sections sharing this one's name. */
function siblingLengths(song: Song, section: SongSection) {
  const family = labelFamily(section.label);
  const lengths = song.sections
    .filter((other) => labelFamily(other.label) === family)
    .map((other) => other.bars.length);
  if (lengths.length < 2) return 'only one';
  const tally = new Map<number, number>();
  for (const length of lengths) tally.set(length, (tally.get(length) ?? 0) + 1);
  return [...tally.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([length, count]) => `${length}×${count}`)
    .join(' · ');
}

export function reviewMarkdown(songs: Song[]): string {
  const rows = extraBarRows(songs);
  const sections = new Map<string, { song: Song; section: SongSection }>();
  for (const song of songs)
    for (const section of song.sections)
      sections.set(`${song.id}|${section.id}`, { song, section });

  const out: string[] = [];
  const count = (tier: number) =>
    rows.filter((row) => row.tier === tier).length;
  const candidates = rows.filter((row) => row.tier <= 5);
  const forced = rows.filter((row) => row.tier <= 3).length;
  const songCount = new Set(candidates.map((row) => row.songId)).size;

  const blocked = rows.filter((row) => row.blockedAt > 0);

  out.push(
    '# Extra-bar review — the sections written one bar past a phrase',
    '',
    // en-CA is YYYY-MM-DD in local time; toISOString would print UTC, which
    // reads as tomorrow from an evening run.
    `Measured over all ${songs.length} song files on ${new Date().toLocaleDateString('en-CA')}. **${rows.length} sections are written 4k+1 bars long** (5, 9, 13, …), and in **${candidates.length} of them, across ${songCount} songs**, a bar could be deleted without any chord leaving the section. Those ${candidates.length} are below, one row each, safest first. In ${forced} of them only one bar could possibly be the extra one, so the answer is yes or no and nothing else.`,
    '',
    'The corpus moves under this, so the sheet is generated rather than written. Remeasure with',
    '',
    '```',
    'CHART_EXTRA_BAR_OUT=docs/chart-extra-bar-review.md \\',
    '  npx vitest run src/scripts/__tests__/extraBarCandidates.run.test.ts',
    '```',
    '',
    '**Nothing here has been changed.** Deleting a bar changes what is played — the chord before it is held one bar less — so every row is a question, and the last column is yours.',
    '',
    '**What the script knows.** That the section is written 4k+1 bars long; that a particular bar is byte-identical to its neighbour (chords, beats, durations, voicing hints and roadmap marks all alike) or holds no chords at all; and that deleting it therefore takes no chord out of the section. That is the whole of it.',
    '',
    '**What it cannot know.** Whether there is an extra bar at all. A five-bar phrase is a real thing — four bars and a turnaround, a held last chord, a pickup written as a full bar. And where two identical bars sit side by side it cannot tell a parser that carried a bar over from a writer who meant two bars of that chord. It reports where a deletion is *possible*, never where one is *right*.',
    '',
    '**Read the two chord columns as the evidence, not as a table error.** On a duplicate row they are identical on purpose: that identity is the entire finding.',
    '',
    "**The last column before yours is the strongest hint in the sheet.** It gives the written lengths of the other sections in that song sharing this one's name — `4×3 · 5×1` means three of the four verses are four bars and this one is five. Where the odd length is the odd one out of its own family, the answer is close to written for you; where every verse is five bars, five bars is how the song was charted and the deletion would be wrong.",
    '',
    '**A "distinct" extra bar is almost certainly correct as written.** ' +
      `${count(6)} of the 4k+1 sections have no repeated pair and no empty bar in them, so the odd length cannot be a carried-over bar — it is a phrase that genuinely runs to five, nine or thirteen bars. They are listed at the end for completeness and need no answer.`,
    '',
    `**One gap you should know about.** ${blocked.length} of those "distinct" sections do hold a repeated pair; they are only called distinct because one bar of the pair carries a roadmap mark — a repeat barline, a fermata, a cue, whatever it happens to be. Deleting that bar would take the mark with it, so it is not a deletion: the mark moves to the bar beside it first, and only then does the bar go. That is an edit, not a deletion, so those sections are held out of the tables and listed in §8 instead, with the mark named.`,
    '',
    "**Bar numbers count the section's own bars from 1**, not the printed measure numbers of the whole chart. Deleting a bar renumbers every printed measure after it, so if you are working through `chart-source-review.md` as well, note that its bar-for-a-mark numbers will shift by one for everything past a deletion.",
    '',
    '---',
    '',
    '## The counts',
    '',
    'The work plan estimated 215 candidates across 151 songs. That figure was never measured; these are, and they supersede it.',
    '',
    '| Class | Sections | Songs |',
    '| ----- | -------- | ----- |',
  );
  const classes: ExtraBarClass[] = [
    'duplicate of the bar before it',
    'duplicate of the bar after it',
    'empty',
    'distinct',
    'no extra bar to find',
  ];
  for (const cls of classes) {
    const group = rows.filter((row) => row.cls === cls);
    const name =
      cls === 'no extra bar to find'
        ? 'No extra bar to find (a multi-bar rest squares the phrase)'
        : cls[0].toUpperCase() + cls.slice(1);
    out.push(
      `| ${name} | ${group.length} | ${new Set(group.map((row) => row.songId)).size} |`,
    );
  }
  out.push(
    `| **Total 4k+1 sections** | **${rows.length}** | **${new Set(rows.map((row) => row.songId)).size}** |`,
    '',
    `The last class is the one worth knowing about: ${count(7)} of these sections only look 4k+1 on the page. They hold a bar marked as a multi-bar rest, which stands for several bars, so the phrase already plays as a multiple of four and there is nothing to delete. Any count of odd-length sections that walks \`section.bars\` is counting these as broken.`,
    '',
    '---',
    '',
  );

  // Inside a group: phrase boundaries before the middle of a phrase, then the
  // short sections, where 4k+1 is the strongest evidence it can be.
  const rank = { end: 0, head: 1, inside: 2, none: 3 };
  for (const group of GROUPS) {
    const list = rows
      .filter((row) => row.tier === group.tier)
      .sort(
        (a, b) =>
          rank[a.position] - rank[b.position] ||
          a.length - b.length ||
          a.songId.localeCompare(b.songId) ||
          a.bar - b.bar,
      );
    out.push(
      `## ${group.tier}. ${group.heading} — ${list.length} sections`,
      '',
      group.blurb,
      '',
      '| Song | Section | Bar | The extra bar holds | Its neighbour holds | Class | Same-name sections | Your answer |',
      '| ---- | ------- | --- | ------------------- | ------------------- | ----- | ------------------ | ----------- |',
    );
    for (const row of list) {
      const found = sections.get(`${row.songId}|${row.sectionId}`)!;
      const bars = found.section.bars;
      const run =
        row.run < 3
          ? ''
          : row.cls === 'empty'
            ? `, ${row.run} in a row`
            : `, written ${row.run}×`;
      const choices = row.choices > 1 ? ` (1 of ${row.choices})` : '';
      out.push(
        `| ${row.title} (\`${row.songId}\`) | ${row.label} — ${row.length} bars | **${row.bar}**${choices} | ${chordText(bars[row.bar - 1])}${run} | bar ${row.neighbour}: ${chordText(bars[row.neighbour - 1])} | ${row.cls} | ${siblingLengths(found.song, found.section)} | |`,
      );
    }
    out.push('');
  }

  const listOf = (cls: ExtraBarClass) =>
    rows
      .filter((row) => row.cls === cls)
      .sort(
        (a, b) =>
          a.songId.localeCompare(b.songId) ||
          a.sectionId.localeCompare(b.sectionId),
      );

  const distinct = listOf('distinct').filter((row) => row.blockedAt === 0);
  out.push(
    `## 6. Not candidates — ${distinct.length} sections whose bars are all different`,
    '',
    'Every bar in these is distinct from its neighbours and none is empty, so there is no bar a script could remove without a chord going with it. The odd length is the writing, not a slip: **probably correct as written**, and no answer needed. Listed so you can see what was looked at and ruled out.',
    '',
    distinct
      .map((row) => `\`${row.songId}\` ${row.label} (${row.length})`)
      .join(' · '),
    '',
  );

  const rests = listOf('no extra bar to find');
  out.push(
    `## 7. Not candidates — ${rests.length} sections a multi-bar rest already squares`,
    '',
    'Written 4k+1 bars, but one of those bars is a multi-bar rest standing for several, so the phrase plays as a multiple of four. Nothing to answer here either.',
    '',
    rests
      .map((row) => `\`${row.songId}\` ${row.label} (${row.length})`)
      .join(' · '),
    '',
  );

  out.push(
    `## 8. Held back by a mark on the bar — ${blocked.length} sections`,
    '',
    'These are 4k+1 with a repeated pair in them, so on the evidence above they belong in §1 or §2. What keeps them out is that one bar of the pair carries a roadmap mark. Some of those barlines came from the repeat-sign collapse and some were in the library already, so the mark is named per row rather than assumed. The bar cannot simply go: the mark moves to the bar beside it first, and only then does the bar go. Two steps, so two decisions, so a separate list. The bar named is the second of the pair.',
    '',
    blocked
      .sort(
        (a, b) =>
          a.length - b.length ||
          a.songId.localeCompare(b.songId) ||
          a.sectionId.localeCompare(b.sectionId),
      )
      .map(
        (row) =>
          `\`${row.songId}\` ${row.label} (${row.length}) bar ${row.blockedAt}${row.blockedBy ? ` — ${row.blockedBy}` : ''}`,
      )
      .join(' · '),
    '',
  );
  return out.join('\n');
}
