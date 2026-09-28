// ── GuitarInputSetup ───────────────────────────────────────────────────────
// Guitar input setup, one short step at a time: how the guitar comes in, the
// microphone (explained before the browser asks), level and room noise, a
// tuner, low- and high-string checks, an E minor strum, a speaker-echo test
// and an optional strum-along timing check. Every step can be skipped: the
// checks earn trust in the listening, they never block a lesson.
//
// The flow lives under the dialog content, which unmounts on close, so each
// opening starts fresh and leaves the input's detector off.

import {
  Check,
  Headphones,
  LoaderCircle,
  Mic,
  Minus,
  Plug,
  Plus,
  TriangleAlert,
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Tone from 'tone';
import { startTone } from '@/audio/core/toneBridge';
import { ChordBox } from '@/components/guitar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getAudioInputs,
  probeDeviceChannelCount,
  type AudioInputDevice,
} from '@/daw/midi/AudioInputEnumerator';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import {
  chordIdentityScore,
  IDENTITY_MATCH,
  pitchClassName,
} from '@/learn/audio/guitar/chordIdentity';
import type {
  GuitarChordEvent,
  GuitarEvaluationMode,
  GuitarInputHandle,
  GuitarInputSource,
} from '@/learn/audio/guitar/types';
import { playClick } from '@/learn/audio/metronomeClick';
import type { GuitarShapeDiagram } from '@/lib/guitar/types';
import { InputLevelMeter } from './GuitarInputChip';

// Kept off the lesson's load path: the tuner reaches the Studio store.
const TunerDisplay = lazy(() =>
  import('@/daw/components/Controls/TunerDisplay').then((m) => ({
    default: m.TunerDisplay,
  })),
);

// ── Steps ────────────────────────────────────────────────────────────────

export type GuitarSetupStep =
  | 'source'
  | 'mic'
  | 'level'
  | 'quiet'
  | 'tuner'
  | 'strings'
  | 'chord'
  | 'bleed'
  | 'timing'
  | 'midi-check'
  | 'done';

const STEPS: Record<GuitarInputSource, GuitarSetupStep[]> = {
  audio: [
    'source',
    'mic',
    'level',
    'quiet',
    'tuner',
    'strings',
    'chord',
    'bleed',
    'timing',
    'done',
  ],
  midi: ['source', 'midi-check', 'done'],
};

const STEP_TITLES: Record<GuitarSetupStep, string> = {
  source: 'How does your guitar connect?',
  mic: 'Turn the microphone on',
  level: 'Check the level',
  quiet: 'Measure the room',
  tuner: 'Tune up',
  strings: 'Check the low and high strings',
  chord: 'Strum a chord',
  bleed: 'Check for echo',
  timing: 'Check your timing',
  'midi-check': 'Play a note',
  done: 'All set',
};

/** Steps passed over while the microphone is off. */
const NEEDS_MIC = new Set<GuitarSetupStep>([
  'level',
  'quiet',
  'tuner',
  'strings',
  'chord',
  'bleed',
  'timing',
]);

/** Steps with nothing to pass: Next, never Skip. */
const INFO_STEPS = new Set<GuitarSetupStep>(['source', 'level', 'tuner']);

/** The detector each step listens with; input events flow only in checks. */
function evaluationModeFor(step: GuitarSetupStep): GuitarEvaluationMode {
  if (step === 'strings' || step === 'midi-check') return 'notes';
  if (step === 'chord' || step === 'bleed' || step === 'timing') {
    return 'chords';
  }
  return 'off';
}

// ── Checks ───────────────────────────────────────────────────────────────

/** Open low E (E2) and high e (E4) in standard tuning. */
const LOW_E = 40;
const HIGH_E = 64;
/** Pitch trackers often report a string an octave off, low strings most. */
const OCTAVE = 12;
/** No low E by then: show the low-string advice. */
const LOW_STRING_ADVICE_MS = 8000;

const E_MINOR = { pcs: [4, 7, 11], rootPc: 4 };
const C_MAJOR = { pcs: [0, 4, 7], rootPc: 0 };
const E_MINOR_SHAPE: GuitarShapeDiagram = {
  frets: '0-2-2-0-0-0',
  diagramStartFret: 1,
  fingering: [
    { finger: 2, string: 5, fret: 2 },
    { finger: 3, string: 4, fret: 2 },
  ],
};
/** No key in setup, so no key colour. */
const NEUTRAL_COLOR = '#9a9aab';
/**
 * The detectors' key while checking: C major has both test chords' roots.
 * The lesson's key would favour its own chords, and in D♭, E♭ or A♭ an
 * E minor strum can lose to a diatonic Cmaj7.
 */
const CHECK_KEY = { rootPc: 0, intervals: [0, 2, 4, 5, 7, 9, 11] };

const QUIET_MS = 2000;
/** Listen on after the test chord: its identity lags the strum. */
const BLEED_TAIL_MS = 1200;

