import { describe, expect, it } from 'vitest';
import type {
  ChordBar,
  Song,
  SongSection,
} from '@/curriculum/types/songLibrary';
import {
  applyPlan,
  gate,
  labelChanges,
  performanceSignature,
  planCollapses,
  relabel,
  rewriteSource,
  type CollapsePlan,
} from '@/scripts/collapseRepeatedSections';

/**
 * The collapse script, on charts small enough to read.
 *
 * The cases that matter are the refusals: a span whose repeat lands under a
 * different section name, a span that already carries barlines, and a span
 * whose new barlines change how a repeat further down the chart reads.
 */

const bar = (chordName: string, extra: Partial<ChordBar> = {}): ChordBar => ({
  chords: [{ degree: '1 maj', chordName, beat: 1, duration: 4 }],
  ...extra,
});

const section = (
  id: string,
  label: string,
  names: string[],
  extra: Partial<SongSection> = {},
): SongSection => ({
  id,
  label,
  bars: names.map((n) => bar(n)),
  ...extra,
});

const song = (sections: SongSection[]): Song => ({
  id: 'test_song',
  title: 'Test',
  artist: 'Test',
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: [],
  techniques: [],
  sections,
  audioSources: [],
  artistImageSource: 'none',
});

const labels = (s: Song) => s.sections.map((x) => x.label);

