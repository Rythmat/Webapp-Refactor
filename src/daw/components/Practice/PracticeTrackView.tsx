import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ALL_MODES, DEGREES, MODE_DISPLAY, noteNameInKey } from '@prism/engine';
import { LearnRoutes } from '@/constants/routes';
import { keyName } from '@/daw/components/Library/chordInKey';
import { useStore } from '@/daw/store';
import type { PracticeSession } from '@/daw/store/uiSlice';
import {
  displayAccidentals,
  displayDegree,
} from '@/daw/utils/displayAccidentals';
import { getScaleLesson, spellScaleLesson } from '@/lib/learn/scaleLessons';
import { practiceMelodyTonic } from '@/features/practiceTracks/generatePracticeTrack';
import { ChordChart } from './ChordChart';
import { ScaleKeyboard, type KeyboardScale } from './ScaleKeyboard';

/**
 * The screen a Practice Track opens on: one job — play over this — with the
 * chart, a big Play, Record, loop and tempo, and the scale lit on a keyboard.
 * It drives the same project and transport as the full Studio, so taking it to
 * the Studio is only a change of view.
 *
 * Serves both kinds of Practice Track. A Theory one carries a mode and a key and
 * derives its scale from them; a genre one arrives from an activity flow with
 * its scales, prompts and keyboard already worked out, because its backing was
 * generated once and cannot be re-derived. What the screen does with either is
 * the same, so the two differ only in where the answers come from.
 */
interface PracticeTrackViewProps {
  session: PracticeSession;
  isReady: boolean;
  onInit: () => void;
}

const ACCENT = '#7ecfcf';
const TEMPO_MIN = 50;
const TEMPO_MAX = 160;
/** A Theory Practice Track always shows C3–B5; a genre one is sized to its part. */
const THEORY_KEYBOARD = { startC: 4, endC: 6 };
const BAR_TICKS = 1920;