const TRIM_STEP_DB = 3;
const TRIM_MIN_DB = -12;
const TRIM_MAX_DB = 24;

const CLICKS = 8;
/** 80 BPM: slow enough to strum along, far enough apart to pair strums. */
const CLICK_MS = 750;
const CLICK_LEAD_IN_MS = 1000;
/** After the last click, time for its strum's event to arrive. */
const TIMING_TAIL_MS = 500;
/** A strum pairs with a click from this early to this late (input delay). */
const STRUM_EARLY_MS = 200;
const MAX_INPUT_LATENCY_MS = 400;
const MIN_TIMED_STRUMS = 4;
/** Output this late is Bluetooth territory: in-time scores suffer. */
const HIGH_OUTPUT_LATENCY_SEC = 0.15;

/** The low E: E2, or E1/E3 from an octave error. */
function isLowE(midi: number): boolean {
  return midi % 12 === 4 && Math.abs(midi - LOW_E) <= OCTAVE;
}

/**
 * The high e: E4, or E5 from an octave error. Not E3: that is also the low
 * string, still ringing, heard an octave up.
 */
function isHighE(midi: number): boolean {
  return midi % 12 === 4 && midi > LOW_E + OCTAVE && midi <= HIGH_E + OCTAVE;
}

/**
 * Each click paired with the first strum near it, as strum − click (ms).
 * A strum pairs once, so one late strum can't count for two clicks.
 */
