import { useMemo } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import {
  buildTriads,
  buildSevenths,
  type ChordInfo,
} from '@/components/learn/buildDiatonicChords';
import { getChordScales } from '@/components/learn/chordScaleData';
import {
  buildPitchClassSpellingMap,
  getNoteSpelling,
} from '@/components/learn/noteSpellingLookup';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { useNoteByMidiMap } from '@/hooks/data/notes/useNotes';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';

type LessonOverviewProps = {
  mode: PrismModeSlug;
  rootMidi: number;
  rootKey?: string;
  activeTab?: 'scale' | 'triads' | 'sevenths';
};

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const DEFAULT_ROOT_MIDI = 60;

const PITCH_CLASS_NAMES = [
  'C', 'D♭', 'D', 'E♭', 'E', 'F',
  'F♯', 'G', 'A♭', 'A', 'B♭', 'B',
] as const;
const KEY_LABEL_BY_PITCH_CLASS = [
  'C', 'D♭', 'D', 'E♭', 'E', 'F',
  'F♯', 'G', 'A♭', 'A', 'B♭', 'B',
] as const;
const normalizePitchClass = (midi: number) => ((midi % 12) + 12) % 12;

const normalizeSteps = (steps?: number[]) => {
  if (!steps || steps.length === 0) return DEFAULT_INTERVALS;
  const unique = new Set<number>();
  steps.forEach((step) => {
    if (typeof step === 'number' && Number.isFinite(step)) {
      unique.add(Math.round(step));
    }
  });
  if (!unique.has(0)) unique.add(0);
  if (!Array.from(unique).some((n) => n >= 12)) unique.add(12);
  return Array.from(unique).sort((a, b) => a - b);
};

const buildScaleMidis = (rootMidi: number, steps?: number[]) =>
  normalizeSteps(steps).map((interval) => rootMidi + interval);

function ChordCard({
  chord,
  activeKeyColor,
}: {
  chord: ChordInfo;
  activeKeyColor: string;
}) {
  const playingNotes = useMemo(
    () =>
      chord.midis.map<PlaybackEvent>((midi, i) => ({
        id: `chord-${chord.degreeNumber}-${midi}-${i}`,
        type: 'note',
        midi,
        time: Date.now(),
        duration: 0,
        velocity: 1,
      })),
    [chord.midis, chord.degreeNumber],
  );

  return (
    <div
      className="glass-panel-sm flex flex-col items-center gap-2 rounded-xl p-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p
        className="text-xs font-semibold"
        style={{ color: 'var(--color-text)' }}
      >
        {chord.degreeLabel}
      </p>
      <div className="w-full">
        <PianoKeyboard
          activeBlackKeyColor={activeKeyColor}
          activeWhiteKeyColor={activeKeyColor}
          enableClick={false}
          endC={6}
          playingNotes={playingNotes}
          startC={4}
          useContextNotes={false}
        />
      </div>
      <p
        className="text-[10px]"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {chord.noteNames.join(' – ')}
      </p>
    </div>
  );
}

function ChordGrid({
  chords,
  activeKeyColor,
  title,
}: {
  chords: ChordInfo[];
  activeKeyColor: string;
  title: string;
}) {
  const displayChords = useMemo(() => {
    if (chords.length === 0) return [];
    const first = chords[0];
    const octaveRepeat: ChordInfo = {
      ...first,
      degreeNumber: 8,
      degreeLabel: first.degreeLabel.replace(/^\d+/, '8'),
      midis: first.midis.map((m) => m + 12),
    };
    return [...chords, octaveRepeat];
  }, [chords]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h3
        className="text-base font-semibold md:text-lg"
        style={{ color: 'var(--color-text)' }}
      >
        {title}
      </h3>
      <div className="grid w-full max-w-5xl grid-cols-2 gap-4">
        {displayChords.map((chord) => (
          <ChordCard
            key={chord.degreeNumber}
            activeKeyColor={activeKeyColor}
            chord={chord}
          />
        ))}
      </div>
    </div>
  );
}