export function PracticeTrackView({
  session,
  isReady,
  onInit,
}: PracticeTrackViewProps) {
  const navigate = useNavigate();
  /** The screen's scroll box, so the keyboard can size itself to what's left. */
  const rootRef = useRef<HTMLDivElement>(null);
  /** The chart: the last thing that has to stay on screen with the keyboard. */
  const chartRef = useRef<HTMLDivElement>(null);
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

  const genre = session.kind === 'genre' ? session : null;
  const theory = session.kind === 'theory' ? session : null;
  const tonic = displayAccidentals(noteNameInKey(rootNote, rootNote, mode));

  // ── What the screen shows, from whichever kind of session this is ──────────

  /**
   * The scales on the switcher. A genre level brings every scale it teaches; a
   * Theory lesson has exactly one, which is why its switcher renders as a label.
   */
  const scales = useMemo<KeyboardScale[]>(() => {
    if (theory === null) return genre?.scales ?? [];
    // A pentatonic or blues track keeps its parent mode in the store (for chord
    // colours and spelling); the notes to play are the scale's own.
    const lesson = getScaleLesson(theory.mode);
    const intervals = lesson?.steps ?? ALL_MODES[mode] ?? ALL_MODES.ionian;
    return [
      {
        id: theory.mode,
        title: lesson?.title ?? MODE_DISPLAY[mode] ?? mode,
        intervals,
        degrees: intervals.map((step) =>
          displayDegree(DEGREES[step] ?? String(step)),
        ),
        names: lesson
          ? spellScaleLesson(lesson, tonic)
          : intervals.map((step) =>
              displayAccidentals(
                noteNameInKey((rootNote + step) % 12, rootNote, mode),
              ),
            ),
      },
    ];
  }, [genre, theory, mode, rootNote, tonic]);

  const [activeScaleId, setActiveScaleId] = useState(scales[0]?.id ?? '');
  useEffect(() => setActiveScaleId(scales[0]?.id ?? ''), [scales]);
  const activeScale = scales.find((s) => s.id === activeScaleId) ?? scales[0];

  const keyboard = genre?.keyboard ?? THEORY_KEYBOARD;
  const scaleTonic = genre?.scaleTonic ?? practiceMelodyTonic(rootNote);
  const keyLabel = genre?.keyLabel ?? tonic;

  /** The part the student plays, as the screen talks about it. */
  const playsMelody = genre
    ? genre.studentParts.includes('melody')
    : theory?.openTrack === 'melody';
  const twoHands = (genre?.studentParts.length ?? 1) > 1;

  const task = useMemo(() => {
    if (!genre) {
      return playsMelody
        ? `Improvise melodies using the ${activeScale ? `${keyLabel} ${activeScale.title}` : keyName(tonic, mode)} scale`
        : 'Play these chords over the track';
    }
    if (twoHands) return 'Play the full part over bass and drums';
    switch (genre.studentParts[0]) {
      case 'melody':
        return `Improvise melodies using the ${keyLabel} ${activeScale?.title ?? ''} scale`;
      case 'chords':
        return 'Play the chords over bass and drums';
      default:
        return 'Play bass lines over the chords and drums';
    }
  }, [genre, playsMelody, twoHands, activeScale, keyLabel, tonic, mode]);

  /**
   * One turn of the progression. A genre loop is sixteen bars of a shorter
   * cycle, so the chart is cut to the cycle and the playhead wraps inside it.
   */
  const cycleRegions = useMemo(
    () =>
      genre
        ? chordRegions.slice(0, Math.max(1, genre.chordCycle.length))
        : chordRegions,
    [chordRegions, genre],
  );
  const cycleTicks = cycleRegions.length * BAR_TICKS;

  // Playing the chords makes the chart the thing to read, so its boxes are big;
  // improvising makes it context, and it sits small under the keyboard. Either
  // way it is below the transport — the keyboard's place on this screen never
  // moves, because the keys are what a player always has to be able to see.
  const chartLarge = genre ? !playsMelody || twoHands : !playsMelody;

  const takeNotes = (openTrack?.midiClips ?? []).reduce(
    (count, clip) => count + clip.events.length,
    0,
  );
  const openTrackLabel = openTrack?.name ?? (playsMelody ? 'Melody' : 'Chords');

  // ── Transport ─────────────────────────────────────────────────────────────

  const withInit = useCallback(
    (action: () => void) => {
      if (!isReady) onInit();
      action();
    },
    [isReady, onInit],
  );

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
      session.kind === 'genre'
        ? session.returnTo
        : LearnRoutes.lesson({
            mode: session.mode,
            key: session.rootParam,
          }),
    );
  };

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
          ? `Your take is on the ${openTrackLabel} track. Take it to the Studio to hear or edit it.`
          : `Play along on your MIDI keyboard; the ${playsMelody ? 'scale notes are lit on the keyboard' : 'chords are above'}.`}
      </p>
    </>
  );

  const keyboardPanel = activeScale ? (
    <ScaleKeyboard
      scales={scales}
      activeId={activeScale.id}
      scaleTonic={scaleTonic}
      startC={keyboard.startC}
      endC={keyboard.endC}
      heldNotes={hwActiveNotes}
      fitWithin={rootRef}
      fitAnchor={chartRef}
      onScaleChange={(next) => setActiveScaleId(next.id)}
    />
  ) : null;

  const chart = (
    <div ref={chartRef} className="flex w-full justify-center">
      <ChordChart
        regions={cycleRegions}
        cycleTicks={cycleTicks}
        position={position}
        isPlaying={isPlaying}
        large={chartLarge}
        keyRootPc={rootNote}
        mode={mode}
      />
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="flex flex-1 flex-col overflow-y-auto px-4 py-3 sm:px-8 sm:py-4"
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
          className="rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
          style={{ background: ACCENT, color: '#191919' }}
        >
          Take it to the Studio &rarr;
        </button>
      </header>

      <div className="mx-auto mt-4 flex w-full max-w-4xl flex-col items-center gap-4 sm:mt-6 sm:gap-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold sm:text-2xl md:text-3xl">
            {task}
          </h2>
          {genre ? (
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {genre.genreLabel} Level {genre.level} · {genre.sectionName}
            </p>
          ) : null}
        </div>

        {/* The keyboard sizes itself to whatever height is left once everything
            else has taken its own, so the chart is never pushed off a short
            screen. See useFitScale. */}
        {keyboardPanel}
        {transport}
        {chart}

        {genre ? <PromptList prompts={genre.prompts} /> : null}
      </div>
    </div>
  );
}

/**
 * Things to try. A Practice Track's one instruction is "play over this", which
 * is freedom and, for a student who has only played written notes, paralysis.
 * The section's own direction leads; the rest are small enough to try at once.
 */
function PromptList({ prompts }: { prompts: string[] }) {
  if (prompts.length === 0) return null;
  const [lead, ...rest] = prompts;
  return (
    <section
      className="w-full rounded-2xl px-5 py-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Things to try
      </h3>
      <p className="mt-2 text-sm">{lead}</p>
      {rest.length > 0 && (
        <ul
          className="mt-3 flex flex-col gap-1.5 text-sm"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {rest.map((prompt) => (
            <li key={prompt} className="flex gap-2">
              <span aria-hidden style={{ color: ACCENT }}>
                ·
              </span>
              <span>{prompt}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
