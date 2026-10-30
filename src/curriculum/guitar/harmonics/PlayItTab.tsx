import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { audioEngine } from '@/audio/AudioEngine';
import { FixedDigits } from '@/components/common/FixedDigits';
import { cn } from '@/components/utilities';
import {
  loadGuitarVoice,
  strumGuitarChord,
} from '@/learn/audio/guitar/guitarVoice';
import {
  LearnInputProvider,
  useLearnInputContext,
} from '@/learn/context/LearnInputContext';
import { shapeNotes } from '@/lib/guitar/fretboard';
import {
  describeNodeFret,
  formatCents,
  harmonicNodes,
  midiToHz,
  partialInfo,
  pitchOf,
} from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { HarmonicNeck, nodeId, type NodeMark } from './HarmonicNeck';
import { openMidiOf, StringPicker, stringLetter } from './HarmonicsControls';
import {
  centsBetween,
  checkReducer,
  initialCheck,
  MATCH_CENTS,
  PLAY_TARGETS,
  targetPartial,
  TUNE_CENTS,
  type Feedback,
} from './harmonicCheck';
import { noteName } from './spelling';
import { useHarmonicPitch } from './useHarmonicPitch';

// ── Play it ────────────────────────────────────────────────────────────────
// The student plays the harmonics on their own guitar and the microphone
// checks each one (harmonicCheck). Input goes through Learn's guitar input
// (its setup, device and level), read from its clean tuner tap.

const GuitarInputSetup = lazy(() =>
  import('@/learn/components/guitar/GuitarInputSetup').then((m) => ({
    default: m.GuitarInputSetup,
  })),
);

/** How long "Hear it" rings: the mic ignores it meanwhile. */
const HEAR_MUTE_MS = 3400;

export interface PlayItTabProps {
  string: GuitarStringNumber;
  onStringChange: (string: GuitarStringNumber) => void;
  keyColor: string;
  mirrored: boolean;
  labels: 'fret' | 'ratio';
  onHear: (hz: number) => void;
  /** All five rang on this string (none skipped). */
  onDone?: () => void;
}

export default function PlayItTab(props: PlayItTabProps) {
  return (
    <LearnInputProvider instrument="guitar" detectionMode="polyphonic">
      <PlayIt {...props} />
    </LearnInputProvider>
  );
}

function outputLatencySecNow(): number {
  const context = audioEngine.context;
  return (context.outputLatency ?? 0) + (context.baseLatency ?? 0);
}

