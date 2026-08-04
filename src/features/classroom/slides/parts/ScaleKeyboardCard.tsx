/**
 * ScaleKeyboardCard — the Learn Overview "Scale" section, reusable inside a
 * classroom slide's `media` block. Renders a highlighted piano for a mode in a
 * key, the interval / notes / key-signature text, and a Play Scale button —
 * matching `/learn/:mode/:key` (see components/learn/LessonOverview.tsx).
 *
 * Deliberately lightweight and provider-free: `PianoKeyboard` highlights purely
 * by MIDI note (PianoContext has a safe default), the text reuses the pure
 * helpers `getChordScales` / note-spelling, and the Play Scale audio (Tone.js +
 * epSampler) is lazy-imported on click so it never bloats the editor/thumbnail
 * bundle. No react-query / heavy providers, so it renders on every surface.
 */
import { Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { getChordScales } from '@/components/learn/chordScaleData';
import { buildPitchClassSpellingMap } from '@/components/learn/noteSpellingLookup';
import type { PlaybackEvent } from '@/contexts/PlaybackContext';
import type { PrismModeSlug } from '@/hooks/data/prism';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { urlParamToKeyLabel } from '@/lib/musicKeyUrl';

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

/** Key URL token → pitch class (chromatic index, matches catalog KEYS order). */
const TOKEN_PC: Record<string, number> = {
  c: 0,
  csharp: 1,
  d: 2,
  eflat: 3,
  e: 4,
  f: 5,
  fsharp: 6,
  g: 7,
  aflat: 8,
  a: 9,
  bflat: 10,
  b: 11,
};

/** Semitone step patterns for every mode the Theory picker can emit. The three
 *  pentatonic/blues scales are absent from the engine's ALL_MODES, so they are
 *  listed explicitly here to keep this component self-contained. */
const MODE_STEPS: Record<string, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
};

const DEGREE_LABELS = [
  '1',
  '♭2',
  '2',
  '♭3',
  '3',
  '4',
  '♭5',
  '5',
  '♭6',
  '6',
  '♭7',
  '7',
] as const;

const PRETTY_MODE: Record<string, string> = {
  pentatonicMajor: 'Pentatonic Major',
  pentatonicMinor: 'Pentatonic Minor',
  blues: 'Blues',
  harmonicMinor: 'Harmonic Minor',
};

const pcOf = (midi: number) => ((midi % 12) + 12) % 12;

/** Add the root (0) + closing octave (12), dedupe, sort. */
const normalizeSteps = (steps: number[]): number[] => {
  const set = new Set<number>(steps.map((s) => Math.round(s)));
  set.add(0);
  if (![...set].some((n) => n >= 12)) set.add(12);
  return [...set].sort((a, b) => a - b);
};

const intervalLabelFromSteps = (steps: number[]): string =>
  normalizeSteps(steps)
    .filter((s) => s < 12)
    .map((s) => DEGREE_LABELS[pcOf(s)])
    .join(', ');

const keySignatureDescription = (notes: string[]): string => {
  const sharps = notes.filter((n) => n.includes('♯') || n.includes('#')).length;
  const flats = notes.filter((n) => n.includes('♭')).length;
  if (sharps === 0 && flats === 0) return 'has no sharps or flats';
  const parts: string[] = [];
  if (sharps > 0) parts.push(`${sharps} sharp${sharps > 1 ? 's' : ''}`);
  if (flats > 0) parts.push(`${flats} flat${flats > 1 ? 's' : ''}`);
  return `has ${parts.join(' and ')}`;
};

