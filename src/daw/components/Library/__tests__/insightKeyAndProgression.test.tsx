// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { sessionToUnison } from '@/unison/converters/sessionToUnison';
import type { UnisonDocument } from '@/unison/types/schema';
import { UnisonSections } from '../UnisonSections';

// ── Insight's key and progression (2026-10-21) ─────────────────────────────
// The key the student set is certain (no percentage, no other keys); the
// key card itself went from Insight (owner, 2026-10-24). The progression
// shows its best match first, and Vibes, Styles, Rhythm and Melody are gone.

const initial = useStore.getState();
afterEach(() => {
  cleanup();
  useStore.setState(initial, true);
});

const n = (note: number, startTick: number) => ({
  note,
  velocity: 90,
  startTick,
  durationTicks: 1920,
  channel: 0,
});
/** Bars of chords, low note first. */
const bars = (chords: number[][]) =>
  chords.flatMap((c, i) => c.map((p) => n(p, i * 1920)));

function analyse(
  rootNote: number | null,
  mode: string,
  events: ReturnType<typeof n>[],
) {
  return sessionToUnison({
    tracks: [
      {
        id: 'keys',
        name: 'Keys',
        type: 'midi',
        instrument: 'piano-sampler',
        midiClips: [{ events }],
      },
    ],
    chordRegions: [],
    bpm: 120,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    rootNote,
    mode,
  } as never);
}

const C_POP = bars([
  [48, 60, 64, 67],
  [43, 59, 62, 67],
  [45, 57, 60, 64],
  [41, 57, 60, 65],
  [48, 60, 64, 67],
]);

describe('the key the student set', () => {
  it('is certain: confidence 1 and no other keys', () => {
    const doc = analyse(0, 'ionian', C_POP);
    expect(doc.analysis.key.confidence).toBe(1);
    expect(doc.analysis.key.alternateKeys).toEqual([]);
    expect(doc.analysis.key.fromNotes?.rootPc).toBe(0);
  });
});

describe('the progression', () => {
  const doc = (
    matches: Partial<
      UnisonDocument['analysis']['progressionMatches'][number]
    >[],
  ) =>
    ({
      analysis: {
        key: { rootPc: 0, mode: 'ionian' },
        progressionMatches: matches.map((m, i) => ({
          libraryId: i,
          progression: '1 major - 5 major - 6 minor - 4 major',
          score: 1,
          artist: '',
          song: '',
          ...m,
        })),
        vibes: ['dreamy'],
        styles: ['pop'],
      },
      rhythm: {},
      melody: {},
    }) as unknown as UnisonDocument;

  it('leads with the best match and lists only close ones', () => {
    useStore.setState({ rootNote: 0, mode: 'ionian' });
    render(
      <UnisonSections
        unisonDoc={doc([
          { score: 1, artist: 'Journey', song: 'Don’t Stop Believin’' },
          {
            libraryId: 1,
            progression: '4 major - 1 major - 5 major - 6 minor',
            score: 0.98,
          },
          {
            libraryId: 2,
            progression: '2 minor - 5 major - 1 major',
            score: 0.72,
          },
        ])}
      />,
    );
    expect(screen.getByTestId('insight-progression-best')).toHaveTextContent(
      '100%',
    );
    expect(screen.getByTestId('insight-progression-best')).toHaveTextContent(
      'Journey',
    );
    // 98% is close; 72% isn't listed.
    expect(screen.getAllByTestId('insight-progression-close')).toHaveLength(1);
  });

  it('has no Vibes, Styles, Rhythm or Melody', () => {
    render(<UnisonSections unisonDoc={doc([{ score: 1 }])} />);
    for (const gone of [/Vibes/, /Styles/, /Rhythm/, /Melody/]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
  });
});
