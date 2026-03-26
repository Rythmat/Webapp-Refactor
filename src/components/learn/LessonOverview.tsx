import { Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { startEpSampler, triggerEpAttackRelease } from '@/audio/epSampler';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import {
  buildTriads,
  buildSevenths,
  buildInversions,
  chordIntervalLabels,
  type ChordInfo,
} from '@/components/learn/buildDiatonicChords';
import { getChordScales } from '@/components/learn/chordScaleData';
import {
  buildPitchClassSpellingMap,
  getNoteSpelling,
} from '@/components/learn/noteSpellingLookup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { useNoteByMidiMap } from '@/hooks/data/notes/useNotes';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';

type LessonOverviewProps = {
  mode: PrismModeSlug;
  rootMidi: number;
  rootKey?: string;
  activeTab?: 'scale' | 'triads' | 'sevenths' | 'inversions';
};

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const DEFAULT_ROOT_MIDI = 60;

const PITCH_CLASS_NAMES = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;
const KEY_LABEL_BY_PITCH_CLASS = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
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

function midiToPlaybackEvents(
  midis: number[],
  prefix: string,
): PlaybackEvent[] {
  return midis.map((midi, i) => ({
    id: `${prefix}-${midi}-${i}`,
    type: 'note',
    midi,
    time: Date.now(),
    duration: 0,
    velocity: 1,
  }));
}

function ScaledPiano({
  children,
  pointerEventsNone,
}: {
  children: React.ReactNode;
  pointerEventsNone?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;
    let prevWidth = 0;
    const update = () => {
      const cw = container.clientWidth;
      if (cw === prevWidth) return;
      prevWidth = cw;
      const iw = inner.scrollWidth;
      const ih = inner.scrollHeight;
      if (iw > 0) {
        const s = cw / iw;
        setScale(s);
        setInnerHeight(ih);
      }
    };
    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden${pointerEventsNone ? ' pointer-events-none' : ''}`}
      style={{ height: innerHeight ? `${innerHeight * scale}px` : undefined }}
    >
      <div
        ref={innerRef}
        style={{
          width: 'fit-content',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

async function playChord(midis: number[]) {
  await startEpSampler();
  midis.forEach((midi, i) => {
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    setTimeout(() => {
      triggerEpAttackRelease(noteName, 0.8, 0.8);
    }, i * 30);
  });
}

async function playScaleAscending(midis: number[]) {
  await startEpSampler();
  midis.forEach((midi, i) => {
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    setTimeout(() => {
      triggerEpAttackRelease(noteName, 0.4, 0.8);
    }, i * 600);
  });
}

function ChordDetailDialog({
  open,
  onOpenChange,
  title,
  midis,
  noteNames,
  activeKeyColor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  midis: number[];
  noteNames: string[];
  activeKeyColor: string;
}) {
  const playingNotes = useMemo(
    () => midiToPlaybackEvents(midis, `detail-${title}`),
    [midis, title],
  );
  const intervals = useMemo(() => chordIntervalLabels(midis), [midis]);

  const handlePlay = () => {
    playChord(midis);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-panel max-w-4xl rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.20)',
          border: '1px solid var(--color-border)',
        }}
      >
        <DialogHeader className="text-left">
          <DialogTitle
            className="text-lg"
            style={{ color: 'var(--color-text)' }}
          >
            {title}
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <ScaledPiano>
          <PianoKeyboard
            activeBlackKeyColor={activeKeyColor}
            activeWhiteKeyColor={activeKeyColor}
            enableClick={false}
            endC={7}
            playingNotes={playingNotes}
            startC={4}
            useContextNotes={false}
          />
        </ScaledPiano>
        <p
          className="text-left text-base font-medium"
          style={{ color: '#ffffff' }}
        >
          Notes: {noteNames.join(', ')}
        </p>
        <div className="flex items-center justify-between">
          <p
            className="text-left text-base font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            Intervals: {intervals.join(', ')}
          </p>
          <button
            type="button"
            onClick={handlePlay}
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-150"
            style={{
              background: 'var(--color-accent)',
              color: '#ffffff',
            }}
          >
            <Play size={16} fill="currentColor" />
            Play
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChordCard({
  chord,
  inversionIndex,
  activeKeyColor,
}: {
  chord: ChordInfo;
  inversionIndex: number;
  activeKeyColor: string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const voicings = useMemo(() => buildInversions(chord), [chord]);
  const current = voicings[inversionIndex] ?? voicings[0];

  const playingNotes = useMemo(
    () =>
      midiToPlaybackEvents(
        current.midis,
        `chord-${chord.degreeNumber}-inv${inversionIndex}`,
      ),
    [current.midis, chord.degreeNumber, inversionIndex],
  );

  return (
    <>
      <div
        className="glass-panel-sm relative flex cursor-pointer flex-col items-start gap-2 rounded-xl p-3 transition-colors duration-150 hover:brightness-110"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
        onClick={() => setDetailOpen(true)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playChord(current.midis);
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/10"
          style={{ color: 'var(--color-accent)' }}
          aria-label="Play chord"
        >
          <Play size={16} fill="currentColor" />
        </button>
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {chord.degreeLabel}
        </p>
        <ScaledPiano pointerEventsNone>
          <PianoKeyboard
            activeBlackKeyColor={activeKeyColor}
            activeWhiteKeyColor={activeKeyColor}
            enableClick={false}
            endC={7}
            playingNotes={playingNotes}
            startC={4}
            useContextNotes={false}
          />
        </ScaledPiano>
      </div>
      <ChordDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={chord.degreeLabel}
        midis={current.midis}
        noteNames={chord.noteNames}
        activeKeyColor={activeKeyColor}
      />
    </>
  );
}

const INVERSION_LABELS = [
  'Root Position',
  '1st Inversion',
  '2nd Inversion',
  '3rd Inversion',
];

function ChordGrid({
  chords,
  activeKeyColor,
  title,
}: {
  chords: ChordInfo[];
  activeKeyColor: string;
  title: string;
}) {
  const maxInversions = chords[0]?.midis.length ?? 3;
  const [invIdx, setInvIdx] = useState(0);

  const cycleInversion = () => {
    setInvIdx((prev) => (prev + 1) % maxInversions);
  };

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
      <div className="flex items-center gap-3">
        <h3
          className="text-base font-semibold md:text-lg"
          style={{ color: 'var(--color-text)' }}
        >
          {INVERSION_LABELS[invIdx]} {title}
        </h3>
        <button
          type="button"
          onClick={cycleInversion}
          className="flex items-center gap-1 text-sm transition-colors duration-150"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <span style={{ fontSize: '18px' }}>&#x203A;</span>
        </button>
      </div>
      <div className="grid w-full max-w-7xl grid-cols-2 gap-4">
        {displayChords.map((chord) => (
          <ChordCard
            key={chord.degreeNumber}
            activeKeyColor={activeKeyColor}
            chord={chord}
            inversionIndex={invIdx}
          />
        ))}
      </div>
    </div>
  );
}

function InversionCard({
  label,
  midis,
  noteNames,
  activeKeyColor,
  prefix,
}: {
  label: string;
  midis: number[];
  noteNames: string[];
  activeKeyColor: string;
  prefix: string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const playingNotes = useMemo(
    () => midiToPlaybackEvents(midis, prefix),
    [midis, prefix],
  );

  return (
    <>
      <div
        className="glass-panel-sm relative flex cursor-pointer flex-col items-center gap-2 rounded-xl p-3 transition-colors duration-150 hover:brightness-110"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
        onClick={() => setDetailOpen(true)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playChord(midis);
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/10"
          style={{ color: 'var(--color-accent)' }}
          aria-label="Play chord"
        >
          <Play size={16} fill="currentColor" />
        </button>
        <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          {label}
        </p>
        <ScaledPiano pointerEventsNone>
          <PianoKeyboard
            activeBlackKeyColor={activeKeyColor}
            activeWhiteKeyColor={activeKeyColor}
            enableClick={false}
            endC={7}
            playingNotes={playingNotes}
            startC={4}
            useContextNotes={false}
          />
        </ScaledPiano>
      </div>
      <ChordDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={label}
        midis={midis}
        noteNames={noteNames}
        activeKeyColor={activeKeyColor}
      />
    </>
  );
}

function InversionsTab({
  triads,
  sevenths,
  activeKeyColor,
}: {
  triads: ChordInfo[];
  sevenths: ChordInfo[];
  activeKeyColor: string;
}) {
  const [invType, setInvType] = useState<'triads' | 'sevenths'>('triads');
  const chords = invType === 'triads' ? triads : sevenths;
  const title =
    invType === 'triads' ? 'Triad Inversions' : '7th Chord Inversions';

  return (
    <div className="flex flex-col gap-6 px-4">
      <div className="flex gap-2">
        {(['triads', 'sevenths'] as const).map((t) => {
          const isActive = invType === t;
          const label = t === 'triads' ? 'Triads' : '7th Chords';
          return (
            <button
              key={t}
              type="button"
              onClick={() => setInvType(t)}
              className="rounded-lg px-3 py-1 text-xs font-medium transition-colors duration-150"
              style={{
                background: isActive
                  ? 'rgba(126, 207, 207, 0.12)'
                  : 'rgba(255,255,255,0.03)',
                border: isActive
                  ? '1px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
                color: isActive
                  ? 'var(--color-accent)'
                  : 'var(--color-text-dim)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <h3
        className="text-base font-semibold md:text-lg"
        style={{ color: 'var(--color-text)' }}
      >
        {title}
      </h3>
      {chords.map((chord) => {
        const voicings = buildInversions(chord);
        if (invType === 'triads') {
          voicings.push({
            inversionIndex: voicings.length,
            inversionLabel: 'Root (8va)',
            midis: chord.midis.map((m) => m + 12),
          });
        }
        return (
          <div key={chord.degreeNumber} className="flex flex-col gap-3">
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {chord.degreeLabel}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {voicings.map((v) => (
                <InversionCard
                  key={v.inversionIndex}
                  activeKeyColor={activeKeyColor}
                  label={v.inversionLabel}
                  midis={v.midis}
                  noteNames={chord.noteNames}
                  prefix={`inv-${chord.degreeNumber}-${v.inversionIndex}`}
                />
              ))}
            </div>
            <div
              className="my-2 h-px"
              style={{ background: 'var(--color-border)' }}
            />
          </div>
        );
      })}
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
    () => getNoteSpelling(mode, activeKeyLabel) ?? scaleNoteLabels.slice(0, 7),
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
    const sharps = notes.filter(
      (n) => n.includes('♯') || n.includes('#'),
    ).length;
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

  const [animatingNotes, setAnimatingNotes] = useState<PlaybackEvent[]>([]);

  const handlePlayScale = useCallback(() => {
    playScaleAscending(scaleMidis);
    scaleMidis.forEach((midi, i) => {
      setTimeout(() => {
        setAnimatingNotes([
          {
            id: `anim-${midi}-${i}`,
            type: 'note',
            midi,
            time: Date.now(),
            duration: 0,
            velocity: 1,
          },
        ]);
      }, i * 600);
    });
    setTimeout(() => {
      setAnimatingNotes([]);
    }, scaleMidis.length * 600);
  }, [scaleMidis]);

  const { scaleStartC, scaleEndC } = useMemo(() => {
    const midCenter = (scaleMidis[0] + scaleMidis[scaleMidis.length - 1]) / 2;
    const centerOctave = Math.round(midCenter / 12) - 1;
    return {
      scaleStartC: Math.max(0, centerOctave - 2),
      scaleEndC: centerOctave + 2,
    };
  }, [scaleMidis]);

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
        <div className="flex flex-col gap-3">
          <ScaledPiano>
            <PianoKeyboard
              activeBlackKeyColor={activeKeyColor}
              activeWhiteKeyColor={activeKeyColor}
              enableClick={false}
              endC={scaleEndC}
              playingNotes={
                animatingNotes.length > 0 ? animatingNotes : activeNotes
              }
              startC={scaleStartC}
              useContextNotes={false}
            />
          </ScaledPiano>
          <div
            className="glass-panel-sm flex flex-col gap-2 rounded-xl p-4 text-left"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
            }}
          >
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
            <button
              type="button"
              onClick={handlePlayScale}
              className="mt-1 flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150"
              style={{ background: 'var(--color-accent)', color: '#ffffff' }}
            >
              <Play size={16} fill="currentColor" /> Play Scale
            </button>
          </div>
        </div>
      )}

      {/* Triads tab */}
      {tab === 'triads' && (
        <ChordGrid
          activeKeyColor={activeKeyColor}
          chords={triads}
          title="Triads"
        />
      )}

      {/* 7th Chords tab */}
      {tab === 'sevenths' && (
        <ChordGrid
          activeKeyColor={activeKeyColor}
          chords={sevenths}
          title="7th Chords"
        />
      )}

      {/* Inversions tab */}
      {tab === 'inversions' && (
        <InversionsTab
          activeKeyColor={activeKeyColor}
          sevenths={sevenths}
          triads={triads}
        />
      )}
    </div>
  );
}