describe('planCollapses', () => {
  it('collapses one section written twice in a row', () => {
    const s = song([
      section('verse_1', 'Verse 1', ['C', 'F', 'G', 'C']),
      section('verse_2', 'Verse 2', ['C', 'F', 'G', 'C']),
      section('chorus', 'Chorus', ['A', 'D']),
    ]);
    const plan = planCollapses(s);
    expect(plan.runs).toHaveLength(1);
    expect(plan.runs[0]).toMatchObject({
      startIdx: 0,
      span: 1,
      times: 2,
      dropIdxs: [1],
      barsRemoved: 4,
    });

    const after = applyPlan(s, plan);
    expect(after.sections.map((x) => x.id)).toEqual(['verse_1', 'chorus']);
    expect(after.sections[0].bars[0].repeatStart).toBe(true);
    expect(after.sections[0].bars[3].repeatEnd).toBe(true);
    // Two passes is the schema's default, so the count stays off the bar.
    expect(after.sections[0].bars[3].repeatTimes).toBeUndefined();
    expect(gate(s, after)).toEqual({ ok: true });
  });

  it('collapses a span of differently-named sections that comes back whole', () => {
    // Get Lucky's shape: the same eight bars under Verse, Pre-Chorus and
    // Chorus, then the same three names again. A repeat over all three keeps
    // every name; collapsing section by section would keep only the first.
    const s = song([
      section('verse_1', 'Verse 1', ['A', 'B']),
      section('pre_chorus_1', 'Pre-Chorus 1', ['A', 'B']),
      section('chorus_1', 'Chorus 1', ['A', 'B']),
      section('verse_2', 'Verse 2', ['A', 'B']),
      section('pre_chorus_2', 'Pre-Chorus 2', ['A', 'B']),
      section('chorus_2', 'Chorus 2', ['A', 'B']),
    ]);
    const plan = planCollapses(s);
    expect(plan.runs).toHaveLength(1);
    expect(plan.runs[0]).toMatchObject({
      startIdx: 0,
      span: 3,
      times: 2,
      barsRemoved: 6,
    });

    const after = applyPlan(s, plan);
    expect(labels(after)).toEqual(['Verse', 'Pre-Chorus', 'Chorus']);
    expect(after.sections[0].bars[0].repeatStart).toBe(true);
    expect(after.sections[2].bars[1].repeatEnd).toBe(true);
    expect(gate(s, after)).toEqual({ ok: true });
  });

  it('writes repeatTimes when a span comes back more than once', () => {
    // Vivir Mi Vida's shape: one eight-bar figure cut in two and named Verse
    // and Chorus, ten times over.
    const sections = [section('intro', 'Intro', ['G'])];
    for (let n = 1; n <= 10; n++) {
      sections.push(section(`verse_${n}`, `Verse ${n}`, ['C', 'F']));
      sections.push(section(`chorus_${n}`, `Chorus ${n}`, ['A', 'D']));
    }
    const s = song(sections);
    const plan = planCollapses(s);
    expect(plan.runs).toHaveLength(1);
    expect(plan.runs[0]).toMatchObject({ startIdx: 1, span: 2, times: 10 });
    expect(plan.barsRemoved).toBe(36);

    const after = applyPlan(s, plan);
    expect(labels(after)).toEqual(['Intro', 'Verse', 'Chorus']);
    expect(after.sections[2].bars[1]).toMatchObject({
      repeatEnd: true,
      repeatTimes: 10,
    });
    expect(gate(s, after)).toEqual({ ok: true });
  });

  it('opens and closes a one-bar span on the same bar', () => {
    const s = song([
      section('interlude', 'Interlude 1', ['C']),
      section('interlude_2', 'Interlude 2', ['C']),
    ]);
    const after = applyPlan(s, planCollapses(s));
    expect(after.sections[0].bars[0]).toMatchObject({
      repeatStart: true,
      repeatEnd: true,
    });
    expect(gate(s, after)).toEqual({ ok: true });
  });

  it('prefers the span that removes the most bars', () => {
    // A two-section span that comes back three times beats the four-section
    // span that comes back once.
    const s = song([
      section('verse_1', 'Verse 1', ['C']),
      section('chorus_1', 'Chorus 1', ['F']),
      section('verse_2', 'Verse 2', ['C']),
      section('chorus_2', 'Chorus 2', ['F']),
      section('verse_3', 'Verse 3', ['C']),
      section('chorus_3', 'Chorus 3', ['F']),
    ]);
    const plan = planCollapses(s);
    expect(plan.runs[0]).toMatchObject({ span: 2, times: 3, barsRemoved: 4 });
  });

  it('refuses a span whose repeat lands under a different name', () => {
    const s = song([
      section('intro', 'Intro', ['C', 'F']),
      section('verse_1', 'Verse 1', ['C', 'F']),
    ]);
    const plan = planCollapses(s);
    expect(plan.runs).toEqual([]);
    expect(plan.skipped[0].reason).toContain('a different name');
  });

  it('refuses a span whose bars already carry roadmap marks', () => {
    const marked = (id: string, label: string): SongSection => ({
      id,
      label,
      bars: [bar('C', { cue: 'Riff' }), bar('F', { fine: true })],
    });
    const plan = planCollapses(
      song([marked('v1', 'Verse 1'), marked('v2', 'Verse 2')]),
    );
    expect(plan.runs).toEqual([]);
    expect(plan.skipped[0].reason).toContain('fine');
  });

  it('refuses a section that already carries a legacy repeatCount', () => {
    const s = song([
      section('verse_1', 'Verse 1', ['C', 'F'], { repeatCount: 2 }),
      section('verse_2', 'Verse 2', ['C', 'F'], { repeatCount: 2 }),
    ]);
    const plan = planCollapses(s);
    expect(plan.runs).toEqual([]);
    expect(plan.skipped[0].reason).toContain('repeatCount');
  });

  it('refuses a span that opens or closes on an empty section', () => {
    const s = song([
      { id: 'intro', label: 'Intro 1', bars: [] },
      section('verse_1', 'Verse 1', ['C']),
      { id: 'intro_2', label: 'Intro 2', bars: [] },
      section('verse_2', 'Verse 2', ['C']),
    ]);
    const plan = planCollapses(s);
    expect(plan.runs).toEqual([]);
    expect(plan.skipped[0].reason).toContain('empty section');
  });

  it('leaves a verse that comes back after the chorus alone', () => {
    // Non-adjacent duplicates are a D.S. or a repeat with endings, and which
    // one it is depends on the record.
    const s = song([
      section('verse_1', 'Verse 1', ['C', 'F']),
      section('chorus', 'Chorus', ['A', 'D']),
      section('verse_2', 'Verse 2', ['C', 'F']),
    ]);
    expect(planCollapses(s).runs).toEqual([]);
    expect(planCollapses(s).skipped).toEqual([]);
  });

  it('does not collapse sections that differ outside the bars', () => {
    const s = song([
      section('verse_1', 'Verse 1', ['C', 'F'], { instrumental: true }),
      section('verse_2', 'Verse 2', ['C', 'F']),
    ]);
    expect(planCollapses(s).runs).toEqual([]);
  });

  it('is idempotent', () => {
    const s = song([
      section('verse_1', 'Verse 1', ['C', 'F']),
      section('verse_2', 'Verse 2', ['C', 'F']),
    ]);
    const after = applyPlan(s, planCollapses(s));
    const again = planCollapses(after);
    expect(again.runs).toEqual([]);
    expect(applyPlan(after, again)).toEqual(after);
  });
});

