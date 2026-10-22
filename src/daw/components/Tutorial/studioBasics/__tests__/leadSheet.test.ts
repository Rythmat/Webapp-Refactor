// @vitest-environment jsdom
/**
 * Studio Basics 7 · The Lead Sheet, on the course's song. Each step's check
 * is armed as the lesson layer arms it: it doesn't pass then, and it passes
 * once the student's move lands in the store (scoreToSaveTestUtils.ts).
 *
 * Run: npx vitest run src/daw/components/Tutorial/studioBasics/__tests__/leadSheet.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printSheet } from '@/daw/commands/projectCommands';
import { MAX_TOTAL_TRACKS } from '@/daw/store/tracksSlice';
import { PICKER_TRACKS } from '../lessons/leadSheet';
import {
  arm,
  describeLessonConventions,
  openDemoSong,
  s,
  stepOf,
  trackNamed,
} from './scoreToSaveTestUtils';

const LEAD_SHEET = 'studio-basics-lead-sheet';

beforeEach(openDemoSong);
afterEach(() => vi.restoreAllMocks());

describe('the course’s song, for the lead sheet', () => {
  it('has a chord a bar, C Am F G, and Melody off', () => {
    expect(s().chordRegions.map((r) => r.noteName)).toEqual([
      'C maj',
      'A min',
      'F maj',
      'G maj',
    ]);
    expect(s().leadSheetShowMelody).toBe(false);
  });

  it('points at every track’s box in the melody picker', () => {
    expect(PICKER_TRACKS).toHaveLength(MAX_TOTAL_TRACKS);
  });
});

describe('The Lead Sheet', () => {
  it('open-score passes once the Score page shows, on either layout', () => {
    let { passes } = arm(LEAD_SHEET, 'open-score');
    expect(s().currentView).toBe('arrange');
    expect(passes()).toBe(false);
    s().setCurrentView('studio');
    expect(passes()).toBe(false);
    // The Score tab opens the layout last shown.
    s().setCurrentView('score');
    expect(passes()).toBe(true);
    ({ passes } = arm(LEAD_SHEET, 'open-score'));
    s().setCurrentView('leadsheet');
    expect(passes()).toBe(true);
  });

  it('open-lead-sheet starts on the Full score and passes on the Lead sheet', () => {
    // From Create, or from the Lead sheet the Score tab may have opened.
    s().setCurrentView('leadsheet');
    const { passes } = arm(LEAD_SHEET, 'open-lead-sheet');
    expect(s().currentView).toBe('score');
    expect(passes()).toBe(false);
    s().setCurrentView('leadsheet');
    expect(passes()).toBe(true);
  });

  it('melody-on passes once Melody is on', () => {
    const { passes } = arm(LEAD_SHEET, 'melody-on');
    expect(passes()).toBe(false);
    s().setLeadSheetShowMelody(true);
    expect(passes()).toBe(true);
  });

  it('pick-melody-track passes when the picked tracks change', () => {
    s().setLeadSheetShowMelody(true);
    let { passes } = arm(LEAD_SHEET, 'pick-melody-track');
    expect(passes()).toBe(false);
    // Ticking the track Auto shows is still a choice made.
    s().toggleLeadSheetMelodyTrack(trackNamed('Melody').id);
    expect(passes()).toBe(true);
    // And going back to Auto.
    ({ passes } = arm(LEAD_SHEET, 'pick-melody-track'));
    s().setLeadSheetMelodyTrackIds([]);
    expect(passes()).toBe(true);
  });

  it('melody-off passes once Melody is off', () => {
    s().setLeadSheetShowMelody(true);
    const { passes } = arm(LEAD_SHEET, 'melody-off');
    expect(passes()).toBe(false);
    s().setLeadSheetShowMelody(false);
    expect(passes()).toBe(true);
  });

  it('change-a-chord passes when a chord symbol says something new', () => {
    let { passes } = arm(LEAD_SHEET, 'change-a-chord');
    expect(passes()).toBe(false);
    const f = s().chordRegions.find((r) => r.noteName === 'F maj');
    if (!f) throw new Error('no F chord');
    // The 4 chord, F, made Dm as the lesson suggests.
    s().renameChordRegion(f.id, '2 min', 'D min');
    expect(passes()).toBe(true);
    // A chord written on an empty beat counts too.
    ({ passes } = arm(LEAD_SHEET, 'change-a-chord'));
    s().insertChordRegion(960, '5 maj', 'G maj');
    expect(passes()).toBe(true);
  });

  it('change-a-chord points at bar 3’s chord, the song’s F', () => {
    const step = stepOf(LEAD_SHEET, 'change-a-chord');
    expect(s().chordRegions[2].noteName).toBe('F maj');
    expect(step.target?.[0]).toBe('leadsheet-chord-2-0');
  });

  it('print passes when the lead sheet’s print dialog opens', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const { passes } = arm(LEAD_SHEET, 'print');
    expect(passes()).toBe(false);
    printSheet('printScore');
    expect(passes()).toBe(false);
    printSheet('printLeadSheet');
    expect(passes()).toBe(true);
  });
});

describeLessonConventions(LEAD_SHEET);
