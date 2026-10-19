// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { sameChordSymbols } from '@/daw/utils/chordAnalysis';

const BAR = 1920;
const note = (n: number, startTick: number) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks: BAR,
  channel: 0,
});
const track = (
  id: string,
  trackRole: string,
  events: ReturnType<typeof note>[],
) =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument: 'electric-piano',
    trackRole,
    midiClips: [{ id: `${id}-clip`, startTick: 0, events }],
    audioClips: [],
  }) as unknown as Track;

// Dm7 → G7 → Cmaj7 over the bass.
const keys = track('keys', 'chords', [
  ...[62, 65, 69, 72].map((n) => note(n, 0)),
  ...[55, 59, 62, 65].map((n) => note(n, BAR)),
  ...[60, 64, 67, 71].map((n) => note(n, 2 * BAR)),
]);
const bass = track('bass', 'bass', [
  note(38, 0),
  note(43, BAR),
  note(36, 2 * BAR),
]);

const s = () => useStore.getState();

describe('chord symbols: analyze, then use', () => {
  beforeEach(() => {
    useStore.setState({
      tracks: [keys, bass],
      chordRegions: [],
      rootNote: 0,
      mode: 'ionian',
      chordAnalysis: null,
      chordAnalysisOffered: false,
      chordAnalysisDismissed: false,
      chordAnalysisPromptOpen: false,
      unisonDoc: null,
    });
  });

  it('offers analysis only for a project with chord notes and no chord symbols', () => {
    s().offerChordAnalysis();
    // The chord lane's banner, not a dialog over the editor (insight-22).
    expect(s().chordAnalysisOffered).toBe(true);
    expect(s().chordAnalysisPromptOpen).toBe(false);

    useStore.setState({ chordAnalysisOffered: false, tracks: [bass] });
    s().offerChordAnalysis();
    expect(s().chordAnalysisOffered).toBe(false);
  });

  it('opens the dialog from the banner, and Not now keeps it away on this project', () => {
    s().offerChordAnalysis();
    s().openChordAnalysisPrompt();
    expect(s().chordAnalysisPromptOpen).toBe(true);
    expect(s().chordAnalysisOffered).toBe(false);
    s().closeChordAnalysisPrompt();

    s().offerChordAnalysis();
    s().dismissChordAnalysis();
    expect(s().chordAnalysisOffered).toBe(false);
    expect(s().chordAnalysisDismissed).toBe(true);
    s().offerChordAnalysis();
    expect(s().chordAnalysisOffered).toBe(false);
  });

  it('analysis proposes chord symbols; the chord lane changes only when they’re used', () => {
    const analysis = s().analyzeChords();
    expect(analysis.regions.map((r) => r.degreeKey)).toEqual([
      '2 minor7',
      '5 dominant7',
      '1 major7',
    ]);
    expect(s().chordAnalysis).toBe(analysis);
    expect(s().chordRegions).toEqual([]);

    s().applyChordSymbols();
    expect(sameChordSymbols(s().chordRegions, analysis.regions)).toBe(true);
  });

  it('using chords read in a detected key sets that key', () => {
    useStore.setState({ rootNote: null });
    const analysis = s().analyzeChords();
    expect(analysis.keyDetected).toBe(true);
    s().applyChordSymbols();
    expect(s().rootNote).toBe(analysis.rootNote);
    expect(s().chordRegions.length).toBeGreaterThan(0);
  });
});