describe('relabel', () => {
  it('renumbers the survivors of a family that was numbered', () => {
    const original = [
      section('v1', 'Verse 1', ['C']),
      section('v2', 'Verse 2', ['C']),
      section('v3', 'Verse 3', ['C']),
    ];
    expect(
      relabel(original, [original[0], original[2]]).map((s) => s.label),
    ).toEqual(['Verse 1', 'Verse 2']);
  });

  it('drops the number when only one of a family is left', () => {
    const original = [
      section('v1', 'Verse 1', ['C']),
      section('v2', 'Verse 2', ['C']),
    ];
    expect(relabel(original, [original[0]]).map((s) => s.label)).toEqual([
      'Verse',
    ]);
  });

  it('leaves a family that was never numbered alone', () => {
    // Close To You writes four bare "Verse" labels on purpose.
    const original = [
      section('verse', 'Verse', ['C']),
      section('verse_3', 'Verse', ['C']),
      section('outro', 'Outro', ['F']),
    ];
    expect(
      relabel(original, [original[0], original[2]]).map((s) => s.label),
    ).toEqual(['Verse', 'Outro']);
  });

  it('reports only the labels that changed, by their original index', () => {
    const s = song([
      section('intro', 'Intro', ['G']),
      section('verse_1', 'Verse 1', ['C']),
      section('verse_2', 'Verse 2', ['C']),
      section('outro', 'Outro', ['F']),
    ]);
    // Verse 1 survives, Verse 2 goes, so "Verse 1" loses its number.
    expect([...labelChanges(s, planCollapses(s))]).toEqual([[1, 'Verse']]);
  });
});

describe('the safety gate', () => {
  it('rejects a collapse that re-aims a repeat further down the chart', () => {
    // The outro's end repeat has no start repeat to return to, so it goes back
    // to the top of the song. A repeat barline over the verses gives it
    // somewhere nearer to land, and the song stops playing the same.
    const s = song([
      section('verse_1', 'Verse 1', ['C', 'F']),
      section('verse_2', 'Verse 2', ['C', 'F']),
      {
        id: 'outro',
        label: 'Outro',
        bars: [bar('G'), bar('C', { repeatEnd: true })],
      },
    ]);
    const plan = planCollapses(s);
    expect(plan.runs).toHaveLength(1);

    const result = gate(s, applyPlan(s, plan));
    expect(result.ok).toBe(false);
    // Twelve bars before (the whole song twice), eight after (the outro twice).
    expect(result.reason).toBe('performance is 8 bars, was 12');
  });

  it('names the bar where two performances diverge', () => {
    const before = song([section('verse_1', 'Verse 1', ['C', 'F', 'G'])]);
    const after = song([section('verse_1', 'Verse 1', ['C', 'F', 'A'])]);
    const result = gate(before, after);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('performed bar 3 changed');
  });

  it('counts the key each performed bar is in', () => {
    const s = song([
      section('verse_1', 'Verse 1', ['C']),
      {
        id: 'verse_2',
        label: 'Verse 2',
        bars: [bar('E', { keyChange: 'E major' })],
      },
    ]);
    expect(performanceSignature(s).split('\n')).toEqual([
      expect.stringContaining('C major|'),
      expect.stringContaining('E major|'),
    ]);
  });

  it('rejects a chart whose labels stopped being section names', () => {
    const before = song([section('verse_1', 'Verse 1', ['C'])]);
    const after = song([section('verse_1', 'Section J', ['C'])]);
    expect(gate(before, after)).toMatchObject({
      ok: false,
      reason: "unusable label 'Section J'",
    });
  });
});

