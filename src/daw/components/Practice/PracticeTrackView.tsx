import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useNavigate } from 'react-router';
import { ALL_MODES, noteNameInKey } from '@prism/engine';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { LearnRoutes } from '@/constants/routes';
import type { PlaybackEvent } from '@/contexts/PlaybackContext/helpers';
import { keyName } from '@/daw/components/Library/chordInKey';
import { useStore } from '@/daw/store';
import type { PracticeSession } from '@/daw/store/uiSlice';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { formatChordRegion } from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';

/**
 * The screen a Practice Track opens on: one job — play over this — with the
 * chart, a big Play, Record, loop and tempo, and the scale lit on a keyboard.
 * It drives the same project and transport as the full Studio, so "Open in
 * full Studio" is only a change of view.
 */
interface PracticeTrackViewProps {
  session: PracticeSession;
  isReady: boolean;
  onInit: () => void;
}

const ACCENT = '#7ecfcf';
const OFF_SCALE = '#71717a';
const TEMPO_MIN = 50;
const TEMPO_MAX = 160;
// The keyboard shows C3–B5 (PianoKeyboard counts octaves from MIDI 0).
const KEYBOARD_START_C = 4;
const KEYBOARD_END_C = 6;
const KEYBOARD_LOW = KEYBOARD_START_C * 12;
const KEYBOARD_HIGH = KEYBOARD_END_C * 12 + 11;

