/**
 * deckFromCells — deriver correctness + firewall.
 *
 * Proves: pure/idempotent (deriving twice is deep-equal), firewall-safe (never
 * leaks a populated rationale), the 5-phase content spine, and the presentation
 * mappings (song → artistImage, launch tiles, Reflect reset checklist, blank
 * title promotion) plus interaction losslessness for legacy backfill.
 */
import { describe, expect, it } from 'vitest';
import { PHASES } from '../phases';
import { newBlankDay } from '../plan/newBlankDay';
import { FORBIDDEN_SUBSTRINGS } from '../publish/publishDay';
import type { Day } from '../types';
import { deckFromCells } from './deckFromCells';

/** A blank Day, then populate a couple of cells with student-safe content. */
const makePopulatedDay = (): Day => {
  const day = newBlankDay('Test Day');
  const connect = day.cells.connectRegulate.presentation;
  connect.title = { en: 'Warm Up', es: 'Calentamiento' };
  connect.prompt = { en: 'How do you feel today?' };
  connect.song = { id: 'lovely_day' };
  connect.launchTiles = [{ id: 'lt-1', module: 'globe', activityRef: 'event-1' }];

  const reflect = day.cells.respondReflectReset.presentation;
  reflect.resetChecklist = [{ en: 'Chairs pushed in', es: 'Sillas acomodadas' }];
  reflect.interactions = [
    {
      id: 'ix-oneword',
      type: 'text',
      question: { en: 'One word for today', es: 'Una palabra de hoy' },
      shareable: false,
    },
  ];
  return day;
};

describe('deckFromCells', () => {
  it('is pure + idempotent — deriving twice is deep-equal', () => {
    const day = makePopulatedDay();
    expect(deckFromCells(day)).toEqual(deckFromCells(day));
  });

  it('never leaks a populated rationale (firewall)', () => {
    const day = makePopulatedDay();
    // Populate every marker-bearing rationale field with a forbidden token.
    day.cells.connectRegulate.rationale = {
      assessment: { en: 'ASSESSMENT: secret rubric' },
      standards: ['STANDARD: MU:Cr1.1'],
      commonAnchors: ['anchor-x'],
      selCompetencies: ['sel-x'],
      impactTags: ['IMPACT: value'],
      cloRefs: ['CLO: objective'],
      activityRefs: ['act-1'],
      notes: 'NOTES: teacher only',
      initiationStyle: 'learn-to-apply',
      scaffoldLaneIds: ['SCAFFOLD: lane-a'],
      createdBy: 'CREATEDBY-teacher-123',
      localContext: 'LOCALCONTEXT: Denver tie-in',
    };
    const serialized = JSON.stringify(deckFromCells(day)).toLowerCase();
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(serialized.includes(forbidden)).toBe(false);
    }
  });

  it('a blank Day yields exactly the 5 phase content slides in order', () => {
    const deck = deckFromCells(newBlankDay('Blank'));
    expect(deck.slides).toHaveLength(5);
    expect(deck.slides.map((s) => s.phase)).toEqual([...PHASES]);
    expect(deck.slides.every((s) => s.kind === 'content')).toBe(true);
    // A truly empty phase is named by its student label.
    expect(deck.slides[0].title).toEqual({ en: 'Connect', es: 'Conecta' });
  });

  it('maps song → artistImage media and carries launch tiles', () => {
    const deck = deckFromCells(makePopulatedDay());
    const connect = deck.slides.find(
      (s) => s.id.endsWith('-present-connectRegulate') && s.kind === 'content',
    );
    expect(connect).toMatchObject({
      kind: 'content',
      title: { en: 'Warm Up', es: 'Calentamiento' },
      prompt: { en: 'How do you feel today?' },
      media: { type: 'artistImage', songId: 'lovely_day' },
      launchTiles: [{ id: 'lt-1', module: 'globe', activityRef: 'event-1' }],
    });
  });

  it('carries the Reflect reset checklist and is lossless for interactions', () => {
    const deck = deckFromCells(makePopulatedDay());
    const reflectContent = deck.slides.find(
      (s) => s.kind === 'content' && s.phase === 'respondReflectReset',
    );
    expect(reflectContent).toMatchObject({
      resetChecklist: [{ en: 'Chairs pushed in', es: 'Sillas acomodadas' }],
    });
    // The cell's interaction survives as an InteractionSlide referencing it.
    const ixSlide = deck.slides.find((s) => s.kind === 'interaction');
    expect(ixSlide).toMatchObject({
      kind: 'interaction',
      phase: 'respondReflectReset',
      interactionIds: ['ix-oneword'],
      reveal: 'wall',
    });
  });

  it('promotes a blank title to the prompt as the headline', () => {
    const day = newBlankDay('Promote');
    day.cells.groupPractice.presentation.title = { en: '' };
    day.cells.groupPractice.presentation.prompt = { en: 'Clap the rhythm back' };
    const deck = deckFromCells(day);
    const practice = deck.slides.find((s) => s.phase === 'groupPractice');
    expect(practice?.title).toEqual({ en: 'Clap the rhythm back' });
    expect(practice?.prompt).toBeUndefined();
  });
});
