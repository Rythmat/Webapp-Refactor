import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import {
  type HarmonyMatch,
  PLACEMENT_TEXT,
  TIER_TEXT,
  buildHarmonyIndex,
  isStrongMatch,
  songUses,
} from '..';
import { degreeToPc, parseDegreeChord } from '../chordClass';
import { corpusFlows, corpusInput, corpusSongs } from './corpus';

/**
 * Writes the progression crosscheck report to claude-ref/docs/progression-crosscheck/.
 * Off unless asked for, since it writes files:
 *
 *   HARMONY_REPORT=1 npx vitest run src/content/harmony/__tests__/crosscheckReport.test.ts
 */

const OUT = 'claude-ref/docs/progression-crosscheck';
const run = process.env.HARMONY_REPORT ? describe : describe.skip;

const library = new Map(CHORD_PROGRESSION_LIBRARY.map((p) => [p.id, p]));
const pct = (n: number, of: number) => `${Math.round((n / of) * 100)}%`;
const esc = (s: string) => s.replace(/\|/g, '\\|');

function where(match: HarmonyMatch): string {
  const s = match.source;
  const bars =
    match.endBar >= match.startBar
      ? `bars ${match.startBar + 1}–${match.endBar + 1}`
      : `from bar ${match.startBar + 1}`;
  if (s.kind === 'song') return `${s.sectionLabel}, ${bars}`;
  if (s.kind === 'activity')
    return `${s.genre} L${s.level}${s.section ? ` ${s.section}` : ''}: ${s.activity}`;
  return `${s.genre} ${s.level} map: ${s.text}`;
}

function how(match: HarmonyMatch): string {
  const parts = [PLACEMENT_TEXT[match.placement], TIER_TEXT[match.tier]];
  if (match.cycles > 1) parts.push(`×${match.cycles}`);
  if (match.relative) parts.push('from the relative major');
  return parts.join(', ');
}

