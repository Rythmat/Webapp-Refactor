/**
 * The guitar theory notes: structure, token resolution in every key and
 * every step of the guitar flow, the conditions that pick them, and the
 * plain-language style limits (≤ 4 sentences of ≤ 20 words; ≤ 5-word titles).
 */

import { describe, expect, it } from 'vitest';
import {
  analyzeChange,
  analyzeMusicMap,
  classifyVoicing,
  type GuitarSubsectionPrefix,
} from '@/lib/guitar/theory';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '../../activityFlows/guitarAppliedTheoryFundamentals';
import {
  GUITAR_ATLAS_BOOK_ONE,
  GUITAR_KEY_ORDER,
  getGuitarShape,
} from '../bookOne';
import {
  THEORY_CONDITIONS,
  THEORY_TOKENS,
  deriveTheoryContext,
  theoryStepsFor,
  type TheoryNoteContext,
} from '../theoryConditions';
import {
  GUITAR_SUBSECTION_PREFIXES,
  GUITAR_THEORY_NOTES,
  GUITAR_THEORY_STRINGS,
  familyTag,
  noteHasPrefix,
  notesFor,
  resolveTheoryNote,
  stepPrefix,
  theoryString,
  type ResolvedTheoryNote,
} from '../theoryNotes';
import type { GuitarKeyName } from '../types';

const TOKEN = /\{(\w+)\}/g;

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function expectStyle(text: string, where: string) {
  const list = sentences(text);
  expect(list.length, where).toBeLessThanOrEqual(4);
  for (const s of list) {
    expect(s.split(/\s+/).length, `${where}: "${s}"`).toBeLessThanOrEqual(20);
  }
}

interface Surface {
  prefix: GuitarSubsectionPrefix;
  ctx: TheoryNoteContext;
}

/**
 * Every place a note can show in one key: the key header, the Section B
 * card, the practice tools, and each step of the flow with each of its
 * shapes and each of its chord changes.
 */
function surfaces(key: GuitarKeyName): Surface[] {
  const center = GUITAR_ATLAS_BOOK_ONE[key];
  const steps = theoryStepsFor(buildGuitarAppliedTheoryFundamentalsFlow(key));
  const out: Surface[] = [
    { prefix: 'KEY', ctx: { center } },
    { prefix: 'B', ctx: { center } },
    { prefix: 'PRACTICE', ctx: { center } },
  ];
  for (const step of steps) {
    const prefix = stepPrefix(step.id);
    if (!prefix) throw new Error(`No prefix for step ${step.id}`);
    const base = {
      center,
      step,
      steps,
      settings: { showRomanNumerals: true },
    };
    out.push({ prefix, ctx: base });
    const shapes = step.shapeIds.map((id) => getGuitarShape(id)!);
    for (const shape of shapes) out.push({ prefix, ctx: { ...base, shape } });
    const changes = step.mapExample
      ? analyzeMusicMap(center.musicMaps[step.mapExample - 1]).changes
      : shapes
          .slice(1)
          .map((shape, i) => analyzeChange(shapes[i], shape, i, i + 1));
    for (const change of changes)
      out.push({ prefix, ctx: { ...base, change } });
  }
  return out;
}

const SURFACES = Object.fromEntries(
  GUITAR_KEY_ORDER.map((key) => [key, surfaces(key)]),
) as Record<GuitarKeyName, Surface[]>;