function PlayIt({
  string,
  onStringChange,
  keyColor,
  mirrored,
  labels,
  onHear,
  onDone,
}: PlayItTabProps) {
  const input = useLearnInputContext();
  const guitar = input.guitar;
  const openMidi = openMidiOf(string);
  const letter = stringLetter(string);
  const [state, dispatch] = useReducer(checkReducer, openMidi, initialCheck);
  const [setupOpen, setSetupOpen] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const mutedUntil = useRef(0);

  // A new string starts over.
  useEffect(() => {
    dispatch({ type: 'restart', openMidi });
  }, [openMidi]);

  const listening = guitar?.status === 'listening';
  useEffect(() => {
    if (!guitar || !listening) {
      setAnalyser(null);
      return;
    }
    // Only the tuner tap: no note or chord scoring here.
    guitar.setEvaluationMode('off');
    setAnalyser(guitar.getTunerAnalyser());
  }, [guitar, listening]);

  const { hz } = useHarmonicPitch(analyser, {
    onReading: (value, t) => {
      if (performance.now() < mutedUntil.current) return;
      dispatch({ type: 'reading', hz: value, t });
    },
    onSilence: () => dispatch({ type: 'silence' }),
  });

  const done = state.phase === 'done';
  // Every one rang (none skipped).
  const allRang = state.passed.length === PLAY_TARGETS.length;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (allRang) onDoneRef.current?.();
  }, [allRang]);

  const target = targetPartial(state);
  const targetNode = target ? harmonicNodes(target)[0] : null;
  const expectedHz =
    state.phase === 'tune'
      ? midiToHz(openMidi)
      : target
        ? target * state.f0
        : null;

  const hear = useCallback(() => {
    if (!target) return;
    mutedUntil.current = performance.now() + HEAR_MUTE_MS;
    onHear(target * state.f0);
  }, [onHear, target, state.f0]);

  const marks = useMemo(() => {
    const map = new Map<string, NodeMark>();
    for (const n of state.passed)
      map.set(nodeId(harmonicNodes(n)[0]), 'passed');
    if (targetNode) map.set(nodeId(targetNode), 'target');
    return map;
  }, [state.passed, targetNode]);

  const start = () => {
    if (!guitar) return;
    if (guitar.status === 'needs-setup' || guitar.prefs.source !== 'audio') {
      setSetupOpen(true);
    } else void guitar.enable();
  };

  const playTestChord = useCallback(async () => {
    await loadGuitarVoice();
    const notes = shapeNotes('X-3-2-0-1-0'); // open C
    strumGuitarChord(
      notes.map((n) => n.midi),
      1.5,
      90,
      undefined,
      notes.map((n) => n.position),
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }, []);

  return (
    <div data-harmonics-tab="play" className="flex flex-col gap-4">
      <StringPicker value={string} onChange={onStringChange} />

      {!listening ? (
        <InputGate
          status={guitar?.status ?? 'error'}
          midi={guitar?.prefs.source === 'midi'}
          error={guitar?.error ?? null}
          onStart={start}
          onSetup={() => setSetupOpen(true)}
        />
      ) : (
        <>
          <section
            data-play-step={state.phase}
            className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5"
          >
            <Progress
              passed={state.passed}
              target={target}
              tuned={state.phase !== 'tune'}
              keyColor={keyColor}
            />
            <h2 className="text-xl leading-7 text-[#e8e8f0]">
              {state.phase === 'tune'
                ? `Pluck the open ${letter} string`
                : done
                  ? allRang
                    ? `All five harmonics rang on the ${letter} string`
                    : `${state.passed.length} of ${PLAY_TARGETS.length} rang on the ${letter} string`
                  : `${describeNodeFret(targetNode!.fret)}: partial ${target}`}
            </h2>
            <p className="text-sm leading-5 text-white/55">
              {state.phase === 'tune'
                ? 'Let it ring. Its pitch becomes the reference, so a guitar a little out of tune still works.'
                : done
                  ? allRang
                    ? 'Try another string, or play them again.'
                    : 'Start again to try the ones you skipped.'
                  : `Rest a finger on the ${letter} string right over the fret wire (don't press it down), pluck near the bridge, then lift the finger. It should sound ${noteName(partialInfo(openMidi, target!).nearestMidi, openMidi)}.`}
            </p>
            {!done && (
              <CentsMeter
                hz={hz}
                expectedHz={expectedHz}
                openMidi={openMidi}
                keyColor={keyColor}
                range={(state.phase === 'tune' ? TUNE_CENTS : MATCH_CENTS) * 2}
              />
            )}
            <FeedbackLine feedback={state.feedback} letter={letter} />
            <div className="flex flex-wrap gap-2">
              {state.phase === 'tune' && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'skipTuning' })}
                  className={GHOST}
                >
                  Skip: use standard tuning
                </button>
              )}
              {state.phase === 'play' && (
                <>
                  <button type="button" onClick={hear} className={PRIMARY}>
                    Hear it
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'skip' })}
                    className={GHOST}
                  >
                    Skip
                  </button>
                </>
              )}
              {(done || state.passed.length > 0) && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'restart', openMidi })}
                  className={GHOST}
                >
                  Start again
                </button>
              )}
            </div>
          </section>
          <div
            className="-mx-1 overflow-x-auto px-1 pb-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            <HarmonicNeck
              string={string}
              partials={PLAY_TARGETS}
              marks={marks}
              keyColor={keyColor}
              mirrored={mirrored}
              showBody={false}
              labels={labels}
              describeNode={(node) =>
                `Partial ${node.partial}: ${describeNodeFret(node.fret)}`
              }
            />
          </div>
        </>
      )}

      {guitar && setupOpen && (
        <Suspense fallback={null}>
          <GuitarInputSetup
            open
            initialStep="source"
            onClose={() => setSetupOpen(false)}
            handle={guitar}
            subscribeNoteOn={input.subscribeNoteOn}
            subscribeChord={input.subscribeChord}
            onPlayTestChord={playTestChord}
            outputLatencySec={outputLatencySecNow()}
          />
        </Suspense>
      )}
    </div>
  );
}

const PRIMARY =
  'inline-flex h-9 items-center rounded-full bg-white px-4 text-sm text-[#101012] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60';
const GHOST =
  'inline-flex h-9 items-center rounded-full border border-white/10 px-4 text-sm text-white/80 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40';

function InputGate({
  status,
  midi,
  error,
  onStart,
  onSetup,
}: {
  status: string;
  midi: boolean;
  error: string | null;
  onStart: () => void;
  onSetup: () => void;
}) {
  const failed =
    status === 'denied' || status === 'no-device' || status === 'error';
  const text = midi
    ? 'Play it listens to the strings through a microphone or audio interface; a MIDI guitar can’t send harmonics. Switch the input to audio to try it.'
    : status === 'requesting-permission'
      ? 'Allow the microphone to start.'
      : status === 'denied'
        ? 'The microphone is blocked. Allow it for this site in the browser, then try again.'
        : status === 'no-device'
          ? 'No microphone or audio interface was found.'
          : failed
            ? (error ?? 'The guitar input could not start.')
            : 'Play each harmonic on your guitar and the microphone checks it: the 12th, 7th, 5th, 4th and 3rd fret harmonics, in turn.';
  return (
    <section
      data-input-gate={status}
      className="flex flex-col items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5"
    >
      <p className="text-sm leading-5 text-[#e8e8f0]">{text}</p>
      <div className="flex flex-wrap gap-2">
        {!midi && !failed && status !== 'requesting-permission' && (
          <button type="button" onClick={onStart} className={PRIMARY}>
            {status === 'needs-setup'
              ? 'Set up guitar input'
              : 'Start listening'}
          </button>
        )}
        {(midi || failed) && (
          <button type="button" onClick={onSetup} className={PRIMARY}>
            Set up guitar input
          </button>
        )}
      </div>
    </section>
  );
}