/** Width-fitting wrapper (mirrors LessonOverview's local ScaledPiano). */
const ScaledPiano = ({ children }: { children: React.ReactNode }) => {
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
      if (iw > 0) {
        setScale(cw / iw);
        setInnerHeight(inner.scrollHeight);
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
      className="pointer-events-none w-full overflow-hidden"
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
};

interface ScaleKeyboardCardProps {
  /** Mode slug, e.g. `ionian`, `dorian`, `blues`. */
  mode: string;
  /** Key URL token, e.g. `c`, `bflat`, `fsharp`. */
  keyToken: string;
  className?: string;
}

export const ScaleKeyboardCard = ({
  mode,
  keyToken,
  className,
}: ScaleKeyboardCardProps) => {
  const keyLabel = urlParamToKeyLabel(keyToken);
  const pc = TOKEN_PC[keyToken] ?? 0;
  const rootMidi = 60 + pc;

  const steps = MODE_STEPS[mode] ?? [0, 2, 4, 5, 7, 9, 11];
  const scaleMidis = useMemo(
    () => normalizeSteps(steps).map((i) => rootMidi + i),
    [steps, rootMidi],
  );

  const color = colorForKeyMode(keyLabel, mode as PrismModeSlug);

  // Stable highlight events (match by midi; time/id don't affect highlighting).
  const playingNotes = useMemo<PlaybackEvent[]>(
    () =>
      scaleMidis.map((midi, i) => ({
        id: `sk-${midi}-${i}`,
        type: 'note',
        midi,
        time: 0,
        duration: 0,
        velocity: 1,
      })),
    [scaleMidis],
  );

  // During Play Scale, walk one note at a time up the keyboard (idle = full
  // scale). Track every timeout so a mid-play unmount / restart cancels cleanly.
  const [animatingNotes, setAnimatingNotes] = useState<PlaybackEvent[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    },
    [],
  );

  const cs = getChordScales(mode);
  const modeName = cs?.modeName ?? PRETTY_MODE[mode] ?? mode;
  const intervals = cs?.intervals ?? intervalLabelFromSteps(steps);

  const noteLabels = useMemo(() => {
    const map = buildPitchClassSpellingMap(mode, keyLabel, scaleMidis);
    const count = normalizeSteps(steps).length - 1; // drop the closing octave
    return scaleMidis
      .slice(0, count)
      .map((midi) => map.get(pcOf(midi)) ?? PITCH_CLASS_NAMES[pcOf(midi)]);
  }, [mode, keyLabel, scaleMidis, steps]);

  const { startC, endC } = useMemo(() => {
    const mid = (scaleMidis[0] + scaleMidis[scaleMidis.length - 1]) / 2;
    const centerOctave = Math.round(mid / 12) - 1;
    return { startC: Math.max(0, centerOctave - 2), endC: centerOctave + 2 };
  }, [scaleMidis]);

  const play = useCallback(async () => {
    // Cancel any in-flight run so a re-click restarts cleanly.
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const [{ startEpSampler, triggerEpAttackRelease }, Tone] =
      await Promise.all([import('@/audio/epSampler'), import('tone')]);
    await startEpSampler();

    scaleMidis.forEach((midi, i) => {
      const noteName = Tone.Frequency(midi, 'midi').toNote();
      timeoutsRef.current.push(
        setTimeout(() => {
          triggerEpAttackRelease(noteName, 0.4, 0.8);
          // Single, uniquely-id'd event so PianoKeyboard's key={id} remounts
          // and re-fires the press animation each step.
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
        }, i * 600),
      );
    });
    timeoutsRef.current.push(
      setTimeout(() => setAnimatingNotes([]), scaleMidis.length * 600),
    );
  }, [scaleMidis]);

  return (
    <div className={`flex w-full flex-col gap-3 ${className ?? ''}`}>
      <ScaledPiano>
        <PianoKeyboard
          activeBlackKeyColor={color}
          activeWhiteKeyColor={color}
          enableClick={false}
          endC={endC}
          playingNotes={
            animatingNotes.length > 0 ? animatingNotes : playingNotes
          }
          startC={startC}
          useContextNotes={false}
        />
      </ScaledPiano>
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
        <p
          className="text-white/85"
          style={{ fontSize: 'var(--slide-body-fz)' }}
        >
          The key of &ldquo;{noteLabels[0] ?? keyLabel} {modeName}&rdquo;{' '}
          {keySignatureDescription(noteLabels)}.
        </p>
        <p
          className="text-white/85"
          style={{ fontSize: 'var(--slide-body-fz)' }}
        >
          {modeName} Intervals: {intervals}
        </p>
        <p
          className="text-white/85"
          style={{ fontSize: 'var(--slide-body-fz)' }}
        >
          The notes of the scale are: {noteLabels.join(', ')}
        </p>
        <button
          type="button"
          onClick={play}
          className="mt-1 flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold text-black transition-colors"
          style={{ background: color }}
        >
          <Play size={16} fill="currentColor" /> Play Scale
        </button>
      </div>
    </div>
  );
};