describe('guitar theory notes: structure', () => {
  it('has 72 notes with unique ids and 60 UI strings', () => {
    expect(GUITAR_THEORY_NOTES).toHaveLength(72);
    const ids = GUITAR_THEORY_NOTES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(GUITAR_THEORY_STRINGS)).toHaveLength(60);
  });

  it('uses valid prefixes, conditions and tokens', () => {
    for (const note of GUITAR_THEORY_NOTES) {
      const prefixes = [note.subsectionPrefix].flat();
      for (const p of prefixes) {
        expect(GUITAR_SUBSECTION_PREFIXES, note.id).toContain(p);
      }
      expect(typeof THEORY_CONDITIONS[note.when], note.id).toBe('function');
      for (const [, token] of `${note.title} ${note.body}`.matchAll(TOKEN)) {
        expect(Object.keys(THEORY_TOKENS), note.id).toContain(token);
      }
    }
  });

  it('keeps bodies plain', () => {
    for (const note of GUITAR_THEORY_NOTES) {
      expect(sentences(note.body).length, note.id).toBeGreaterThanOrEqual(1);
      expectStyle(note.body, note.id);
    }
  });

  it('keeps titles short', () => {
    const long = GUITAR_THEORY_NOTES.filter(
      (n) => n.title.split(/\s+/).length > 5,
    ).map((n) => n.id);
    // The approved copy's one 6-word title, kept verbatim.
    expect(long).toEqual(['d3.triadBar']);
  });

  it('reads step prefixes', () => {
    expect(stepPrefix('B5.2')).toBe('B5');
    expect(stepPrefix('D3.4')).toBe('D3');
    expect(stepPrefix('C1.1')).toBeNull();
    // The Section B card shows only the B notes, not B3's or B8's.
    const card = notesFor('B', { center: GUITAR_ATLAS_BOOK_ONE.C });
    expect([...card.intro, ...card.info].map((n) => n.id)).toEqual([
      'b.fromScale',
      'b.pattern',
      'b.sevenLater',
    ]);
  });
});