describe('rewriteSource', () => {
  const source = `import type { Song } from '@/curriculum/types/songLibrary';

export const test_song: Song = {
  id: 'test_song',
  title: 'Test',
  artist: 'Test',
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: [],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [],
  artistImageSource: 'none',
};
`;

  const chart = song([
    section('verse_1', 'Verse 1', ['C', 'F']),
    section('chorus_1', 'Chorus 1', ['G']),
    section('verse_2', 'Verse 2', ['C', 'F']),
    section('chorus_2', 'Chorus 2', ['G']),
  ]);
  const plan = planCollapses(chart);

  it('plans the span this fixture is built around', () => {
    expect(plan.runs).toHaveLength(1);
    expect(plan.runs[0]).toMatchObject({ startIdx: 0, span: 2, times: 2 });
  });

  it('deletes the duplicate span, marks the survivor and redraws the numbers', () => {
    const out = rewriteSource(source, plan, chart);
    expect(out).not.toContain("id: 'verse_2'");
    expect(out).not.toContain("id: 'chorus_2'");
    expect(out.match(/repeatStart: true/g)).toHaveLength(1);
    expect(out.match(/repeatEnd: true/g)).toHaveLength(1);
    // The start barline goes on the span's first bar, the end on its last —
    // which is in the next section.
    expect(out.indexOf('repeatStart')).toBeLessThan(
      out.indexOf("id: 'chorus_1'"),
    );
    expect(out.indexOf('repeatEnd')).toBeGreaterThan(
      out.indexOf("id: 'chorus_1'"),
    );
    // One Verse and one Chorus left, so neither carries a number.
    expect(out).toContain("label: 'Verse'");
    expect(out).toContain("label: 'Chorus'");
    expect(out).not.toContain("label: 'Verse 1'");
    // Nothing outside `sections` moved.
    expect(out).toContain("artistImageSource: 'none'");
  });

  it('prints the marks the way prettier would, so the file stays clean', async () => {
    const out = rewriteSource(source, plan, chart);
    // A bar written on one line is too long to hold another property, so it
    // opens out — exactly as prettier prints it.
    expect(out).toContain(
      [
        '        {',
        "          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],",
        '          repeatStart: true,',
        '        },',
      ].join('\n'),
    );
    const prettier = await import('prettier');
    const filepath = 'src/curriculum/data/songs/test_song.ts';
    const config = await prettier.resolveConfig(filepath);
    expect(
      await prettier.format(out, { ...config, filepath, parser: 'typescript' }),
    ).toBe(out);
  });

  it('appends to a bar that was already written over several lines', () => {
    // The end of the span lands on a multi-line bar; prettier keeps it open.
    const multi = source.replace(
      "        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },",
      [
        '        {',
        "          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],",
        '        },',
      ].join('\n'),
    );
    const out = rewriteSource(multi, plan, chart);
    expect(out).toContain(
      [
        "          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],",
        '          repeatEnd: true,',
        '        },',
      ].join('\n'),
    );
  });

  it('refuses a file whose section count does not match the song', () => {
    const short = { ...chart, sections: chart.sections.slice(0, 3) };
    expect(() => rewriteSource(source, plan, short)).toThrow(
      /4 section literals, song has 3/,
    );
  });

  it('refuses a file with no matching Song literal', () => {
    const other: CollapsePlan = { ...plan, songId: 'other_song' };
    expect(() => rewriteSource(source, other, chart)).toThrow(
      /no exported Song literal/,
    );
  });
});