run('progression crosscheck report', () => {
  it('writes the report', () => {
    const index = buildHarmonyIndex(corpusInput);
    mkdirSync(OUT, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);

    /* ── Per progression ── */
    const rows = CHORD_PROGRESSION_LIBRARY.map((p) => {
      const matches = index.byProgression.get(p.id) ?? [];
      const strong = songUses(matches.filter(isStrongMatch));
      const all = songUses(matches);
      const activities = matches.filter(
        (m) => m.source.kind === 'activity' && isStrongMatch(m),
      );
      const curriculum = matches.filter(
        (m) => m.source.kind === 'curriculum' && isStrongMatch(m),
      );
      return { p, matches, strong, all, activities, curriculum };
    });
    const heard = rows.filter((r) => r.strong.length);
    const songsHeard = new Set(
      heard.flatMap((r) => r.strong.map((u) => u.songId)),
    );
    const inActivities = rows.filter((r) => r.activities.length);
    const inCurriculum = rows.filter((r) => r.curriculum.length);

    /* ── Name links the chords do or do not confirm ── */
    const linkChecks = CHORD_PROGRESSION_LIBRARY.flatMap((p) =>
      (p.songIds ?? []).map((songId) => {
        const inSong = (index.byProgression.get(p.id) ?? []).filter(
          (m) => m.source.kind === 'song' && m.source.songId === songId,
        );
        return { p, songId, best: inSong[0] };
      }),
    );
    const unconfirmed = linkChecks.filter((c) => !c.best);
    const titleOf = new Map(
      corpusSongs.map((s) => [s.id, `${s.title} (${s.artist})`]),
    );

    /* ── Strong matches the library does not link yet ── */
    const newLinks = heard.reduce(
      (n, r) =>
        n +
        r.strong.filter((u) => !(r.p.songIds ?? []).includes(u.songId)).length,
      0,
    );

    /* ── README ── */
    const tierCounts = (kind: string) => {
      const counts: Record<string, number> = {};
      for (const m of index.matches)
        if (m.source.kind === kind) {
          const k = `${m.placement}/${m.tier}`;
          counts[k] = (counts[k] ?? 0) + 1;
        }
      return counts;
    };
    const songCounts = tierCounts('song');
    const missingLoops = index.loops.filter(
      (l) => l.libraryId === undefined && l.songIds.length >= 3,
    );

    writeFileSync(
      `${OUT}/README.md`,
      `# Progression crosscheck

Generated ${today} by \`src/content/harmony/__tests__/crosscheckReport.test.ts\`.
Every chord progression in the library (${CHORD_PROGRESSION_LIBRARY.length})
was looked for, by its chords, in every song chart (${corpusSongs.length}),
every genre activity step (${corpusFlows.length} genre levels) and every
progression in the genre curriculum map.

The matching itself lives in \`src/content/harmony/\` and runs live wherever
it is used, so a chart corrected tomorrow is matched correctly tomorrow.
Nothing here was written into the library: a progression's linked songs are
still only the ones a person linked.

## Headline numbers

| | |
| --- | --- |
| Progressions heard in at least one song (strong match) | ${heard.length} of ${CHORD_PROGRESSION_LIBRARY.length} (${pct(heard.length, CHORD_PROGRESSION_LIBRARY.length)}) |
| Songs that use at least one library progression (strong match) | ${songsHeard.size} of ${corpusSongs.length} (${pct(songsHeard.size, corpusSongs.length)}) |
| Song–progression pairs found that the library does not link yet | ${newLinks} |
| Progressions heard in a genre activity step | ${inActivities.length} |
| Progressions heard in the genre curriculum map | ${inCurriculum.length} |
| Songs the source sheets linked by name | ${linkChecks.length}, of which the chords confirm ${linkChecks.length - unconfirmed.length} |
| Loops at least 3 songs are built on that the library does not have | ${missingLoops.length} |

## How a match is graded

How closely the chords agree:

- **same chords** — every chord as the library writes it (\`1 major7\` and a
  chart's \`1 maj7\`), with the same slash bass where one is written.
- **same chord families** — the chart's chord does the same job: a chart's
  \`1 maj\` for the library's \`1 major7\` (the charts rarely spell a major
  seventh), \`6 min7\` for \`6 minor\`, \`5 dom9\` for \`5 dominant7\`.
- **same roots, other colours** — only the major or minor third agrees: a
  chart's \`5 dom7\` for the library's triad \`5 major\`.

Where it sits in the song:

- **looped** — the section goes round it, from its own start, at least twice.
- **as a phrase** — it starts where a phrase of its length would: the top of a
  section, or a whole number of its own lengths in.
- **passing through** — it is heard inside a longer line, or across the seam
  of a loop that starts elsewhere. A 6-4-1-5 song "contains" 1-5-6-4 only
  this way.

A **strong** match is looped or a phrase, with the same chords or the same
families. The counts above use strong matches only.

Two more rules, both found by checking the results against songs:

- **Minor keys are read from the relative major as well.** The library
  writes every progression from a major tonic (\`6 minor - 4 major - 1 major - 5 major\`,
  never \`1 minor - ♭6 major - …\`), while ${corpusSongs.filter((s) => s.mode !== 'major').length}
  charts are written from a minor or modal tonic. Without this, Flowers (A
  minor) could never match the progression its own sheet names. Such matches
  say "from the relative major".
- **A held or restruck chord counts once,** and a walking bass under one chord
  does not split it (\`1 maj | 1 maj/3 | 4 maj\` is 1-4).

Songs are read as they are played: a chorus written once under repeat signs is
heard twice, and a D.S. back into a verse is a second pass of it.

## All matches by kind

| Placement / closeness | Song matches |
| --- | --- |
${Object.entries(songCounts)
  .sort()
  .map(([k, n]) => `| ${k} | ${n} |`)
  .join('\n')}

## The other files

- [findings.md](findings.md) — what the first run found, and the decisions it
  raises. Written by hand; not regenerated.
- [progressions.md](progressions.md) — every progression heard anywhere, with
  the songs, activities and curriculum levels it is heard in.
- [genre-activities.md](genre-activities.md) — each genre activity loop and the
  library progressions it plays.
- [missing-loops.md](missing-loops.md) — loops songs are built on that the
  library does not have, the content team's shortlist for new entries.
- [data-issues.md](data-issues.md) — song links the chords disagree with,
  chart labels no chord could be read from, and library spellings to check.
`,
    );

    /* ── progressions.md ── */
    const progLines = [
      '# Progressions, and where they are heard',
      '',
      `Generated ${today}. Sorted by the number of songs with a strong match. Up to eight songs are shown per progression, strongest first; "linked" marks a song the library already links.`,
      '',
    ];
    for (const r of [...rows]
      .filter((r) => r.all.length || r.activities.length || r.curriculum.length)
      .sort(
        (a, b) =>
          b.strong.length - a.strong.length ||
          b.all.length - a.all.length ||
          a.p.id - b.p.id,
      )) {
      progLines.push(`## #${r.p.id} — ${r.p.progression}`, '');
      progLines.push(
        `Strong in ${r.strong.length} song${r.strong.length === 1 ? '' : 's'}; heard at all in ${r.all.length}. Styles: ${r.p.styles.join(', ') || '—'}.`,
        '',
      );
      if (r.strong.length) {
        progLines.push(
          '| Song | Where | How | Chords as charted |',
          '| --- | --- | --- | --- |',
        );
        for (const u of r.strong.slice(0, 8)) {
          const linked = (r.p.songIds ?? []).includes(u.songId)
            ? ' (linked)'
            : '';
          progLines.push(
            `| ${esc(u.title)} — ${esc(u.artist)}${linked} | ${esc(where(u.best))} | ${how(u.best)} | ${esc(u.best.labels.join(' - '))} |`,
          );
        }
        if (r.strong.length > 8)
          progLines.push('', `…and ${r.strong.length - 8} more.`);
        progLines.push('');
      }
      if (r.activities.length || r.curriculum.length) {
        progLines.push('Genre lessons:', '');
        for (const m of [...r.activities, ...r.curriculum].slice(0, 10))
          progLines.push(`- ${esc(where(m))} (${how(m)})`);
        progLines.push('');
      }
    }
    writeFileSync(`${OUT}/progressions.md`, progLines.join('\n'));

    /* ── genre-activities.md ── */
    const actLines = [
      '# Genre activities and the progression library',
      '',
      `Generated ${today}. Every genre activity step with \`chordSymbols\` (and each level's Practice Track), read in its level's key, with the library progressions it plays. Only Funk, Pop and Hip Hop have authored chords; the other genres' levels are stubs. The curriculum map's progressions follow.`,
      '',
    ];
    const actPasses = index.matches.filter((m) => m.source.kind === 'activity');
    const byStep = new Map<string, HarmonyMatch[]>();
    for (const m of actPasses) {
      const k = where(m);
      byStep.set(k, [...(byStep.get(k) ?? []), m]);
    }
    for (const flow of corpusFlows) {
      const steps = flow.sections.flatMap((section) =>
        section.steps
          .filter((step) => step.chordSymbols?.length)
          .map((step) => ({ section, step })),
      );
      if (!steps.length) continue;
      actLines.push(
        `## ${flow.genre} L${flow.level} — ${flow.params.defaultKey}`,
        '',
      );
      actLines.push(
        '| Step | Chords | Library progressions (strong) |',
        '| --- | --- | --- |',
      );
      const seen = new Set<string>();
      for (const { section, step } of steps) {
        const chords = step.chordSymbols!.join(' ');
        const label = `${section.id}: ${step.activity}`;
        if (seen.has(`${chords}`)) continue;
        seen.add(chords);
        const k = `${flow.genre} L${flow.level} ${section.id}: ${step.activity}`;
        const strong = (byStep.get(k) ?? []).filter(isStrongMatch);
        const ids = [...new Set(strong.map((m) => m.progressionId))];
        actLines.push(
          `| ${esc(label)} | ${esc(chords)} | ${
            ids.length
              ? ids
                  .map((id) => `#${id} ${esc(library.get(id)!.progression)}`)
                  .join('<br>')
              : '— none'
          } |`,
        );
      }
      actLines.push('');
    }
    actLines.push('## The genre curriculum map', '');
    const mapMatches = index.matches.filter(
      (m) => m.source.kind === 'curriculum' && isStrongMatch(m),
    );
    const byText = new Map<string, Set<number>>();
    for (const m of mapMatches) {
      const k = where(m);
      byText.set(k, (byText.get(k) ?? new Set()).add(m.progressionId));
    }
    actLines.push(
      '| Level and progression | Library progressions (strong) |',
      '| --- | --- |',
    );
    for (const [k, ids] of [...byText].sort())
      actLines.push(
        `| ${esc(k)} | ${[...ids].map((id) => `#${id}`).join(', ')} |`,
      );
    writeFileSync(`${OUT}/genre-activities.md`, actLines.join('\n'));

    /* ── missing-loops.md ── */
    const loopLines = [
      '# Loops the songs are built on that the library does not have',
      '',
      `Generated ${today}. A section's loop is the shortest figure of two to eight chords (by family) it plays at least twice from its top. Listed: loops at least two songs open a section with, which no library progression is, as written or from the relative major. "Rotation of #n" means the library has the same loop started on another chord — often the right answer is a new entry anyway, since the library keeps rotations apart (1-5-6-4 and 6-4-1-5 are two entries).`,
      '',
      '| Songs | Loop | Library has | Heard in |',
      '| --- | --- | --- | --- |',
    ];
    for (const l of index.loops.filter(
      (l) => l.libraryId === undefined && l.songIds.length >= 2,
    ))
      loopLines.push(
        `| ${l.songIds.length} | ${esc(l.text)} | ${
          l.rotationOf !== undefined
            ? `rotation of #${l.rotationOf} (${esc(library.get(l.rotationOf)!.progression)})${l.relative ? ', from the relative major' : ''}`
            : '—'
        } | ${l.examples.map((e) => `${esc(e.title)} (${esc(e.sectionLabel)})`).join('; ')} |`,
      );
    writeFileSync(`${OUT}/missing-loops.md`, loopLines.join('\n'));

    /* ── data-issues.md ── */
    const unreadBy = new Map<string, Set<string>>();
    for (const u of index.unread)
      unreadBy.set(u.label, (unreadBy.get(u.label) ?? new Set()).add(u.where));
    // A slash bass that is no chord tone counted from the key, but is one
    // counted from the chord's root.
    const TONES: Record<string, number[]> = {
      maj: [0, 4, 7],
      maj7: [0, 4, 7, 11],
      min: [0, 3, 7],
      min6: [0, 3, 7, 9],
      min7: [0, 3, 7, 10],
      dom7: [0, 4, 7, 10],
    };
    const chordRelative = (label: string) => {
      const m = /^(\S+) ([^/]+)\/(\S+)$/.exec(label);
      if (!m) return false;
      const chord = parseDegreeChord(`${m[1]} ${m[2]}`);
      const fromKey = degreeToPc(m[3]);
      if (!chord || fromKey === null || !TONES[chord.quality]) return false;
      const tones = TONES[chord.quality].map((t) => (t + chord.pc) % 12);
      const fromChord = (degreeToPc(m[3])! + chord.pc) % 12;
      return !tones.includes(fromKey) && tones.includes(fromChord);
    };
    const slashLib = CHORD_PROGRESSION_LIBRARY.filter((p) =>
      p.chords.some(chordRelative),
    );
    writeFileSync(
      `${OUT}/data-issues.md`,
      [
        '# Data issues the crosscheck turned up',
        '',
        `Generated ${today}. None of these were changed: charts are edited in the back office as well as the repo, and the library's content is the owner's.`,
        '',
        '## Songs linked by name whose chords do not have the progression',
        '',
        'The source sheets named these songs, and the library links them, but the chart nowhere plays the progression, at any closeness. Either the chart, the progression or the link is wrong.',
        '',
        '| Progression | Linked song |',
        '| --- | --- |',
        ...unconfirmed.map(
          (c) =>
            `| #${c.p.id} ${esc(c.p.progression)} | ${esc(titleOf.get(c.songId) ?? c.songId)} |`,
        ),
        '',
        '## Chart labels no chord could be read from',
        '',
        '| Label | Where |',
        '| --- | --- |',
        ...[...unreadBy].map(
          ([label, at]) => `| \`${label}\` | ${esc([...at].join('; '))} |`,
        ),
        '',
        '## Library slash chords counted from the chord, not the key',
        '',
        "The charts count a slash bass from the key ('F/C' in F is `1 maj/5`). Most library slash chords agree, but these read as counted from the chord's root (`4 minor6/b3` for F–6/A♭, where the key's ♭3 would be E♭). The matcher only asks for a bass at the stricter tiers, so they still match at the loosest; respelling them would let them match fully.",
        '',
        ...slashLib.map((p) => `- #${p.id} ${p.progression}`),
        '',
        ...(index.unreadable.length
          ? [
              '## Library progressions with a chord the matcher cannot read',
              '',
              ...index.unreadable.map((u) => `- #${u.id}: \`${u.chord}\``),
              '',
            ]
          : []),
      ].join('\n'),
    );
  });
});