describe('guitar theory notes: resolution', () => {
  it('resolves every token in all 12 keys and every applicable step', () => {
    const shown = new Set<string>();
    for (const key of GUITAR_KEY_ORDER) {
      for (const { prefix, ctx } of SURFACES[key]) {
        const d = deriveTheoryContext(ctx);
        for (const note of GUITAR_THEORY_NOTES) {
          if (!noteHasPrefix(note, prefix)) continue;
          if (!THEORY_CONDITIONS[note.when](d)) continue;
          const where = `${key} ${ctx.step?.id ?? prefix} ${note.id}`;
          const resolved = resolveTheoryNote(note, ctx);
          // Step-panel notes always fill in. A popover about a chord box
          // only has to fill in on a surface that shows one; elsewhere
          // (a change badge, a multi-chord step) it resolves fully or not
          // at all.
          if (note.placement !== 'popover' || d.shape) {
            expect(resolved, where).not.toBeNull();
          }
          if (!resolved) continue;
          expect(resolved.title, where).not.toContain('{');
          expect(resolved.body, where).not.toContain('{');
          expectStyle(resolved.body, where);
          shown.add(note.id);
        }
      }
    }
    // Every note shows somewhere in the book.
    expect([...shown].sort()).toEqual(
      GUITAR_THEORY_NOTES.map((n) => n.id).sort(),
    );
  });

  it('introduces each key with the note that changed', () => {
    const intro = (key: GuitarKeyName) =>
      notesFor('KEY', { center: GUITAR_ATLAS_BOOK_ONE[key] }).intro.map(
        (n) => n.body,
      );
    expect(intro('C')).toEqual([
      'C major has no sharps or flats. Each key after it changes just one note.',
    ]);
    expect(intro('F#')).toEqual([
      'F# major is B major with one note changed. E becomes E#. Find E# in your scale shape.',
    ]);
    expect(intro('Db')).toEqual([
      'Db major sounds like F# major with one note changed. B becomes C. The other notes keep their sound but take flat names.',
    ]);
    const unicode = notesFor('KEY', {
      center: GUITAR_ATLAS_BOOK_ONE.Db,
      settings: { accidentals: 'unicode' },
    });
    expect(unicode.intro[0].body).toMatch(/^D♭ major sounds like F♯ major/);
    expect(unicode.info.map((n) => n.id)).toEqual([
      'key.flatSwitch',
      'key.circle',
      'key.relMinor',
    ]);
  });

  it('fills shape, change and map tokens', () => {
    const C = GUITAR_ATLAS_BOOK_ONE.C;
    const cmaj7 = C.sevenths[0];
    const b7 = notesFor('B7', { center: C, shape: cmaj7 });
    const body = (id: string, list: ResolvedTheoryNote[]) =>
      list.find((n) => n.id === id)?.body;
    expect(body('b7.hidden', b7.popover)).toBe(
      'Take away the root of C major 7 and E minor is left. You already know it as chord 3.',
    );
    expect(body('b7.order', b7.popover)).toContain('plays R, 5, 7, 3.');
    expect(body('b7.drop2', b7.popover)).toContain('Root on string 5,');

    const fmaj7 = notesFor('B7', {
      center: GUITAR_ATLAS_BOOK_ONE.F,
      shape: GUITAR_ATLAS_BOOK_ONE.F.sevenths[0],
    });
    expect(body('b7.open', fmaj7.popover)).toBe(
      'The open strings are part of this chord. Open A is the 3. Open high E is the 7. Let them ring.',
    );
    const emaj7 = notesFor('B7', {
      center: GUITAR_ATLAS_BOOK_ONE.E,
      shape: GUITAR_ATLAS_BOOK_ONE.E.sevenths[0],
    });
    expect(body('b7.open', emaj7.popover)).toContain(
      'Open low E and high E are the root. Open B is the 5.',
    );

    const cOpen = notesFor('B1', { center: C, shape: C.triads[0] });
    expect(body('b1.names', cOpen.info)).toBe(
      'This shape uses 5 strings but only three note names: C, E and G. Some notes appear twice, in different octaves.',
    );

    const fSharp = GUITAR_ATLAS_BOOK_ONE['F#'];
    const map = fSharp.musicMaps[3];
    const d3 = notesFor('D3', { center: fSharp, map });
    expect(body('d3.pull', d3.info)).toBe(
      'In C#7, B wants to step down to A#. E# wants to step up to F#. Those small steps make 1 sound like home.',
    );
    const sameFret = analyzeMusicMap(map).changes.find(
      (c) => c.sameFretRootMove === 'r6-to-r5',
    );
    const popover = notesFor('D3', {
      center: fSharp,
      map,
      change: sameFret,
    }).popover;
    expect(body('d3.sameFret', popover)).toContain('from 2 to 5.');
  });

  it('shows the barre and drop-3 intros once per key', () => {
    const drop3Keys: GuitarKeyName[] = [];
    for (const key of GUITAR_KEY_ORDER) {
      const stepsWith = (id: string) =>
        new Set(
          SURFACES[key]
            .filter(({ prefix, ctx }) =>
              notesFor(prefix, ctx).intro.some((n) => n.id === id),
            )
            .map(({ ctx }) => ctx.step?.id),
        );
      expect(stepsWith('b.barreCare').size, key).toBe(1);
      const drop3 = stepsWith('b7.drop3mute');
      expect(drop3.size, key).toBeLessThanOrEqual(1);
      if (drop3.size) drop3Keys.push(key);
    }
    // Only keys with a drop 3 grip: on the 7th-chord page, or in a 7th-chord
    // Music Map (Examples 4 and 5) when the page has none.
    const isDrop3 = (frets: string) =>
      frets.startsWith(frets.split('-')[0] + '-X-');
    expect(drop3Keys).toEqual(
      GUITAR_KEY_ORDER.filter((key) => {
        const center = GUITAR_ATLAS_BOOK_ONE[key];
        return (
          center.sevenths.some((s) => isDrop3(s.frets)) ||
          center.musicMaps
            .filter((m) => m.example >= 4)
            .some((m) => m.bars.some((b) => isDrop3(b.frets)))
        );
      }),
    );
    const c = SURFACES.C.find(({ ctx }) =>
      notesFor('B1', ctx).intro.some((n) => n.id === 'b.barreCare'),
    );
    expect(c?.ctx.step?.id).toBe('B1.7'); // arpeggiating F, the first barre
  });

  it('snapshots the resolved notes for C, F# and Db', () => {
    for (const key of ['C', 'F#', 'Db'] as const) {
      const byId: Record<string, string[]> = {};
      for (const { prefix, ctx } of SURFACES[key]) {
        const all = notesFor(prefix, ctx);
        for (const n of [...all.intro, ...all.info, ...all.popover]) {
          const text = `${n.title}: ${n.body}`;
          byId[n.id] = [...new Set([...(byId[n.id] ?? []), text])].sort();
        }
      }
      const sorted = Object.fromEntries(
        Object.entries(byId).sort(([a], [b]) => a.localeCompare(b)),
      );
      expect(sorted).toMatchSnapshot(key);
    }
  });
});

