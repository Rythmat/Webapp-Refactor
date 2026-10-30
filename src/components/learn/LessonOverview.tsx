import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { startEpSampler, triggerEpAttackRelease } from '@/audio/epSampler';
import {
  buildTriads,
  buildSevenths,
  buildNinths,
  buildInversions,
  chordIntervalLabels,
  type ChordInfo,
  type ChordVoicing,
} from '@/components/learn/buildDiatonicChords';
import { getChordScales } from '@/components/learn/chordScaleData';
import {
  buildPitchClassSpellingMap,
  getNoteSpelling,
} from '@/components/learn/noteSpellingLookup';
import {
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import {
  formatChord,
  useChordNotation,
  type ChordContext,
  type ChordSpec,
} from '@/lib/chordNotation';
import { modeCharacter } from '@/lib/learn/modeCharacter';
import { isScaleLesson } from '@/lib/learn/scaleLessons';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { getLocalModeSteps } from '@/lib/modeStepsFallback';

export type LessonOverviewTab =
  | 'scale'
  | 'triads'
  | 'sevenths'
  | 'ninths'
  | 'inversions';

type LessonOverviewProps = {
  mode: PrismModeSlug;
  rootMidi: number;
  rootKey?: string;
  activeTab?: LessonOverviewTab;
  /** The card's Triads / 7ths / 9ths / Inversions toggle; without it the
   *  Overview keeps its tab itself. */
  onTabChange?: (tab: LessonOverviewTab) => void;
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

const SCALE_NOTE_MS = 600;

async function playScaleAscending(midis: number[]) {
  await startEpSampler();
  midis.forEach((midi, i) => {
    const noteName = Tone.Frequency(midi, 'midi').toNote();
    setTimeout(() => {
      triggerEpAttackRelease(noteName, 0.4, 0.8);
    }, i * SCALE_NOTE_MS);
  });
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

/** The chord as the formatter reads it, in the page's own spelling. */
function chordSpec(chord: ChordInfo, keyRootPc: number): ChordSpec | null {
  const root = chord.noteNames[0];
  if (!chord.quality || !root) return null;
  return {
    quality: QUALITY_ALIASES[chord.quality] ?? chord.quality,
    // Double accidentals in ASCII so they read as a letter.
    root: root.replace(/𝄫/gu, 'bb').replace(/𝄪/gu, '##'),
    tonicDegree: scaleDataDegree(chord, keyRootPc),
  };
}

/**
 * A chord tile's two lines, as the landing's: the symbol ("D−7", or "ii7" in
 * Roman) over its hybrid name ("2 min7"). A chord the formatter can't read at
 * all keeps its hybrid label ("2. D minor 7").
 */
function chordTileLabel(
  chord: ChordInfo,
  keyRootPc: number,
  roman: boolean,
): { symbol: string; hybrid: string } {
  const spec = chordSpec(chord, keyRootPc);
  if (!spec) return { symbol: chord.degreeLabel, hybrid: '' };
  // Given the spelled root and its tonic degree, the mode doesn't change the
  // symbol; without a degree the formatter counts from the tonic, as here.
  const context: ChordContext = { keyRootPc };
  const hybrid = formatChord(spec, 'hybrid', context);
  const symbol = formatChord(spec, roman ? 'roman' : 'jazz', context);
  // No symbol for it (a few altered 9ths): its letter and quality, "D maj7(♭9)".
  return symbol === hybrid
    ? { symbol: `${chord.noteNames[0]} ${chord.quality}`, hybrid }
    : { symbol, hybrid };
}

/** An inversion chip's name: "Root", "1st"…, the triads' octave "8va". */
const shortInversionLabel = (voicing: ChordVoicing) =>
  voicing.inversionLabel === 'Root (8va)'
    ? '8va'
    : voicing.inversionLabel.replace(' Inversion', '');

/** A chord's voicings; triads also get root position an octave up. */
function voicingsOf(chord: ChordInfo, triads: boolean): ChordVoicing[] {
  const voicings = buildInversions(chord);
  if (triads) {
    voicings.push({
      inversionIndex: voicings.length,
      inversionLabel: 'Root (8va)',
      midis: chord.midis.map((m) => m + 12),
    });
  }
  return voicings;
}

const CHORD_VIEWS = [
  { id: 'triads', label: 'Triads' },
  { id: 'sevenths', label: '7ths' },
  { id: 'ninths', label: '9ths' },
  { id: 'inversions', label: 'Inversions' },
] as const;

/** The landing's segmented toggle (TheoryScene). */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  small = false,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  small?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 rounded-full bg-black/30 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-full transition-colors',
            small ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
            value === o.id
              ? 'bg-white text-[#101012]'
              : 'text-white/55 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LessonOverview({
  mode,
  rootMidi,
  rootKey,
  activeTab,
  onTabChange,
  showTitle = true,
}: LessonOverviewProps) {
  const [ownTab, setOwnTab] = useState<LessonOverviewTab>('scale');
  const tab = activeTab ?? ownTab;
  const setTab = (next: LessonOverviewTab) => {
    if (onTabChange) onTabChange(next);
    else setOwnTab(next);
  };
  const { data: modeDetail, isPending: isModePending } = usePrismMode(mode);
  const notation = useChordNotation();
  const reduceMotion = useReducedMotion();

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

  const ninths = useMemo(
    () =>
      buildNinths(
        scaleSteps,
        resolvedRootMidi,
        noteSpelling,
        chordScaleData?.ninths ?? [],
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

  // The chord picked (shared by the chord views) and, in Inversions, which
  // chords and which voicing.
  const [chordIdx, setChordIdx] = useState(0);
  const [invType, setInvType] = useState<'triads' | 'sevenths'>('triads');
  const [invIdx, setInvIdx] = useState(0);

  // The scale run: the note sounding, cleared with its timers on unmount.
  const [runMidi, setRunMidi] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const clearRun = () => {
    timers.current.splice(0).forEach(clearTimeout);
    setRunMidi(null);
  };
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const handlePlayScale = () => {
    clearRun();
    playScaleAscending(scaleMidis);
    scaleMidis.forEach((midi, i) =>
      timers.current.push(
        window.setTimeout(() => setRunMidi(midi), i * SCALE_NOTE_MS),
      ),
    );
    timers.current.push(
      window.setTimeout(
        () => setRunMidi(null),
        scaleMidis.length * SCALE_NOTE_MS,
      ),
    );
  };

  const chordView = tab !== 'scale';
  const chordSet =
    tab === 'ninths'
      ? ninths
      : tab === 'sevenths' || (tab === 'inversions' && invType === 'sevenths')
        ? sevenths
        : triads;
  const chord = chordSet[Math.min(chordIdx, chordSet.length - 1)] as
    | ChordInfo
    | undefined;
  const voicings = useMemo(
    () => (chord ? voicingsOf(chord, chordSet === triads) : []),
    [chord, chordSet, triads],
  );
  const voicing =
    tab === 'inversions' ? (voicings[invIdx] ?? voicings[0]) : voicings[0];

  const pickChord = (i: number) => {
    const picked = chordSet[i];
    if (!picked) return;
    setChordIdx(i);
    setInvIdx(0);
    playChord(picked.midis);
  };
  const pickVoicing = (i: number) => {
    const picked = voicings[i];
    if (!picked) return;
    setInvIdx(i);
    playChord(picked.midis);
  };
  const pickInvType = (next: 'triads' | 'sevenths') => {
    setInvType(next);
    setInvIdx(0);
  };

  // The keys: the scale as a tint, the chord (or the scale run's note) lit.
  const hintNotes = useMemo(
    () => new Map(scaleMidis.map((m) => [m, activeKeyColor])),
    [scaleMidis, activeKeyColor],
  );
  const litMidis = useMemo(
    () =>
      chordView ? (voicing?.midis ?? []) : runMidi !== null ? [runMidi] : [],
    [chordView, voicing, runMidi],
  );
  const playingNotes = useMemo(
    () =>
      litMidis.map<PlaybackEvent>((midi, index) => ({
        id: `${mode}-${activeKeyLabel}-lit-${midi}-${index}`,
        type: 'note',
        midi,
        time: 0,
        duration: 0,
        velocity: 1,
        color: activeKeyColor,
      })),
    [litMidis, mode, activeKeyLabel, activeKeyColor],
  );
  const targetMidis = useMemo(
    () => [...scaleMidis, ...litMidis],
    [scaleMidis, litMidis],
  );

  const tileLabel = useCallback(
    (c: ChordInfo) => chordTileLabel(c, rootPitchClass, notation === 'roman'),
    [rootPitchClass, notation],
  );

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

  const keyName = `${scaleNoteLabels[0] ?? activeKeyLabel} ${modeName}`;
  const title =
    tab === 'scale'
      ? keyName
      : tab === 'triads'
        ? `Diatonic Triads: ${keyName}`
        : tab === 'sevenths'
          ? `Diatonic 7th Chords: ${keyName}`
          : tab === 'ninths'
            ? `Diatonic 9th Chords: ${keyName}`
            : `Inversions: ${keyName}`;

  const chordName = chord ? tileLabel(chord).symbol : '';
  const caption = !chordView
    ? chordScaleData?.intervals
      ? `${modeName} scale degrees: ${chordScaleData.intervals}`
      : ''
    : !chord || !voicing
      ? ''
      : tab === 'inversions'
        ? `${chordName}, ${voicing.inversionLabel.toLowerCase()}: ${voicing.midis
            .map(
              (m) =>
                chord.noteNames[
                  chord.midis.findIndex(
                    (n) => normalizePitchClass(n) === normalizePitchClass(m),
                  )
                ] ?? '',
            )
            .join(', ')}`
        : `${chordName}: ${chord.noteNames.join(', ')} · ${chordIntervalLabels(
            chord.midis,
          ).join(', ')}`;

  return (
    <div className="flex flex-col gap-4" data-mode={mode}>
      {showTitle && (
        <h2 className="px-4 text-left text-2xl font-normal leading-tight -tracking-wide text-white md:text-3xl">
          {`${scaleNoteLabels[0] ?? PITCH_CLASS_NAMES[rootPitchClass]} ${modeName}`}
        </h2>
      )}

      {/* The landing's Theory card (TheoryScene): a toggle, the chords as
          tiles in the key's color, and a caption; the keys are the lesson's. */}
      <div
        className={cn(
          PROMPT_FRAME,
          PROMPT_WASH,
          'flex flex-col gap-3 p-4 text-left text-white',
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10">
            <BookOpen className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs uppercase tracking-[0.12em] text-white/45">
              Lesson · Theory
            </span>
            <span className="truncate text-base">{title}</span>
          </div>
          {chordView && (
            <Segmented
              label="Chords"
              options={CHORD_VIEWS}
              value={tab}
              onChange={setTab}
            />
          )}
        </div>

        {tab === 'scale' && (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {scaleMidis.map((m, i) => (
                <span
                  key={m}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-center text-sm transition-colors duration-200',
                    runMidi === m
                      ? 'text-[#101012]'
                      : 'bg-white/[0.05] text-white/70',
                  )}
                  style={
                    runMidi === m ? { background: activeKeyColor } : undefined
                  }
                >
                  {scaleNoteLabels[i]}
                </span>
              ))}
            </div>
            <button
              type="button"
              data-overview-play
              onClick={handlePlayScale}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#101012] transition-transform duration-300 hover:scale-105"
              style={{ background: activeKeyColor }}
            >
              <Play className="size-3 fill-current" /> Play
            </button>
          </div>
        )}

        {chordView && (
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {chordSet.map((c, i) => {
              const { symbol, hybrid } = tileLabel(c);
              return (
                <motion.button
                  key={`${tab}-${invType}-${c.degreeNumber}`}
                  type="button"
                  data-chord-tile
                  initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => pickChord(i)}
                  aria-pressed={chordIdx === i}
                  className={cn(
                    'flex min-w-0 flex-col items-start rounded-md px-2 py-1.5 text-left text-[#101012] transition-shadow',
                    chordIdx === i && 'ring-2 ring-white',
                  )}
                  style={{ background: activeKeyColor }}
                >
                  <span className="max-w-full truncate text-base leading-none">
                    {symbol}
                  </span>
                  {hybrid && (
                    <span className="mt-1 max-w-full truncate text-xs opacity-70">
                      {hybrid}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {tab === 'inversions' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-1 gap-1">
              {voicings.map((v, i) => (
                <button
                  key={v.inversionLabel}
                  type="button"
                  aria-pressed={invIdx === i}
                  onClick={() => pickVoicing(i)}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-center text-sm transition-colors duration-200',
                    invIdx === i
                      ? 'text-[#101012]'
                      : 'bg-white/[0.05] text-white/70 hover:text-white',
                  )}
                  style={
                    invIdx === i ? { background: activeKeyColor } : undefined
                  }
                >
                  {shortInversionLabel(v)}
                </button>
              ))}
            </div>
            <Segmented
              small
              label="Inversions of"
              options={[
                { id: 'triads', label: 'Triads' },
                { id: 'sevenths', label: '7ths' },
              ]}
              value={invType}
              onChange={pickInvType}
            />
          </div>
        )}

        {caption && <p className="truncate text-sm text-white/55">{caption}</p>}
      </div>

      {tab === 'scale' && (
        <div className="flex flex-col gap-2 px-1 text-left">
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
            The notes of the scale are: {scaleNoteLabels.slice(0, 7).join(', ')}
          </p>
        </div>
      )}

      {/* Every lesson's keyboard, docked on the bar (LessonKeyboard): the
          scale tinted, the chord lit. */}
      <LessonKeyboard
        activeBlackKeyColor={activeKeyColor}
        activeWhiteKeyColor={activeKeyColor}
        enableClick={chordView}
        hintNotes={hintNotes}
        playingNotes={playingNotes}
        targetMidis={targetMidis}
        useContextNotes={false}
      />
    </div>
  );
}
