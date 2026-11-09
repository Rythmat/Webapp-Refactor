/**
 * deckFromCells — deriver correctness + firewall.
 *
 * Proves: pure/idempotent (deriving twice is deep-equal), firewall-safe (never
 * leaks a populated rationale), the 5-phase content spine, and the presentation
 * mappings (song → artistImage, launch tiles, Reflect reset checklist, blank
 * title promotion) plus interaction losslessness for legacy backfill.
 */
import { describe, expect, it } from 'vitest';
import {
  expectNoForbiddenKeys,
  expectNoRationaleLeak,
} from '../firewall.testUtils';
import { PHASES } from '../phases';
import { bareDay } from '../plan/bareDay.testUtils';
import { newBlankDay } from '../plan/newBlankDay';
import type { Day } from '../types';
import { deckFromCells } from './deckFromCells';
import { slidesAreSectionOrdered } from './sections';

/** A blank Day, then populate a couple of cells with student-safe content. */
const makePopulatedDay = (): Day => {
  const day = bareDay('Test Day');
  const connect = day.cells.connectRegulate.presentation;
  connect.title = { en: 'Warm Up', es: 'Calentamiento' };
  connect.prompt = { en: 'How do you feel today?' };
  connect.song = { id: 'lovely_day' };
  connect.launchTiles = [
    { id: 'lt-1', module: 'globe', activityRef: 'event-1' },
  ];

  const reflect = day.cells.respondReflectReset.presentation;
  reflect.resetChecklist = [
    { en: 'Chairs pushed in', es: 'Sillas acomodadas' },
  ];
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
    const deck = deckFromCells(day);
    expectNoForbiddenKeys(deck, 'deck');
    expectNoRationaleLeak(deck, 'deck');
  });

  it('a new Day yields its sections, with the starter check-in and exit question', () => {
    const deck = deckFromCells(newBlankDay('Blank'));
    expect(deck.slides.map((s) => [s.section, s.kind])).toEqual([
      ['connect', 'content'],
      ['connect', 'interaction'],
      ['groupProject', 'content'],
      ['individualProject', 'content'],
      ['present', 'content'],
      ['reflect', 'content'],
      ['reflect', 'interaction'],
    ]);
    // A truly empty phase is named by its student label.
    expect(deck.slides[0].title).toEqual({ en: 'Connect', es: 'Conecta' });
  });

  it('a bare Day yields exactly the 5 phase content slides in order', () => {
    const deck = deckFromCells(bareDay('Bare'));
    expect(deck.slides.map((s) => s.phase)).toEqual([...PHASES]);
    expect(deck.slides.every((s) => s.kind === 'content')).toBe(true);
  });

  it("splits Connect's song and spotlight tiles onto a Showcase slide", () => {
    const deck = deckFromCells(makePopulatedDay());
    const connect = deck.slides.find(
      (s) => s.id.endsWith('-present-connectRegulate') && s.kind === 'content',
    );
    expect(connect).toMatchObject({
      kind: 'content',
      section: 'connect',
      title: { en: 'Warm Up', es: 'Calentamiento' },
      prompt: { en: 'How do you feel today?' },
    });
    expect(connect).not.toHaveProperty('media');
    expect(connect).not.toHaveProperty('launchTiles');
    const showcase = deck.slides.find((s) => s.section === 'showcase');
    expect(showcase).toMatchObject({
      kind: 'content',
      phase: 'connectRegulate',
      media: { type: 'artistImage', songId: 'lovely_day' },
      launchTiles: [{ id: 'lt-1', module: 'globe', activityRef: 'event-1' }],
    });
  });

  it('runs in section order, every slide stamped', () => {
    const deck = deckFromCells(makePopulatedDay());
    expect(deck.slides.every((s) => s.section)).toBe(true);
    expect(slidesAreSectionOrdered(deck.slides)).toBe(true);
    expect(deck.slides.map((s) => s.section)).toEqual([
      'connect',
      'showcase',
      'groupProject',
      'individualProject',
      'present',
      'reflect',
      'reflect',
    ]);
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
    const ixSlide = deck.slides.find(
      (s) =>
        s.kind === 'interaction' && s.interactionIds.includes('ix-oneword'),
    );
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
    day.cells.groupPractice.presentation.prompt = {
      en: 'Clap the rhythm back',
    };
    const deck = deckFromCells(day);
    const practice = deck.slides.find((s) => s.phase === 'groupPractice');
    expect(practice?.title).toEqual({ en: 'Clap the rhythm back' });
    expect(practice?.prompt).toBeUndefined();
  });
});
