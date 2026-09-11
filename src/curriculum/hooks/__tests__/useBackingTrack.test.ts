import { describe, expect, it, vi } from 'vitest';
import { chordSymbolToBassPC } from '../../engine/genreGeneration/chordBassNote';
import type { ActivityStepV2 } from '../../types/activity.v2';
import { buildBackingNotes } from '../useBackingTrack';

// The audio engines aren't exercised here — only the note timeline.
vi.mock('tone', () => ({}));
vi.mock('@/audio/core/toneBridge', () => ({ startTone: vi.fn() }));
vi.mock('../../../daw/instruments/DrumMachineEngine', () => ({
  DrumMachineEngine: class {},
}));
vi.mock('../../../daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {},
}));
vi.mock('../../engine/genreGeneration/epSamplerV2', () => ({
  startEpSampler: vi.fn(),
  triggerEpAttackRelease: vi.fn(),
}));

const BAR = 1920;
const LEAD_IN = 2 * BAR; // piano roll count-in bar + one-bar note offset
const CHORDS = ['Dm7', 'G7', 'Am7', 'C'];

const step = {
  chordSymbols: CHORDS,
  backing_parts: {
    engine_generates: ['drums', 'bass'],
    student_plays: ['chords'],
  },
} as unknown as ActivityStepV2;

const build = (countIn: number) =>
  buildBackingNotes(step, 62, 1, 'l1a', [], 'funk', countIn);

describe('buildBackingNotes lead-in', () => {
  // Regression: Play Now started the backing at transport 0 while the student's
  // bar 1 is two bars in, so the backing ran two bars ahead of the target notes.
  it('starts the bass on the student’s bar 1', () => {
    const bass = build(LEAD_IN).filter((n) => n.part === 'bass');
    expect(Math.min(...bass.map((n) => n.onset))).toBeGreaterThanOrEqual(
      LEAD_IN,
    );
  });

  it('plays each bar’s chord root in that target bar', () => {
    const bass = build(LEAD_IN).filter((n) => n.part === 'bass');
    for (let bar = 0; bar < 8; bar++) {
      const start = LEAD_IN + bar * BAR;
      const downbeat = bass
        .filter((n) => n.onset >= start && n.onset < start + 60)
        .sort((a, b) => a.note - b.note)[0];
      expect(downbeat, `bar ${bar + 1}`).toBeDefined();
      expect(downbeat.note % 12, `bar ${bar + 1}`).toBe(
        chordSymbolToBassPC(CHORDS[bar % CHORDS.length]),
      );
    }
  });

  it('counts the student in with drums during the lead-in', () => {
    const leadIn = build(LEAD_IN).filter((n) => n.onset < LEAD_IN);
    expect(leadIn.length).toBeGreaterThan(0);
    expect(leadIn.every((n) => n.part === 'drums')).toBe(true);
  });

  it('leaves the timeline unchanged without a lead-in', () => {
    const bass = build(0).filter((n) => n.part === 'bass');
    const firstBar = bass.filter((n) => n.onset < 60);
    expect(firstBar[0]?.note % 12).toBe(chordSymbolToBassPC(CHORDS[0]));
  });
});
