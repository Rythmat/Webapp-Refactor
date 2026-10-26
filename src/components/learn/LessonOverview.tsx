import { Play } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import * as Tone from 'tone';
import { startEpSampler, triggerEpAttackRelease } from '@/audio/epSampler';
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
  PROMPT_FRAME,
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
  PROMPT_SURFACE,
  PROMPT_WASH,
  PromptPillButton,
} from '@/components/promptBox/PromptBoxParts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { KeyboardDiagram } from '@/learn/components/KeyboardDiagram';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import {
  formatChord,
  useChordNotation,
  type ChordContext,
  type ChordNotation,
} from '@/lib/chordNotation';
import { modeCharacter } from '@/lib/learn/modeCharacter';
import { isScaleLesson } from '@/lib/learn/scaleLessons';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';

type LessonOverviewProps = {
  mode: PrismModeSlug;
  rootMidi: number;
  rootKey?: string;
  activeTab?: 'scale' | 'triads' | 'sevenths' | 'inversions';
  /** Its "C Lydian" heading; off in a lesson, whose header names it. */
  showTitle?: boolean;
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
  const intervals = useMemo(() => chordIntervalLabels(midis), [midis]);

  const handlePlay = () => {
    playChord(midis);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The prompt box's card, opaque over the page. */}
      <DialogContent className={cn(PROMPT_SURFACE, 'max-w-4xl bg-[#141416]')}>
        <DialogHeader className="text-left">
          <DialogTitle
            className="text-lg"
            style={{ color: 'var(--color-text)' }}
          >
            {title}
          </DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <KeyboardDiagram notes={midis} color={activeKeyColor} />
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
          <PromptPillButton
            variant="primary"
            onClick={handlePlay}
            className="gap-2"
          >
            <Play size={14} fill="currentColor" />
            Play
          </PromptPillButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** chordScaleData qualities spelled in a way the chord formatter doesn't read. */
const QUALITY_ALIASES: Record<string, string> = { min69: 'min6/9' };
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];

/**
 * The chord's degree from the tonic's major scale as chordScaleData writes it
 * ("♯4"), when it names the chord's actual root (a few entries don't). The
 * formatter would otherwise work the degree out from the root's pitch and
 * spell it flat (Lydian's B in F as "♭5").
 */
function scaleDataDegree(
  chord: ChordInfo,
  keyRootPc: number,
): string | undefined {
  const match = /^([♭♯]?)([1-7])$/.exec(chord.degree ?? '');
  if (!match) return undefined;
  const accidental = match[1] === '♭' ? -1 : match[1] === '♯' ? 1 : 0;
  const pc = keyRootPc + MAJOR_SCALE_STEPS[Number(match[2]) - 1] + accidental;
  return normalizePitchClass(pc) === normalizePitchClass(chord.midis[0])
    ? chord.degree
    : undefined;
}

/**
 * A diatonic chord's label in the chosen notation. Hybrid keeps "2. D minor 7";
 * jazz and Roman write the one symbol ("D−7", "ii7") without the "N. " prefix,
 * and the octave copy of chord 1 adds "(8va)" to stay apart from it. A chord
 * the notation can't write keeps its hybrid label.
 */
function diatonicChordLabel(
  chord: ChordInfo,
  notation: ChordNotation,
  keyRootPc: number,
): string {
  const root = chord.noteNames[0];
  if (notation === 'hybrid' || !chord.quality || !root) {
    return chord.degreeLabel;
  }
  const spec = {
    quality: QUALITY_ALIASES[chord.quality] ?? chord.quality,
    // The page's own spelling; double accidentals in ASCII so they read as a letter.
    root: root.replace(/𝄫/gu, 'bb').replace(/𝄪/gu, '##'),
    tonicDegree: scaleDataDegree(chord, keyRootPc),
  };
  // Given the spelled root and its tonic degree, the mode doesn't change the
  // symbol; without a degree the formatter counts from the tonic, as here.
  const context: ChordContext = { keyRootPc };
  const symbol = formatChord(spec, notation, context);
  if (symbol === formatChord(spec, 'hybrid', context)) return chord.degreeLabel;
  return chord.degreeNumber === 8 ? `${symbol} (8va)` : symbol;
}

function ChordCard({
  chord,
  label,
  inversionIndex,
  activeKeyColor,
}: {
  chord: ChordInfo;
  /** The chord's label in the chosen notation (diatonicChordLabel). */
  label: string;
  inversionIndex: number;
  activeKeyColor: string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const voicings = useMemo(() => buildInversions(chord), [chord]);
  const current = voicings[inversionIndex] ?? voicings[0];

  return (
    <>
      <div
        // The prompt box's card, as Home's and Learn's.
        className={cn(
          PROMPT_FRAME,
          PROMPT_WASH,
          'flex cursor-pointer flex-col items-start gap-2 p-3 hover:bg-white/[0.06]',
        )}
        onClick={() => setDetailOpen(true)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playChord(current.midis);
          }}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          aria-label="Play chord"
        >
          <Play size={16} fill="currentColor" />
        </button>
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {label}
        </p>
        <KeyboardDiagram notes={current.midis} color={activeKeyColor} />
      </div>
      <ChordDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={label}
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
  keyRootPc,
  title,
}: {
  chords: ChordInfo[];
  activeKeyColor: string;
  keyRootPc: number;
  title: string;
}) {
  const notation = useChordNotation();
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
      <div className="grid w-full max-w-7xl grid-cols-1 gap-4">
        {displayChords.map((chord) => (
          <ChordCard
            key={chord.degreeNumber}
            activeKeyColor={activeKeyColor}
            chord={chord}
            inversionIndex={invIdx}
            label={diatonicChordLabel(chord, notation, keyRootPc)}
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
}: {
  label: string;
  midis: number[];
  noteNames: string[];
  activeKeyColor: string;
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          PROMPT_FRAME,
          PROMPT_WASH,
          'flex cursor-pointer flex-col items-center gap-2 p-3 hover:bg-white/[0.06]',
        )}
        onClick={() => setDetailOpen(true)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playChord(midis);
          }}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          aria-label="Play chord"
        >
          <Play size={16} fill="currentColor" />
        </button>
        <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          {label}
        </p>
        <KeyboardDiagram notes={midis} color={activeKeyColor} />
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
  keyRootPc,
}: {
  triads: ChordInfo[];
  sevenths: ChordInfo[];
  activeKeyColor: string;
  keyRootPc: number;
}) {
  const notation = useChordNotation();
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
              aria-pressed={isActive}
              className={cn(
                PROMPT_PILL,
                isActive ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
              )}
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
              {diatonicChordLabel(chord, notation, keyRootPc)}
            </p>
            <div className="grid grid-cols-1 gap-4">
              {voicings.map((v) => (
                <InversionCard
                  key={v.inversionIndex}
                  activeKeyColor={activeKeyColor}
                  label={v.inversionLabel}
                  midis={v.midis}
                  noteNames={chord.noteNames}
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
  showTitle = true,
}: LessonOverviewProps) {
  const tab = activeTab;
  const { data: modeDetail, isPending: isModePending } = usePrismMode(mode);

  // An unrecognized `mode` slug must never fall through to DEFAULT_INTERVALS:
  // that renders a major scale under the requested mode's name, teaching the
  // wrong notes with no visible sign anything went wrong. The 35 modes in
  // ALL_MODES resolve locally; the API covers the rest (blues, pentatonics,
  // symmetric scales), so only wait on the query when the local lookup misses.
  const localSteps = getLocalModeSteps(mode);
  const resolvedSteps = localSteps ?? modeDetail?.steps;
  const isUnknownMode = !resolvedSteps && !isModePending;
  const scaleSteps = resolvedSteps ?? DEFAULT_INTERVALS;
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
  // What the mode sounds like, in one line; the 35 engine modes have one.
  const character = modeCharacter(mode);

  const pcSpellingMap = useMemo(
    () => buildPitchClassSpellingMap(mode, activeKeyLabel, scaleMidis),
    [mode, activeKeyLabel, scaleMidis],
  );
  const scaleNoteLabels = useMemo(
    () =>
      scaleMidis.map((midi) => {
        const pc = normalizePitchClass(midi);
        return pcSpellingMap.get(pc) ?? PITCH_CLASS_NAMES[pc];
      }),
    [pcSpellingMap, scaleMidis],
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
    const countAccidentals = (weights: Record<string, number>) =>
      notes.reduce(
        (total, name) =>
          total +
          [...name].reduce((sum, char) => sum + (weights[char] ?? 0), 0),
        0,
      );
    const sharps = countAccidentals({ '♯': 1, '#': 1, '𝄪': 2 });
    const flats = countAccidentals({ '♭': 1, '𝄫': 2 });
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

  if (isUnknownMode) {
    return (
      <div
        className={cn(
          PROMPT_FRAME,
          PROMPT_WASH,
          'm-4 flex w-auto flex-col gap-2 p-5 text-left',
        )}
        data-mode={mode}
        data-unknown-mode="true"
      >
        <p className="text-base" style={{ color: 'var(--color-text)' }}>
          We don&rsquo;t have a scale named &ldquo;{mode}&rdquo;.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
          This link points at a mode the lesson library doesn&rsquo;t recognize.
          Pick the scale from the Theory library instead.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-mode={mode}>
      {showTitle && (
        <h2 className="px-4 text-left text-2xl font-normal leading-tight -tracking-wide text-white md:text-3xl">
          {`${scaleNoteLabels[0] ?? PITCH_CLASS_NAMES[rootPitchClass]} ${modeName}`}
        </h2>
      )}

      {/* Scale tab */}
      {tab === 'scale' && (
        <div className="flex flex-col gap-3">
          {/* Every lesson's keyboard, docked on the bar (LessonKeyboard). */}
          <LessonKeyboard
            activeBlackKeyColor={activeKeyColor}
            activeWhiteKeyColor={activeKeyColor}
            enableClick={false}
            playingNotes={
              animatingNotes.length > 0 ? animatingNotes : activeNotes
            }
            targetMidis={scaleMidis}
            useContextNotes={false}
          />
          {/* The prompt box's card, as Home's and Learn's. */}
          <div
            className={cn(
              PROMPT_FRAME,
              PROMPT_WASH,
              'flex flex-col gap-2 p-5 text-left',
            )}
          >
            {character && (
              <p className="text-lg leading-7 text-white">{character}.</p>
            )}
            {/* A pentatonic or blues scale is not a key, so it has no key
                signature to describe. */}
            {!isScaleLesson(mode) && (
              <p className="text-base" style={{ color: 'var(--color-text)' }}>
                The key of &ldquo;{scaleNoteLabels[0] ?? activeKeyLabel}{' '}
                {modeName}&rdquo; {keySignatureDescription}.
              </p>
            )}
            <p className="text-base" style={{ color: 'var(--color-text)' }}>
              {modeName} scale degrees: {chordScaleData?.intervals ?? ''}
            </p>
            <p className="text-base" style={{ color: 'var(--color-text)' }}>
              The notes of the scale are:{' '}
              {scaleNoteLabels.slice(0, 7).join(', ')}
            </p>
            <PromptPillButton
              variant="primary"
              onClick={handlePlayScale}
              className="mt-2 gap-2 self-start"
            >
              <Play size={14} fill="currentColor" /> Play Scale
            </PromptPillButton>
          </div>
        </div>
      )}

      {/* Triads tab */}
      {tab === 'triads' && (
        <ChordGrid
          activeKeyColor={activeKeyColor}
          chords={triads}
          keyRootPc={rootPitchClass}
          title="Triads"
        />
      )}

      {/* 7th Chords tab */}
      {tab === 'sevenths' && (
        <ChordGrid
          activeKeyColor={activeKeyColor}
          chords={sevenths}
          keyRootPc={rootPitchClass}
          title="7th Chords"
        />
      )}

      {/* Inversions tab */}
      {tab === 'inversions' && (
        <InversionsTab
          activeKeyColor={activeKeyColor}
          keyRootPc={rootPitchClass}
          sevenths={sevenths}
          triads={triads}
        />
      )}
    </div>
  );
}
