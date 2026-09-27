import { AdminRoutes } from '@/constants/routes';
import type { Song, SongSection } from '@/curriculum/types/songLibrary';

/**
 * Which charts still want an ear, worst first.
 *
 * `docs/chart-work-plan.md` sorted the corpus into tiers and named ten of the
 * fifty-five songs in the worst one. The other forty-five were in a scratchpad
 * that is gone, so there has been a tier list and no list. This rebuilds it
 * from the corpus as it stands — which matters, because the corpus moved: the
 * repeat-sign collapse took 2,986 bars and 498 sections out of it.
 *
 * Every measure here is a hole the data itself can show. Nothing about whether
 * the CHORDS are right, which no script can see and which is the other half of
 * the job.
 */

export interface Fault {
  /** What is wrong, in the words the worklist prints. */
  what: string;
  /** How bad, for ordering. Bars missing count for more than a stray label. */
  weight: number;
}

export interface RepairRow {
  songId: string;
  title: string;
  artist: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  bars: number;
  sections: number;
  faults: Fault[];
  score: number;
  /** Bars the prop book prints that the library does not hold, when known. */
  missingBars: number | null;
}

const barsOf = (sections: readonly SongSection[]) =>
  sections.reduce((n, s) => n + s.bars.length, 0);

/** A section with no chord anywhere in it: content that was lost, not written. */
const emptySections = (song: Song) =>
  song.sections.filter((s) =>
    s.bars.every((b) => b.chords.length === 0 && !b.restBars),
  );

/**
 * Label families that repeat far past what a form needs. "Verse 24" is not a
 * song with twenty-four verses; it is a parser dealing names out to blocks.
 */
const runawayFamilies = (song: Song) => {
  const tally = new Map<string, number>();
  for (const s of song.sections) {
    const family = s.label.replace(/\s*\d+$/, '');
    tally.set(family, (tally.get(family) ?? 0) + 1);
  }
  return [...tally].filter(([, n]) => n >= 5);
};

/** Sections whose bar count is not a multiple of two — a phrase cut short. */
const oddSections = (song: Song) =>
  song.sections.filter((s) => s.bars.length > 0 && s.bars.length % 2 === 1);

export function repairRow(
  song: Song,
  /** Bars the source prop book prints for this song, when it was matched. */
  pageBars?: number,
): RepairRow {
  const faults: Fault[] = [];
  const bars = barsOf(song.sections);
  const empties = emptySections(song);
  const missing = pageBars === undefined ? null : Math.max(0, pageBars - bars);

  if (song.sections.length <= 1)
    faults.push({ what: 'one section — never charted', weight: 100 });

  if (empties.length > 0)
    faults.push({
      what: `${empties.length} empty section${empties.length > 1 ? 's' : ''} (${empties
        .map((s) => s.label)
        .join(', ')})`,
      weight: 40 * empties.length,
    });

  if (missing !== null && missing >= 8)
    faults.push({
      what: `${missing} bars short of the printed chart`,
      weight: missing,
    });

  const runaway = runawayFamilies(song);
  for (const [family, n] of runaway)
    faults.push({ what: `${n}× "${family}"`, weight: 3 * n });

  const odd = oddSections(song);
  if (odd.length >= 3)
    faults.push({
      what: `${odd.length} sections of odd length`,
      weight: 2 * odd.length,
    });

  const score = faults.reduce((n, f) => n + f.weight, 0);
  const tier: RepairRow['tier'] =
    song.sections.length <= 1
      ? 'T0'
      : score >= 24
        ? 'T1'
        : score > 0
          ? 'T2'
          : 'T3';

  return {
    songId: song.id,
    title: song.title,
    artist: song.artist,
    tier,
    bars,
    sections: song.sections.length,
    faults,
    score,
    missingBars: missing,
  };
}

const editorHref = (songId: string) =>
  AdminRoutes.contentItem({ kind: 'song', id: songId });

const table = (rows: RepairRow[]) =>
  [
    '| Song | Open | Bars | Sections | What the data shows | Fixed? |',
    '| ---- | ---- | ---- | -------- | ------------------- | ------ |',
    ...rows.map(
      (r) =>
        `| ${r.title} — ${r.artist} | \`${editorHref(r.songId)}\` | ${r.bars} | ${r.sections} | ${r.faults.map((f) => f.what).join('; ')} |  |`,
    ),
  ].join('\n');

export function worklistMarkdown(rows: RepairRow[]): string {
  const by = (tier: RepairRow['tier']) =>
    rows.filter((r) => r.tier === tier).sort((a, b) => b.score - a.score);
  const t0 = by('T0');
  const t1 = by('T1');
  const t2 = by('T2');
  const clean = rows.filter((r) => r.tier === 'T3').length;

  return `# Charts that want an ear — the worklist

Measured over all ${rows.length} song files, after the repeat-sign collapse.
Rebuilt rather than quoted: the tier figures in \`docs/chart-work-plan.md\`
were computed before 2,986 bars and 498 sections came out of the corpus, and
the list of songs behind them was never written down.

**Where to do it.** Each row links the back-office editor,
\`${editorHref('<song>')}\`. The bar inspector under the chart writes repeat
barlines, endings, a segno, a coda, jumps, Fine, fermatas, cues, key changes
and per-bar metre; ⌘Z undoes, shift-click selects a run, ⌘C/⌘V copies bars
with their marks.

**One thing to settle first.** The back office edits the content database,
which is what production reads. The corrections made in this repo — the
collapse, the re-keying, 50 Ways — are in \`src/curriculum/data/songs/*.ts\`,
which production reads only when the CDN is switched off. Before working
through this list, open one song you know changed and see which version the
console shows you.

**What this can and cannot see.** Every fault below is a hole the data itself
shows: a section with no chords in it, a chart shorter than the page it came
from, a label family repeating past any real form, a run of odd-length
sections. Nothing here knows whether a chord is *right*. That is the other
half of the job and it is in \`docs/chart-source-review.md\`.

| Tier | Songs | What it means |
| ---- | ----- | ------------- |
| T0 | ${t0.length} | One section. Never charted — needs writing, not correcting |
| T1 | ${t1.length} | Structurally broken: holes, runaway labels, missing bars |
| T2 | ${t2.length} | One clear fault, usually a single odd section |
| — | ${clean} | Nothing the data can see |

---

## T0 — never charted (${t0.length})

A single section is not a broken chart, it is an unwritten one. These want
someone to sit down with the record.

${table(t0)}

---

## T1 — structurally broken (${t1.length})

Worst first. The score is bars missing plus the weight of each hole, so the
songs at the top are the ones where the most is provably absent.

${table(t1)}

---

## T2 — one clear fault (${t2.length})

Usually a single section of odd length, or a label family repeating five or
six times. Quick, and often obvious once the chart is open.

${table(t2)}
`;
}