export function LessonOverview({
  mode,
  rootMidi,
  rootKey,
  activeTab = 'scale',
}: LessonOverviewProps) {
  const tab = activeTab;
  const { data: modeDetail } = usePrismMode(mode);
  const { data: noteByMidiMap } = useNoteByMidiMap();

  const scaleSteps =
    getLocalModeSteps(mode) ?? modeDetail?.steps ?? DEFAULT_INTERVALS;
  const resolvedRootMidi = Number.isFinite(rootMidi)
    ? rootMidi
    : DEFAULT_ROOT_MIDI;
  const scaleMidis = useMemo(
    () => buildScaleMidis(resolvedRootMidi, scaleSteps),
    [resolvedRootMidi, scaleSteps],
  );
  const rootPitchClass = normalizePitchClass(resolvedRootMidi);
  const activeKeyLabel = rootKey ?? KEY_LABEL_BY_PITCH_CLASS[rootPitchClass];
  const activeKeyColor = colorForKeyMode(activeKeyLabel, mode);

  const chordScaleData = getChordScales(mode);
  const modeName = chordScaleData?.modeName ?? mode;

  const pcSpellingMap = useMemo(
    () => buildPitchClassSpellingMap(mode, activeKeyLabel, scaleMidis),
    [mode, activeKeyLabel, scaleMidis],
  );
  const scaleNoteLabels = useMemo(
    () =>
      scaleMidis.map((midi) => {
        const pc = normalizePitchClass(midi);
        const spelled = pcSpellingMap.get(pc);
        if (spelled) return spelled;
        const note = noteByMidiMap?.get(midi);
        if (note?.noteName) return note.noteName;
        return PITCH_CLASS_NAMES[pc];
      }),
    [pcSpellingMap, noteByMidiMap, scaleMidis],
  );

  const noteSpelling = useMemo(
    () =>
      getNoteSpelling(mode, activeKeyLabel) ??
      scaleNoteLabels.slice(0, 7),
    [mode, activeKeyLabel, scaleNoteLabels],
  );

  const triads = useMemo(
    () =>
      buildTriads(
        scaleSteps,
        resolvedRootMidi,
        noteSpelling,
        chordScaleData?.triads ?? [],
      ),
    [scaleSteps, resolvedRootMidi, noteSpelling, chordScaleData],
  );

  const sevenths = useMemo(
    () =>
      buildSevenths(
        scaleSteps,
        resolvedRootMidi,
        noteSpelling,
        chordScaleData?.sevenths ?? [],
      ),
    [scaleSteps, resolvedRootMidi, noteSpelling, chordScaleData],
  );

  const keySignatureDescription = useMemo(() => {
    const notes = scaleNoteLabels.slice(0, 7);
    const sharps = notes.filter((n) => n.includes('♯') || n.includes('#')).length;
    const flats = notes.filter((n) => n.includes('♭')).length;
    if (sharps === 0 && flats === 0) return 'has no sharps or flats';
    const parts: string[] = [];
    if (sharps > 0) parts.push(`${sharps} sharp${sharps > 1 ? 's' : ''}`);
    if (flats > 0) parts.push(`${flats} flat${flats > 1 ? 's' : ''}`);
    return `has ${parts.join(' and ')}`;
  }, [scaleNoteLabels]);

  const activeNotes = useMemo(() => {
    return scaleMidis.map<PlaybackEvent>((midi, index) => ({
      id: `${mode}-${activeKeyLabel}-${midi}-${index}`,
      type: 'note',
      midi,
      time: Date.now(),
      duration: 0,
      velocity: 1,
    }));
  }, [activeKeyLabel, mode, scaleMidis]);

  return (
    <div className="flex flex-col gap-6" data-mode={mode}>
      <h2
        className="px-4 text-left text-2xl font-semibold md:text-3xl"
        style={{ color: 'var(--color-text)' }}
      >
        {`${scaleNoteLabels[0] ?? PITCH_CLASS_NAMES[rootPitchClass]} ${modeName}`}
      </h2>

      {/* Scale tab */}
      {tab === 'scale' && (
        <>
          <PianoKeyboard
            activeBlackKeyColor={activeKeyColor}
            activeWhiteKeyColor={activeKeyColor}
            enableClick={false}
            endC={6}
            playingNotes={activeNotes}
            startC={4}
            useContextNotes={false}
          />
          <div className="flex flex-col gap-2 px-4 text-left">
            <p className="text-base" style={{ color: 'var(--color-text)' }}>
              The key of &ldquo;{scaleNoteLabels[0] ?? activeKeyLabel}{' '}
              {modeName}&rdquo; {keySignatureDescription}.
            </p>
            <p className="text-base" style={{ color: 'var(--color-text)' }}>
              {modeName} Intervals: {chordScaleData?.intervals ?? ''}
            </p>
            <p className="text-base" style={{ color: 'var(--color-text)' }}>
              The notes of the scale are:{' '}
              {scaleNoteLabels.slice(0, 7).join(', ')}
            </p>
          </div>
        </>
      )}

      {/* Triads tab */}
      {tab === 'triads' && (
        <ChordGrid
          activeKeyColor={activeKeyColor}
          chords={triads}
          title="Root Position Triads"
        />
      )}

      {/* 7th Chords tab */}
      {tab === 'sevenths' && (
        <ChordGrid
          activeKeyColor={activeKeyColor}
          chords={sevenths}
          title="Root Position 7th Chords"
        />
      )}

    </div>
  );
}