export function PracticeTrackView({
  session,
  isReady,
  onInit,
}: PracticeTrackViewProps) {
  const navigate = useNavigate();
  const notation = useChordNotation();
  const projectName = useStore((s) => s.projectName);
  const rootNote = useStore((s) => s.rootNote) ?? 0;
  const mode = useStore((s) => s.mode);
  const chordRegions = useStore((s) => s.chordRegions);
  const bpm = useStore((s) => s.bpm);
  const position = useStore((s) => s.position);
  const isPlaying = useStore((s) => s.isPlaying);
  const isRecording = useStore((s) => s.isRecording);
  const isCountingIn = useStore((s) => s.isCountingIn);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const openTrack = useStore((s) =>
    s.tracks.find((t) => t.id === s.selectedTrackId),
  );
  const { play, pause, stop, record, setBpm, toggleLoop, setCurrentView } =
    useStore.getState();

  const withInit = useCallback(
    (action: () => void) => {
      if (!isReady) onInit();
      action();
    },
    [isReady, onInit],
  );

  const tonic = displayAccidentals(noteNameInKey(rootNote, rootNote, mode));
  const scalePcs = useMemo(
    () => (ALL_MODES[mode] ?? ALL_MODES.ionian).map((i) => (rootNote + i) % 12),
    [mode, rootNote],
  );
  const scaleNames = useMemo(
    () =>
      scalePcs.map((pc) =>
        displayAccidentals(noteNameInKey(pc, rootNote, mode)),
      ),
    [mode, rootNote, scalePcs],
  );

  const task =
    session.openTrack === 'melody'
      ? `Improvise melodies using the ${keyName(tonic, mode)} scale`
      : 'Play these chords over the track';

  // The scale is labelled once, on the octave nearest the middle of the
  // keyboard, each name sitting over its own key.
  const scaleLabels = useMemo(() => {
    const tonicMidi = middleTonic(rootNote);
    return (ALL_MODES[mode] ?? ALL_MODES.ionian).map((step, i) => ({
      midi: tonicMidi + step,
      name: scaleNames[i],
    }));
  }, [mode, rootNote, scaleNames]);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const octaveCs = useMemo(
    () =>
      Array.from(
        { length: KEYBOARD_END_C - KEYBOARD_START_C + 1 },
        (_, i) => (KEYBOARD_START_C + i) * 12,
      ),
    [],
  );
  const keyCenters = useKeyCenters(keyboardRef, KEYBOARD_START_C);

  const scaleSet = useMemo(() => new Set(scalePcs), [scalePcs]);
  const scaleKeys = useMemo(() => {
    const keys = new Map<number, string>();
    for (let midi = KEYBOARD_LOW; midi <= KEYBOARD_HIGH; midi++) {
      if (scaleSet.has(midi % 12)) keys.set(midi, ACCENT);
    }
    return keys;
  }, [scaleSet]);
  const playedKeys: PlaybackEvent[] = useMemo(
    () =>
      [...hwActiveNotes].map((midi) => ({
        id: `hw-${midi}`,
        type: 'note',
        midi,
        time: 0,
        duration: Number.POSITIVE_INFINITY,
        velocity: 1,
        color: scaleSet.has(midi % 12) ? ACCENT : OFF_SCALE,
      })),
    [hwActiveNotes, scaleSet],
  );

  const takeNotes = (openTrack?.midiClips ?? []).reduce(
    (count, clip) => count + clip.events.length,
    0,
  );
  const openTrackLabel = session.openTrack === 'melody' ? 'Melody' : 'Chords';
  // Playing the chords makes the chart the task; improvising makes it context.
  const chartLarge = session.openTrack === 'chords';

  const togglePlay = useCallback(
    () => withInit(isPlaying ? pause : play),
    [isPlaying, pause, play, withInit],
  );
  const toggleRecord = useCallback(
    () => (isRecording || isCountingIn ? stop() : withInit(record)),
    [isCountingIn, isRecording, record, stop, withInit],
  );

  // Space plays and pauses, as it does in the full Studio.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      togglePlay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]);

  const backToLesson = () => {
    stop();
    navigate(
      LearnRoutes.lesson({ mode: session.mode, key: session.rootParam }),
    );
  };

  // Chord chart: one box per chord, the one sounding now lit.
  const chordChart = (
    <>
      <div
        className={`grid gap-2 ${chartLarge ? 'w-full' : 'w-full max-w-2xl'}`}
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, Math.min(chordRegions.length, 8))}, minmax(0, 1fr))`,
        }}
      >
        {chordRegions.map((region) => {
          const now =
            isPlaying &&
            position >= region.startTick &&
            position < region.endTick;
          const letter = displayAccidentals(region.noteName);
          const symbol = formatChordRegion(
            region,
            notation === 'hybrid' ? 'jazz' : notation,
            { keyRootPc: rootNote, mode },
            letter,
          );
          return (
            <div
              key={region.id}
              data-now={now || undefined}
              className={`rounded-xl text-center transition-colors duration-100 ${chartLarge ? 'px-3 py-5' : 'px-2 py-1.5'}`}
              style={{
                background: now
                  ? 'rgba(126,207,207,0.18)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${now ? ACCENT : 'var(--color-border)'}`,
              }}
            >
              <div
                className={
                  chartLarge
                    ? 'text-3xl font-semibold'
                    : 'text-lg font-semibold'
                }
              >
                {symbol}
              </div>
              <div
                className={chartLarge ? 'mt-1 text-sm' : 'text-xs'}
                style={{ color: 'var(--color-text-dim)' }}
              >
                {displayAccidentals(region.name)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  // Transport and the take hint: the only controls this screen needs.
  const transport = (
    <>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-full px-8 py-3 text-lg font-semibold"
          style={{ background: ACCENT, color: '#191919' }}
        >
          {isPlaying && !isRecording ? '❚❚ Pause' : '▶ Play'}
        </button>
        <button
          type="button"
          onClick={toggleRecord}
          className="rounded-full px-6 py-3 text-base font-semibold"
          style={{
            border: '1px solid #ef4444',
            color: isRecording || isCountingIn ? '#191919' : '#ef4444',
            background: isRecording || isCountingIn ? '#ef4444' : 'transparent',
          }}
        >
          {isCountingIn
            ? 'Counting in…'
            : isRecording
              ? '■ Stop recording'
              : '● Record take'}
        </button>
        <button
          type="button"
          aria-pressed={loopEnabled}
          onClick={toggleLoop}
          className="rounded-full px-5 py-3 text-sm"
          style={{
            border: `1px solid ${loopEnabled ? ACCENT : 'var(--color-border)'}`,
            color: loopEnabled ? ACCENT : 'var(--color-text-dim)',
          }}
        >
          ⟳ Loop {loopEnabled ? 'on' : 'off'}
        </button>
        <label className="flex items-center gap-3 text-sm">
          <span style={{ color: 'var(--color-text-dim)' }}>Tempo</span>
          <input
            type="range"
            min={TEMPO_MIN}
            max={TEMPO_MAX}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="Tempo"
          />
          <span className="w-16 tabular-nums">{Math.round(bpm)} BPM</span>
        </label>
      </div>

      <p className="text-sm" style={{ color: 'var(--color-text-dim)' }}>
        {takeNotes > 0 && !isRecording
          ? `Your take is on the ${openTrackLabel} track. Open the full Studio to hear or edit it.`
          : `Play along on your MIDI keyboard; the ${session.openTrack === 'melody' ? 'scale notes are lit on the keyboard' : 'chords are above'}.`}
      </p>
    </>
  );

  // The keyboard, with the scale named over its middle octave.
  const keyboard = (
    <>
      <div ref={keyboardRef} className="w-full">
        {/* Two rows, as the keys are: black-key names sit a row higher so
        a sharp or flat never crowds the white key beside it. */}
        {session.openTrack === 'melody' && (
          <div
            className="relative h-12 w-full"
            aria-label={`Scale notes: ${scaleNames.join(' ')}`}
          >
            {scaleLabels.map(({ midi, name }, i) => {
              const x = keyCenters.get(midi);
              if (x === undefined) return null;
              const black = BLACK_KEYS.has(midi % 12);
              return (
                <span
                  key={midi}
                  className={`absolute -translate-x-1/2 text-base ${black ? 'top-0' : 'bottom-0.5'} ${i === 0 ? 'font-bold' : 'font-medium'}`}
                  style={{ left: x, color: ACCENT }}
                >
                  {name}
                </span>
              );
            })}
          </div>
        )}
        {/* The keyboard's larger layout: keys and octaves at twice the
        default size, as it is the main thing on this screen. That layout
        leaves out the octave labels, so they are drawn over it here, at the
        foot of each C as the default keyboard writes them. */}
        <div className="relative" data-practice-keyboard>
          <PianoKeyboard
            gaming
            className="mx-auto"
            startC={KEYBOARD_START_C}
            endC={KEYBOARD_END_C}
            hintNotes={scaleKeys}
            playingNotes={playedKeys}
          />
          {octaveCs.map((midi) => {
            const x = keyCenters.get(midi);
            if (x === undefined) return null;
            return (
              <span
                key={midi}
                className="pointer-events-none absolute bottom-1.5 -translate-x-1/2 text-[11px] font-medium text-black/70"
                style={{ left: x }}
              >
                C{Math.floor(midi / 12) - 1}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-8"
      style={{ color: 'var(--color-text)' }}
      data-testid="practice-track-view"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={backToLesson}
          className="rounded-full px-4 py-1.5 text-sm transition-colors hover:bg-white/5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          &larr; Back to lesson
        </button>
        <h1
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {displayAccidentals(projectName)}
        </h1>
        <button
          type="button"
          onClick={() => setCurrentView('arrange')}
          className="rounded-full px-4 py-1.5 text-sm transition-colors hover:bg-white/5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          Open in full Studio &rarr;
        </button>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">{task}</h2>
        </div>

        {/* The task decides what leads: improvising with a scale puts the
            keyboard first and the chords underneath as a small reference;
            playing the chords keeps the chart large and first. */}
        {chartLarge ? (
          <>
            {chordChart}
            {transport}
            {keyboard}
          </>
        ) : (
          <>
            {keyboard}
            {transport}
            {chordChart}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The tonic whose scale sits most central on the keyboard: its octave is
 * centred on middle C's, so E minor runs E4–D5 and G major G3–F♯4.
 */
function middleTonic(rootPc: number): number {
  const lowest = 54; // F♯3: tonics from here to F4 keep the scale mid-keyboard
  return lowest + ((((rootPc - 6) % 12) + 12) % 12);
}

// PianoKeyboard draws each octave as 12 children in pitch order; a black key
// sits inside a zero-width container, so its own element is the child's child.
const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

/**
 * The horizontal centre of every key under `ref`, by MIDI note, relative to
 * `ref` — measured from the rendered keyboard and kept current on resize.
 */
function useKeyCenters(
  ref: RefObject<HTMLDivElement>,
  startC: number,
): Map<number, number> {
  const [centers, setCenters] = useState<Map<number, number>>(new Map());
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const measure = () => {
      const origin = host.getBoundingClientRect().left;
      // PianoKeyboard's root, then the board holding one wrapper per octave.
      const board = host.querySelector('[data-practice-keyboard] > div > div');
      const next = new Map<number, number>();
      [...(board?.children ?? [])].forEach((wrapper, octave) => {
        const keys = wrapper.firstElementChild?.children;
        if (!keys || keys.length !== 12) return;
        [...keys].forEach((key, pc) => {
          const el = BLACK_KEYS.has(pc) ? key.firstElementChild : key;
          if (!el) return;
          const r = el.getBoundingClientRect();
          next.set((startC + octave) * 12 + pc, r.left + r.width / 2 - origin);
        });
      });
      setCenters(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [ref, startC]);
  return centers;
}