describe('guitar theory notes: conditions', () => {
  it('each condition holds somewhere and fails somewhere', () => {
    const outcomes = new Map<string, Set<boolean>>();
    for (const key of GUITAR_KEY_ORDER) {
      for (const { ctx } of SURFACES[key]) {
        const d = deriveTheoryContext(ctx);
        for (const [id, test] of Object.entries(THEORY_CONDITIONS)) {
          outcomes.set(id, (outcomes.get(id) ?? new Set()).add(test(d)));
        }
      }
    }
    const constant = [...outcomes]
      .filter(([, seen]) => seen.size < 2)
      .map(([id]) => id);
    // Every key's 7th-chord page has a climbing top line.
    expect(constant.sort()).toEqual(['always', 'hasTopLineRun']);
  });

  it('reads timing, articulation and the Roman-numeral setting from the step', () => {
    const at = (id: string) => {
      const found = SURFACES.C.find(
        ({ ctx }) => ctx.step?.id === id && !ctx.shape && !ctx.change,
      );
      if (!found) throw new Error(`No step ${id}`);
      return found;
    };
    const ids = (id: string, pick: 'intro' | 'info') => {
      const { prefix, ctx } = at(id);
      return notesFor(prefix, ctx)[pick].map((n) => n.id);
    };
    expect(ids('A1.1', 'intro')).not.toContain('a1.slowFirst');
    expect(ids('A1.2', 'intro')).toContain('a1.slowFirst');
    expect(ids('A3.1', 'intro')).toContain('a3.staccato');
    expect(ids('A3.1', 'intro')).not.toContain('a3.legato');
    expect(ids('A3.2', 'intro')).toContain('a3.legato');
    expect(ids('A3.2', 'intro')).not.toContain('a3.staccato');
    expect(ids('D3.4', 'info')).toContain('d3.roman');
    const { ctx } = at('D3.4');
    const plain = notesFor('D3', { ...ctx, settings: {} }).info;
    expect(plain.map((n) => n.id)).not.toContain('d3.roman');
  });

  it('reads the chord box', () => {
    const popovers = (key: GuitarKeyName, box: number) => {
      const center = GUITAR_ATLAS_BOOK_ONE[key];
      const shape = center.sevenths[box - 1];
      return notesFor('B7', { center, shape }).popover.map((n) => n.id);
    };
    expect(popovers('C', 7)).toContain('b7.halfDim');
    expect(popovers('C', 1)).not.toContain('b7.halfDim');
    expect(popovers('C', 5)).not.toContain('b7.hidden');
    expect(popovers('C', 1)).toContain('b7.movable');
    expect(popovers('F', 1)).not.toContain('b7.movable');
  });
});

describe('guitar theory UI strings', () => {
  it('fills tokens and family tags', () => {
    expect(theoryString('badge.shared', { n: 2 })).toBe('2 shared notes');
    expect(theoryString('position.label', { startFret: 7 })).toBe(
      'Position 7: finger 1 on fret 7',
    );
    expect(theoryString('pt.loopHalf', { from: 1 })).toBe('Loop bars 1–{to}');
    const voicing = classifyVoicing({ frets: 'X-3-5-4-5-X' }, 0, 'maj7');
    expect(familyTag(voicing)).toBe('Root on string 5 · drop 2');
    expect(
      familyTag(classifyVoicing({ frets: 'X-3-5-3-4-X' }, 0, 'min')),
    ).toBeNull();
  });
});