function strumOffsets(clicksMs: number[], strumsMs: number[]): number[] {
  const strums = [...strumsMs].sort((a, b) => a - b);
  const offsets: number[] = [];
  let next = 0;
  for (const click of clicksMs) {
    while (next < strums.length && strums[next] < click - STRUM_EARLY_MS) {
      next++;
    }
    if (next < strums.length && strums[next] <= click + MAX_INPUT_LATENCY_MS) {
      offsets.push(strums[next] - click);
      next++;
    }
  }
  return offsets;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

/** Failures show up in the handle's status and error, not as rejections. */
function quietly(pending: Promise<unknown>): void {
  pending.catch(() => undefined);
}

/** False once the step unmounts, so late async results are dropped. */
function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

// ── Shared bits ──────────────────────────────────────────────────────────

function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/80">
      <span aria-hidden className="mt-0.5 shrink-0">
        {icon}
      </span>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Passed({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-white">
      <Check aria-hidden className="size-4 shrink-0" />
      {children}
    </p>
  );
}

/**
 * Where a check's result appears. Kept mounted, so screen readers announce
 * each result as it arrives (WCAG 4.1.3), not only show it. "Keep quiet"
 * cues stay outside: speech then would be heard by the mic being measured.
 */
function Status({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      {children}
    </div>
  );
}

function Busy({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-white/80">
      <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin" />
      {children}
    </p>
  );
}

function LateOutputWarning() {
  return (
    <Note icon={<Headphones className="size-4" />}>
      <span>Your sound arrives late. Bluetooth often does this.</span>
      <span>Use wired headphones if you can.</span>
      <span>
        Timing scores in "Keep time" steps may be off. "Wait for me" steps don't
        score timing.
      </span>
    </Note>
  );
}

function MicOffNotice({ onTurnOn }: { onTurnOn: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 text-sm text-white/80">
      <p>This check needs the microphone. It is off.</p>
      <Button size="sm" onClick={onTurnOn}>
        Turn microphone on
      </Button>
    </div>
  );
}

// ── a) Source ────────────────────────────────────────────────────────────

const SOURCES = [
  {
    id: 'audio',
    label: 'Microphone or audio interface',
    hint: "Your device's mic, a USB mic, or an interface.",
    Icon: Mic,
  },
  {
    id: 'midi',
    label: 'MIDI guitar',
    hint: 'A guitar or pickup that sends MIDI.',
    Icon: Plug,
  },
] as const;

function SourceStep({
  source,
  onChange,
}: {
  source: GuitarInputSource;
  onChange: (source: GuitarInputSource) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Guitar input</legend>
        {SOURCES.map(({ id, label, hint, Icon }) => (
          <label
            key={id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
              source === id ? 'border-white/60 bg-white/10' : 'border-white/10'
            }`}
          >
            <input
              type="radio"
              name="guitar-input-source"
              value={id}
              checked={source === id}
              onChange={() => onChange(id)}
              className="accent-white"
            />
            <Icon aria-hidden className="size-5 shrink-0" />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-white/60">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {source === 'audio' && (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-white/70">
          <li>
            Acoustic guitar: put the device 30 to 60 cm (1 to 2 feet) away. Prop
            it up so the mic faces the guitar.
          </li>
          <li>
            Electric guitar: play through a clean amp at talking volume. Or plug
            into an audio interface.
          </li>
          <li>Wear headphones whenever a backing track plays.</li>
        </ul>
      )}
    </div>
  );
}

// ── b) Microphone ────────────────────────────────────────────────────────

const BROWSER_HELP = [
  {
    id: 'chrome',
    name: 'Chrome or Edge',
    how: 'Click the icon left of the web address. Switch Microphone on. Reload the page.',
  },
  {
    id: 'safari',
    name: 'Safari on a Mac',
    how: 'Open the Safari menu, then Settings for this website. Set Microphone to Allow. Reload the page.',
  },
  {
    id: 'chromebook',
    name: 'Chromebook',
    how: 'Click the icon left of the web address. Switch Microphone on. In Settings, open Security and privacy and check that microphone access is on.',
  },
  {
    id: 'ipad',
    name: 'iPad',
    how: 'Tap the page menu (aA) in the address bar, then Website Settings. Set Microphone to Allow. Reload the page.',
  },
] as const;

/** Which browser's help to open first. */
function detectBrowser(): (typeof BROWSER_HELP)[number]['id'] {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch gives it away.
  if (
    /iPad/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  ) {
    return 'ipad';
  }
  if (/CrOS/.test(ua)) return 'chromebook';
  if (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg/.test(ua)) {
    return 'safari';
  }
  return 'chrome';
}

function DeniedHelp({
  onRetry,
  onUseMidi,
}: {
  onRetry: () => void;
  onUseMidi: () => void;
}) {
  const [browser] = useState(detectBrowser);
  return (
    <div className="flex flex-col gap-3 text-sm text-white/80">
      <Note icon={<TriangleAlert className="size-4" />}>
        <span className="font-medium text-white">
          The microphone is blocked.
        </span>
        <span>
          Your browser is not letting this site use it. Here is how to allow it.
        </span>
      </Note>
      <div className="flex flex-col gap-1">
        {BROWSER_HELP.map(({ id, name, how }) => (
          <details
            key={id}
            open={id === browser}
            className="rounded-lg border border-white/10 px-3 py-2"
          >
            <summary className="cursor-pointer font-medium text-white">
              {name}
            </summary>
            <p className="mt-1 text-white/70">{how}</p>
          </details>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
        <Button size="sm" variant="outline" onClick={onUseMidi}>
          Use MIDI guitar instead
        </Button>
      </div>
    </div>
  );
}

function MicStep({
  handle,
  listening,
  onReady,
  onUseMidi,
}: {
  handle: GuitarInputHandle;
  listening: boolean;
  onReady: () => void;
  onUseMidi: () => void;
}) {
  const [asked, setAsked] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const { status } = handle;

  // Once the student has said yes, carry on by themselves.
  useEffect(() => {
    if (asked && status === 'listening') onReady();
  }, [asked, status]);

  const turnOn = async () => {
    setAsked(true);
    setFailure(null);
    try {
      await handle.enable();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err));
    }
  };

  const detail = handle.error || failure;
  const problem =
    status === 'no-device' ? (
      "We can't find a microphone. Plug one in, then try again."
    ) : status === 'error' || failure ? (
      <>
        <span>Something went wrong.</span>
        {detail && <span className="text-white/60">{detail}</span>}
      </>
    ) : null;
  return (
    <Status>
      {listening ? (
        <Passed>Your microphone is on.</Passed>
      ) : status === 'requesting-permission' ? (
        <Busy>Waiting for your browser. Choose Allow.</Busy>
      ) : status === 'denied' ? (
        <DeniedHelp onRetry={turnOn} onUseMidi={onUseMidi} />
      ) : (
        <div className="flex flex-col items-start gap-3 text-sm text-white/80">
          {problem ? (
            <Note icon={<TriangleAlert className="size-4" />}>{problem}</Note>
          ) : (
            <>
              <p>Next, your browser asks to use the microphone.</p>
              <p>Choose Allow. We use it only to hear your guitar.</p>
            </>
          )}
          <Button onClick={turnOn}>
            <Mic aria-hidden />
            {problem ? 'Try again' : 'Turn microphone on'}
          </Button>
        </div>
      )}
    </Status>
  );
}

// ── c) Level ─────────────────────────────────────────────────────────────

function DevicePicker({ handle }: { handle: GuitarInputHandle }) {
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [deviceId, setDeviceId] = useState(handle.prefs.deviceId);
  const [channel, setChannel] = useState(handle.prefs.channel);
  const [channelCount, setChannelCount] = useState(1);

  // Only reached with the mic on, so listing devices asks nothing.
  useEffect(() => {
    let live = true;
    getAudioInputs().then((found) => {
      // Chrome's "default" entry duplicates our Default option.
      if (live) setDevices(found.filter((d) => d.id !== 'default'));
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!deviceId) {
      setChannelCount(1);
      return;
    }
    let live = true;
    probeDeviceChannelCount(deviceId).then((count) => {
      if (live) setChannelCount(count);
    });
    return () => {
      live = false;
    };
  }, [deviceId]);

  const chooseDevice = (id: string) => {
    const next = id || null;
    setDeviceId(next);
    setChannel(0);
    quietly(handle.restart({ deviceId: next, channel: 0 }));
  };
  const chooseChannel = (next: number) => {
    setChannel(next);
    quietly(handle.restart({ channel: next }));
  };

  const selectClass =
    'rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white';
  return (
    <div className="flex flex-col gap-2 text-sm text-white/80">
      <label className="flex flex-col gap-1">
        Input device
        <select
          value={deviceId ?? ''}
          onChange={(e) => chooseDevice(e.target.value)}
          className={selectClass}
        >
          <option value="">Default microphone</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      {channelCount > 1 && (
        <label className="flex flex-col gap-1">
          Input channel
          <select
            value={channel}
            onChange={(e) => chooseChannel(Number(e.target.value))}
            className={selectClass}
          >
            {Array.from({ length: channelCount }, (_, c) => (
              <option key={c} value={c}>
                Input {c + 1}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function TrimControl({ handle }: { handle: GuitarInputHandle }) {
  const [trimDb, setTrimDb] = useState(handle.prefs.trimDb);
  const change = (deltaDb: number) => {
    const next = clamp(trimDb + deltaDb, TRIM_MIN_DB, TRIM_MAX_DB);
    setTrimDb(next);
    quietly(handle.restart({ trimDb: next }));
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
      <span>
        Boost: {trimDb > 0 ? '+' : ''}
        {trimDb} dB
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => change(-TRIM_STEP_DB)}
        disabled={trimDb <= TRIM_MIN_DB}
      >
        <Minus aria-hidden />
        Quieter
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => change(TRIM_STEP_DB)}
        disabled={trimDb >= TRIM_MAX_DB}
      >
        <Plus aria-hidden />
        Louder
      </Button>
    </div>
  );
}

function LevelStep({ handle }: { handle: GuitarInputHandle }) {
  return (
    <div className="flex flex-col gap-4">
      <DevicePicker handle={handle} />
      <div className="flex flex-col gap-2 text-sm text-white/80">
        <p>Strum a few times. The bar should reach about halfway.</p>
        <InputLevelMeter handle={handle} width={240} height={10} />
      </div>
      <TrimControl handle={handle} />
    </div>
  );
}

function QuietStep({
  handle,
  onPassed,
}: {
  handle: GuitarInputHandle;
  onPassed: () => void;
}) {
  const [state, setState] = useState<'ready' | 'measuring' | 'done' | 'failed'>(
    'ready',
  );
  const mounted = useMountedRef();

  const measure = async () => {
    setState('measuring');
    try {
      await handle.calibrateGate(QUIET_MS);
      if (!mounted.current) return;
      setState('done');
      onPassed();
    } catch {
      if (mounted.current) setState('failed');
    }
  };

  return (
    <div className="flex flex-col items-start gap-3 text-sm text-white/80">
      <p>Now we measure how quiet your room is.</p>
      <p>
        Press Start. Then stay quiet for 2 seconds. Rest a hand on the strings.
      </p>
      {state === 'measuring' && <Busy>Stay quiet…</Busy>}
      <Status>
        {state === 'done' && (
          <Passed>Done. We know how quiet your room is.</Passed>
        )}
        {state === 'failed' && (
          <Note icon={<TriangleAlert className="size-4" />}>
            We couldn't measure. Check the microphone, then try again.
          </Note>
        )}
      </Status>
      {state !== 'measuring' && (
        <Button size="sm" onClick={measure}>
          {state === 'ready' ? 'Start' : 'Measure again'}
        </Button>
      )}
    </div>
  );
}

// ── d) Tuner ─────────────────────────────────────────────────────────────

function TunerStep({ analyser }: { analyser: AnalyserNode }) {
  return (
    <div className="flex flex-col gap-3 text-sm text-white/80">
      <p>Tune first. Strings out of tune sound like wrong notes.</p>
      <p>
        Switch the tuner on. Play one string at a time. Turn its peg until the
        tuner says Perfect.
      </p>
      <Suspense fallback={<Busy>Loading the tuner…</Busy>}>
        <TunerDisplay
          deviceId={null}
          externalAnalyser={analyser}
          instrumentType="guitar"
        />
      </Suspense>
    </div>
  );
}

// ── e) Low and high strings ──────────────────────────────────────────────

type StringCheck = 'waiting' | 'heard' | 'skipped';

function StringRow({
  label,
  state,
  active,
}: {
  label: string;
  state: StringCheck;
  active: boolean;
}) {
  const status =
    state === 'heard'
      ? 'Heard it'
      : state === 'skipped'
        ? 'Skipped'
        : active
          ? 'Listening…'
          : 'Next';
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm ${
        active ? 'border-white/60' : 'border-white/10'
      }`}
    >
      <span className="text-white">{label}</span>
      <span
        role="status"
        className="flex shrink-0 items-center gap-1 text-white/70"
      >
        {state === 'heard' && <Check aria-hidden className="size-4" />}
        {status}
      </span>
    </li>
  );
}

function StringsStep({
  subscribeNoteOn,
  onPassed,
}: {
  subscribeNoteOn: GuitarInputSetupProps['subscribeNoteOn'];
  onPassed: () => void;
}) {
  const [low, setLow] = useState<StringCheck>('waiting');
  const [high, setHigh] = useState<StringCheck>('waiting');
  const [lowAdvice, setLowAdvice] = useState(false);
  const lowPending = low === 'waiting';
  const highPending = high === 'waiting';

  // Low first, then high: an E3 would otherwise pass both at once.
  useEffect(() => {
    if (!highPending) return;
    return subscribeNoteOn((event) => {
      if (event.source !== 'audio') return;
      if (lowPending) {
        if (isLowE(event.number)) setLow('heard');
      } else if (isHighE(event.number)) {
        setHigh('heard');
        onPassed();
      }
    });
  }, [subscribeNoteOn, lowPending, highPending]);

  useEffect(() => {
    if (!lowPending) return;
    const timer = setTimeout(() => setLowAdvice(true), LOW_STRING_ADVICE_MS);
    return () => clearTimeout(timer);
  }, [lowPending]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-white/80">
        Play each string on its own. Let it ring.
      </p>
      <ol className="flex flex-col gap-2">
        <StringRow
          label="Play your low E string. It is the thickest one."
          state={low}
          active={lowPending}
        />
        <StringRow
          label="Play your high e string. It is the thinnest one."
          state={high}
          active={!lowPending && highPending}
        />
      </ol>
      <Status>
        {lowAdvice && lowPending && (
          <Note icon={<TriangleAlert className="size-4" />}>
            <span className="font-medium text-white">
              We can't hear the low string yet.
            </span>
            <span>Move the device closer to the guitar.</span>
            <span>Play a little louder, or turn the amp up.</span>
            <span>An audio interface hears low strings best.</span>
            <span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLow('skipped')}
              >
                Continue anyway
              </Button>
            </span>
          </Note>
        )}
      </Status>
    </div>
  );
}

// ── f) E minor ───────────────────────────────────────────────────────────

function ChordStep({
  subscribeChord,
  onPassed,
}: {
  subscribeChord: GuitarInputSetupProps['subscribeChord'];
  onPassed: () => void;
}) {
  const [result, setResult] = useState<
    'waiting' | 'passed' | 'wrong' | 'unclear'
  >('waiting');
  const [heardPcs, setHeardPcs] = useState<number[]>([]);
  const leftHanded = useInstrumentStore((s) => s.leftHanded);
  const passed = result === 'passed';

  // Judged by the notes heard, not the name: any E G B strum is E minor.
  useEffect(() => {
    if (passed) return;
    return subscribeChord((event) => {
      if (event.source !== 'audio' || event.phase === 'off') return;
      if (event.unclear || event.pcs.length === 0) {
        setResult('unclear');
      } else if (chordIdentityScore(E_MINOR, event) === 1) {
        setResult('passed');
        onPassed();
      } else {
        setHeardPcs(event.pcs);
        setResult('wrong');
      }
    });
  }, [subscribeChord, passed]);

  return (
    <div className="flex flex-col gap-3 text-sm text-white/80">
      <div className="flex items-start gap-4">
        <ChordBox
          shape={E_MINOR_SHAPE}
          name="E minor"
          rootPc={E_MINOR.rootPc}
          keyColor={NEUTRAL_COLOR}
          size="sm"
          mirrored={leftHanded}
        />
        <div className="flex flex-col gap-2">
          <p>Strum E minor.</p>
          <p>
            Put fingers 2 and 3 on the 2nd fret of strings 5 and 4. Let all six
            strings ring.
          </p>
        </div>
      </div>
      <Status>
        {result === 'passed' && <Passed>That's E minor. Nice.</Passed>}
        {result === 'wrong' && (
          <Note icon={<TriangleAlert className="size-4" />}>
            <span>
              Not quite. We heard{' '}
              {heardPcs.map((pc) => pitchClassName(pc, 0)).join(', ')}.
            </span>
            <span>Check the shape and strum again.</span>
          </Note>
        )}
        {result === 'unclear' && (
          <Note icon={<TriangleAlert className="size-4" />}>
            We heard a strum, but not clearly. Strum again, a little harder.
          </Note>
        )}
      </Status>
    </div>
  );
}

// ── g) Speaker echo ──────────────────────────────────────────────────────

function BleedStep({
  handle,
  subscribeChord,
  onPlayTestChord,
  onPassed,
}: {
  handle: GuitarInputHandle;
  subscribeChord: GuitarInputSetupProps['subscribeChord'];
  onPlayTestChord: () => Promise<void>;
  onPassed: () => void;
}) {
  const [state, setState] = useState<
    'ready' | 'playing' | 'bleed' | 'clear' | 'failed'
  >('ready');
  const mounted = useMountedRef();

  const run = async () => {
    setState('playing');
    let heard = false;
    // Any C major the mic picks up while the app strums C is our own sound.
    const stop = subscribeChord((event) => {
      if (
        event.source === 'audio' &&
        event.phase !== 'off' &&
        chordIdentityScore(C_MAJOR, event) >= IDENTITY_MATCH
      ) {
        heard = true;
      }
    });
    try {
      await onPlayTestChord();
      await wait(BLEED_TAIL_MS);
    } catch {
      if (mounted.current) setState('failed');
      return;
    } finally {
      stop();
    }
    if (!mounted.current) return;
    quietly(handle.restart({ bleedDetected: heard }));
    setState(heard ? 'bleed' : 'clear');
    onPassed();
  };

  return (
    <div className="flex flex-col items-start gap-3 text-sm text-white/80">
      <p>We will play a chord through your speakers.</p>
      <p>Keep your strings quiet. Rest a hand on them.</p>
      {state === 'playing' && <Busy>Playing. Keep quiet…</Busy>}
      <Status>
        {state === 'clear' && (
          <Passed>The microphone did not hear the speakers.</Passed>
        )}
        {state === 'bleed' && (
          <Note icon={<Headphones className="size-4" />}>
            <span className="font-medium text-white">
              The microphone heard the app's own sound.
            </span>
            <span>
              Use headphones, or turn the speakers down. Then test again.
            </span>
          </Note>
        )}
        {state === 'failed' && (
          <Note icon={<TriangleAlert className="size-4" />}>
            We couldn't play the test chord. Try again.
          </Note>
        )}
      </Status>
      <p className="text-white/60">
        Don't use the mic on a Bluetooth headset. It sounds poor and adds delay.
      </p>
      {state !== 'playing' && (
        <Button size="sm" onClick={run}>
          {state === 'ready' ? 'Play test chord' : 'Test again'}
        </Button>
      )}
    </div>
  );
}

// ── h) Timing ────────────────────────────────────────────────────────────

function TimingStep({
  handle,
  subscribeChord,
  outputLatencySec,
  onPassed,
}: {
  handle: GuitarInputHandle;
  subscribeChord: GuitarInputSetupProps['subscribeChord'];
  outputLatencySec: number;
  onPassed: () => void;
}) {
  const [state, setState] = useState<
    'ready' | 'running' | 'done' | 'too-few' | 'failed'
  >('ready');
  const [beat, setBeat] = useState(0);
  const [heardStrums, setHeardStrums] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const mounted = useMountedRef();

  const run = async () => {
    setState('running');
    setBeat(0);
    // Events come with the saved delay taken off; put it back, so the check
    // measures the whole delay and a wrong saved value can't pair nothing.
    const savedMs = handle.prefs.inputLatencyMs;
    const clicks: number[] = [];
    const strums: number[] = [];
    const stop = subscribeChord((event) => {
      if (event.source === 'audio' && event.phase === 'on') {
        strums.push(event.onsetPerfMs + savedMs);
      }
    });
    try {
      await startTone();
      // A click is heard Tone's lookAhead plus the output delay after it's sent.
      const heardLagMs =
        (Tone.getContext().lookAhead + outputLatencySec) * 1000;
      const start = performance.now() + CLICK_LEAD_IN_MS;
      for (let i = 0; i < CLICKS; i++) {
        await wait(start + i * CLICK_MS - performance.now());
        if (!mounted.current) return;
        clicks.push(performance.now() + heardLagMs);
        playClick(i % 4 === 0);
        setBeat(i + 1);
      }
      await wait(CLICK_MS + TIMING_TAIL_MS);
    } catch {
      if (mounted.current) setState('failed');
      return;
    } finally {
      stop();
    }
    if (!mounted.current) return;

    const offsets = strumOffsets(clicks, strums);
    if (offsets.length < MIN_TIMED_STRUMS) {
      setHeardStrums(offsets.length);
      setState('too-few');
      return;
    }
    const next = Math.round(clamp(median(offsets), 0, MAX_INPUT_LATENCY_MS));
    quietly(handle.restart({ inputLatencyMs: next }));
    setLatencyMs(next);
    setState('done');
    onPassed();
  };

  return (
    <div className="flex flex-col items-start gap-3 text-sm text-white/80">
      <p>This one is optional.</p>
      <p>Strum on each click. There are {CLICKS} clicks. Any chord is fine.</p>
      {state === 'running' && (
        <Busy>{beat === 0 ? 'Get ready…' : `Click ${beat} of ${CLICKS}`}</Busy>
      )}
      <Status>
        {state === 'done' && (
          <Passed>
            Done. Your input delay is about {latencyMs} ms. We will correct for
            it.
          </Passed>
        )}
        {state === 'too-few' && (
          <Note icon={<TriangleAlert className="size-4" />}>
            We heard {heardStrums} of {CLICKS} strums. Strum on each click, then
            try again.
          </Note>
        )}
        {state === 'failed' && (
          <Note icon={<TriangleAlert className="size-4" />}>
            We couldn't play the clicks. Try again.
          </Note>
        )}
      </Status>
      {outputLatencySec > HIGH_OUTPUT_LATENCY_SEC && <LateOutputWarning />}
      {state !== 'running' && (
        <Button size="sm" onClick={run}>
          {state === 'ready' ? 'Start' : 'Try again'}
        </Button>
      )}
    </div>
  );
}

// ── MIDI and done ────────────────────────────────────────────────────────

function MidiCheckStep({
  subscribeNoteOn,
  onPassed,
}: {
  subscribeNoteOn: GuitarInputSetupProps['subscribeNoteOn'];
  onPassed: () => void;
}) {
  const [heard, setHeard] = useState<number | null>(null);
  const waiting = heard === null;

  useEffect(() => {
    if (!waiting) return;
    return subscribeNoteOn((event) => {
      if (event.source === 'audio') return;
      setHeard(event.number);
      onPassed();
    });
  }, [subscribeNoteOn, waiting]);

  return (
    <Status>
      {waiting ? (
        <div className="flex flex-col gap-2 text-sm text-white/80">
          <p>Play any note on your MIDI guitar.</p>
          <p className="text-white/60">
            Nothing yet? Check the cable, and that the guitar is on.
          </p>
        </div>
      ) : (
        <Passed>
          Got it: {pitchClassName(heard % 12, 0)}
          {Math.floor(heard / 12) - 1}.
        </Passed>
      )}
    </Status>
  );
}

function DoneStep({
  handle,
  micOff,
  lateOutput,
}: {
  handle: GuitarInputHandle;
  micOff: boolean;
  lateOutput: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm text-white/80">
      {micOff ? (
        <Note icon={<Mic className="size-4" />}>
          <span>The microphone is still off.</span>
          <span>It turns on when you start playing.</span>
        </Note>
      ) : (
        <Passed>You're ready to play.</Passed>
      )}
      <p>Your settings are saved. Open setup again any time with Set up.</p>
      {handle.prefs.bleedDetected && (
        <Note icon={<Headphones className="size-4" />}>
          Remember: wear headphones, or keep the speakers low.
        </Note>
      )}
      {lateOutput && <LateOutputWarning />}
    </div>
  );
}

// ── Dialog ───────────────────────────────────────────────────────────────

export interface GuitarInputSetupProps {
  open: boolean;
  onClose: () => void;
  handle: GuitarInputHandle;
  subscribeNoteOn: (cb: (event: MidiNoteEvent) => void) => () => void;
  subscribeChord: (cb: (event: GuitarChordEvent) => void) => () => void;
  /** Strum C through the lesson guitar voice; resolves when it has played. */
  onPlayTestChord: () => Promise<void>;
  /** The output's delay (Bluetooth is well over 0.15 s). */
  outputLatencySec?: number;
  /** Open at this step (e.g. the tuner, from the troubleshooting list). */
  initialStep?: GuitarSetupStep;
}

export function GuitarInputSetup({
  open,
  onClose,
  ...flow
}: GuitarInputSetupProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-white/10 bg-[#101012] text-white">
        <SetupFlow {...flow} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function SetupFlow({
  handle,
  subscribeNoteOn,
  subscribeChord,
  onPlayTestChord,
  outputLatencySec = 0,
  initialStep,
  onClose,
}: Omit<GuitarInputSetupProps, 'open'>) {
  const handleRef = useRef(handle);
  handleRef.current = handle;

  const audio = handle.prefs.source === 'audio';
  const listening = audio && handle.status === 'listening';
  const micOn =
    listening || (audio && handle.status === 'requesting-permission');
  const [source, setSource] = useState(handle.prefs.source);
  const [step, setStep] = useState<GuitarSetupStep>(() => {
    const steps = STEPS[handle.prefs.source];
    if (!initialStep || !steps.includes(initialStep)) return 'source';
    // A check that needs the mic starts where the mic gets turned on.
    return NEEDS_MIC.has(initialStep) && !micOn ? 'mic' : initialStep;
  });
  const [passed, setPassed] = useState<ReadonlySet<GuitarSetupStep>>(new Set());

  const steps = STEPS[source];
  const index = steps.indexOf(step);
  // With the mic off, its checks are passed over rather than skipped one by one.
  const reachable = (s: GuitarSetupStep) => micOn || !NEEDS_MIC.has(s);
  const stepDone =
    INFO_STEPS.has(step) || (step === 'mic' ? micOn : passed.has(step));

  const markPassed = useCallback(
    (s: GuitarSetupStep) => setPassed((prev) => new Set(prev).add(s)),
    [],
  );
  const passCurrent = useCallback(() => markPassed(step), [markPassed, step]);

  const next = () => {
    // Saved now, so enable() opens the input the student chose. Saving
    // 'audio' asks for nothing: only enable() opens the microphone.
    if (step === 'source' && source !== handle.prefs.source) {
      quietly(handle.restart({ source }));
    }
    setStep(steps.slice(index + 1).find(reachable) ?? 'done');
  };
  const back = () =>
    setStep(steps.slice(0, index).reverse().find(reachable) ?? 'source');
  const switchToMidi = () => {
    quietly(handle.restart({ source: 'midi' }));
    setSource('midi');
    setStep('midi-check');
  };

  // Each check listens with its own detector; everything else hears nothing.
  // Checks listen without the lesson's expected notes or key.
  useEffect(() => {
    const input = handleRef.current;
    const mode = evaluationModeFor(step);
    input.setEvaluationMode(mode);
    if (mode === 'off') return;
    input.setSuppressed(false);
    input.setExpectedNotes(null);
    input.setKeyContext(CHECK_KEY.rootPc, CHECK_KEY.intervals);
  }, [step]);
  useEffect(() => () => handleRef.current.setEvaluationMode('off'), []);

  // Reaching the end saves the time, so lessons stop asking for setup.
  useEffect(() => {
    if (step === 'done') {
      quietly(handleRef.current.restart({ setupCompletedAt: Date.now() }));
    }
  }, [step]);

  // Move focus to the new step's title so it is read out.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    titleRef.current?.focus();
  }, [step]);

  const lateOutput = outputLatencySec > HIGH_OUTPUT_LATENCY_SEC;

  let body: ReactNode;
  if (NEEDS_MIC.has(step) && !listening) {
    // Nothing on these steps may reach for the mic while the browser asks.
    body = micOn ? (
      <Busy>Waiting for your browser. Choose Allow.</Busy>
    ) : (
      <MicOffNotice onTurnOn={() => setStep('mic')} />
    );
  } else {
    switch (step) {
      case 'source':
        body = <SourceStep source={source} onChange={setSource} />;
        break;
      case 'mic':
        body = (
          <MicStep
            handle={handle}
            listening={listening}
            onReady={() => setStep('level')}
            onUseMidi={switchToMidi}
          />
        );
        break;
      case 'level':
        body = <LevelStep handle={handle} />;
        break;
      case 'quiet':
        body = <QuietStep handle={handle} onPassed={passCurrent} />;
        break;
      case 'tuner': {
        const analyser = handle.getTunerAnalyser();
        body = analyser ? (
          <TunerStep analyser={analyser} />
        ) : (
          <MicOffNotice onTurnOn={() => setStep('mic')} />
        );
        break;
      }
      case 'strings':
        body = (
          <StringsStep
            subscribeNoteOn={subscribeNoteOn}
            onPassed={passCurrent}
          />
        );
        break;
      case 'chord':
        body = (
          <ChordStep subscribeChord={subscribeChord} onPassed={passCurrent} />
        );
        break;
      case 'bleed':
        body = (
          <BleedStep
            handle={handle}
            subscribeChord={subscribeChord}
            onPlayTestChord={onPlayTestChord}
            onPassed={passCurrent}
          />
        );
        break;
      case 'timing':
        body = (
          <TimingStep
            handle={handle}
            subscribeChord={subscribeChord}
            outputLatencySec={outputLatencySec}
            onPassed={passCurrent}
          />
        );
        break;
      case 'midi-check':
        body = (
          <MidiCheckStep
            subscribeNoteOn={subscribeNoteOn}
            onPassed={passCurrent}
          />
        );
        break;
      case 'done':
        body = (
          <DoneStep
            handle={handle}
            micOff={source === 'audio' && !listening}
            lateOutput={lateOutput}
          />
        );
        break;
    }
  }

  return (
    <>
      {/* Right padding keeps the title clear of the close button. */}
      <DialogHeader className="pr-6">
        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-xl text-white outline-none"
        >
          {STEP_TITLES[step]}
        </DialogTitle>
        <DialogDescription className="text-xs text-white/50">
          Step {index + 1} of {steps.length}
        </DialogDescription>
        {/* Shape tells current and done apart, not colour alone. */}
        <ol
          aria-label="Setup progress"
          className="flex items-center justify-center gap-1.5 pt-1 sm:justify-start"
        >
          {steps.map((s, i) => (
            <li
              key={s}
              aria-current={s === step ? 'step' : undefined}
              className={`h-2 rounded-full ${
                s === step
                  ? 'w-5 bg-white'
                  : i < index
                    ? 'w-2 bg-white/60'
                    : 'w-2 border border-white/40'
              }`}
            >
              <span className="sr-only">{STEP_TITLES[s]}</span>
            </li>
          ))}
        </ol>
      </DialogHeader>

      {/* Keyed so a revisited step starts its check afresh. */}
      <div key={step} className="min-h-[140px]">
        {body}
      </div>

      <div className="flex items-center justify-between gap-2">
        {index > 0 ? (
          <Button variant="ghost" size="sm" onClick={back}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step === 'done' ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <Button variant={stepDone ? 'default' : 'outline'} onClick={next}>
            {stepDone ? 'Next' : 'Skip'}
          </Button>
        )}
      </div>
    </>
  );
}