function Progress({
  passed,
  target,
  tuned,
  keyColor,
}: {
  passed: readonly number[];
  target: number | null;
  tuned: boolean;
  keyColor: string;
}) {
  return (
    <ol aria-label="Progress" className="flex flex-wrap items-center gap-1.5">
      <li
        data-progress="tune"
        className={cn(
          'inline-flex h-7 items-center rounded-full border px-2.5 text-xs',
          tuned
            ? 'border-white/20 bg-white/10 text-white'
            : 'border-white/10 text-white/55',
        )}
        style={!tuned ? { borderColor: keyColor, color: '#fff' } : undefined}
      >
        {tuned ? '✓ ' : ''}Open string
      </li>
      {PLAY_TARGETS.map((n) => {
        const node = harmonicNodes(n)[0];
        const r = Math.round(node.fret);
        const label =
          Math.abs(node.fret - r) < 0.1 ? `${r}` : `≈${node.fret.toFixed(1)}`;
        const isPassed = passed.includes(n);
        const current = target === n;
        return (
          <li
            key={n}
            data-progress={n}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'inline-flex h-7 items-center rounded-full border px-2.5 text-xs',
              isPassed
                ? 'border-white/20 bg-white/10 text-white'
                : 'border-white/10 text-white/55',
            )}
            style={
              current ? { borderColor: keyColor, color: '#fff' } : undefined
            }
          >
            {isPassed ? '✓ ' : ''}Fret {label}
          </li>
        );
      })}
    </ol>
  );
}

/** Where the heard pitch is against the one wanted, ± a range in cents. */
function CentsMeter({
  hz,
  expectedHz,
  openMidi,
  keyColor,
  range,
}: {
  hz: number | null;
  expectedHz: number | null;
  openMidi: number;
  keyColor: string;
  range: number;
}) {
  const cents = hz && expectedHz ? centsBetween(hz, expectedHz) : null;
  const near = cents != null && Math.abs(cents) <= range * 2;
  const inside = cents != null && Math.abs(cents) <= range / 2;
  const at = near ? Math.max(-1, Math.min(1, cents! / range)) : null;
  const heard = hz ? pitchOf(hz) : null;
  return (
    <div data-cents-meter className="flex flex-col gap-1.5">
      <div className="relative h-8 rounded-full bg-white/[0.04]">
        {/* The window that counts. */}
        <div
          aria-hidden
          className="absolute inset-y-1 left-1/4 right-1/4 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="absolute inset-y-1 left-1/2 w-px bg-white/30"
        />
        {at != null && (
          <div
            aria-hidden
            data-needle
            className="absolute top-1 h-6 w-1.5 -translate-x-1/2 rounded-full transition-[left] duration-75 motion-reduce:transition-none"
            style={{
              left: `${50 + at * 50}%`,
              backgroundColor: inside ? keyColor : '#e8e8f0',
            }}
          />
        )}
      </div>
      <p className="text-xs leading-4 text-white/55" aria-live="off">
        {heard ? (
          <>
            Hearing {noteName(heard.nearestMidi, openMidi)} ·{' '}
            <FixedDigits text={hz!.toFixed(1)} /> Hz
            {cents != null && near && (
              <>
                {' '}
                · <FixedDigits text={`${formatCents(cents)} ¢`} /> from the
                target
              </>
            )}
          </>
        ) : (
          'Listening…'
        )}
      </p>
    </div>
  );
}

function FeedbackLine({
  feedback,
  letter,
}: {
  feedback: Feedback | null;
  letter: string;
}) {
  if (!feedback) return null;
  const text = (() => {
    switch (feedback.kind) {
      case 'tuned':
        return `Got it: your ${letter} string is ${formatCents(feedback.cents)} ¢ from standard.`;
      case 'outOfTune':
        return `That’s ${formatCents(feedback.cents, 0)} ¢ from ${letter}. Tune the string, or skip and use standard tuning.`;
      case 'match':
        return `Partial ${feedback.partial} rang. ✓`;
      case 'pressed':
        return `That’s the fretted note at fret ${feedback.fret}. Touch the string lightly, without pressing it to the fret.`;
      case 'otherPartial':
        return `That’s partial ${feedback.heard}. Move the finger to the node for partial ${feedback.partial}.`;
      case 'open':
        return 'That’s the open string: keep the finger resting on the string as you pluck, then lift it.';
    }
  })();
  return (
    <p
      data-feedback={feedback.kind}
      role="status"
      className="text-sm leading-5 text-[#e8e8f0]"
    >
      {text}
    </p>
  );
}
