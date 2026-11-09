import { Headphones, Pause } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { startPianoSampler } from '@/audio/pianoSampler';
import { BossAvatar, BossHealthBar } from '@/components/Games/Echo/EchoBoss';
import { SECTION_TITLE } from '@/components/Games/Echo/EchoGate';
import { StreakBadge } from '@/components/Games/Echo/EchoHud';
import { EchoResultCard, EchoRoll } from '@/components/Games/Echo/EchoStage';
import {
  defaultInputFor,
  type EchoInputMode,
} from '@/components/Games/Echo/echoSettings';
import { EchoInputSurface } from '@/components/Games/Echo/input';
import { cn } from '@/components/utilities';
import '@/components/Games/Echo/echoGame.css';
import { melodyPads } from '@/curriculum/engine/echo';
import { SegmentedControl } from '@/curriculum/guitar/layout/settingsControls';
import { inkOn } from '@/curriculum/musicLiteracy/KeyRing';
import { LearnInputProvider } from '@/learn/context/LearnInputContext';
import type { SessionClock } from '../live/useServerClock';
import type { Interaction, InteractionResponsePayload } from '../types';
import { EchoClassCallPanel } from './EchoClassCallPanel';
import { bossHealth, classResultLine, echoPayloadOf } from './classRound';
import {
  DEFAULT_ECHO_INTERACTION,
  type EchoClassSettings,
  type SessionEcho,
} from './types';
import {
  useEchoClassStudent,
  type EchoStudentStatus,
} from './useEchoClassStudent';

// ── A student's screen in a class's Echo ───────────────────────────────────
// Echo's play screen in the live session's frame (docs/echo-classroom.md,
// The Student's Screen): the circle and the hub's cues beside their pads
// or keys. It follows the class's round; the device plays it in the
// student's headphones (useEchoClassStudent.ts).
//
//   Join In           the first tap turns the sound on (iPads need one)
//   between rounds    "Waiting for your teacher…"
//   after a round     their own result, if the teacher allows it
//   the class         the Boss's health and the class's last result, if
//                     the teacher allows it
//   paused            the music stops, and the screen says so
//
// What they play on is the teacher's to say: their choice (Pads or
// Keyboard, a switch here), the pads only, or the keyboard only. The
// session's lock screen covers all of this when the teacher locks devices.

const INPUT_OPTIONS = [
  { value: 'pads', label: 'Pads' },
  { value: 'keyboard', label: 'Keyboard' },
] as const;

const STATUS_LINE: Record<EchoStudentStatus, string> = {
  waiting: 'Waiting for your teacher…',
  tapToJoin: 'Tap Join In to hear the class’s Echo.',
  getReady: 'Get ready…',
  playing: '',
  result: '',
  paused: 'Your teacher paused the music.',
  sittingOut: 'Join in on the next round.',
};

export interface EchoClassStudentProps {
  interaction: Interaction;
  /** `SessionState.echo`: the class's round, for whichever slide. */
  echo: SessionEcho | null | undefined;
  slideId: string;
  clock: SessionClock;
  submittedPayload?: InteractionResponsePayload | null;
  onSubmit: (payload: InteractionResponsePayload) => void;
  disabled?: boolean;
}

/** A student's screen in a class's Echo (above). */
export function EchoClassStudent(props: EchoClassStudentProps) {
  return (
    <LearnInputProvider detectionMode="polyphonic" instrument="piano">
      <EchoClassStudentScreen {...props} />
    </LearnInputProvider>
  );
}

function EchoClassStudentScreen({
  interaction,
  echo: published,
  slideId,
  clock,
  submittedPayload,
  onSubmit,
  disabled = false,
}: EchoClassStudentProps) {
  const config = interaction.echo ?? DEFAULT_ECHO_INTERACTION;
  const echo = published?.slideId === slideId ? published : null;
  const settings: EchoClassSettings = echo?.settings ?? config.settings;
  const classKey = echo?.key ?? config.key;
  const level = echo?.level ?? config.level;
  const keyColor = useMemo(() => melodyPads(classKey).keyColor, [classKey]);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<EchoInputMode | null>(null);
  const input: EchoInputMode =
    settings.playOn === 'choice'
      ? (picked ?? defaultInputFor(level))
      : settings.playOn;

  const student = useEchoClassStudent({
    echo,
    slideId,
    offsetMs: clock.offsetMs,
    submitted: echoPayloadOf(submittedPayload, slideId),
    onSubmit,
    ready,
    settings,
  });
  const { status, run, calls, outcome } = student;
  const placed = calls[0] ?? null;
  const running = run.live && run.id === (echo?.run ?? -1);
  const lights = settings.lights === 'pads';
  const kind = placed?.call.kind === 'chords' ? 'chords' : 'melody';
  const isRight = (midi: number) => {
    if (!placed) return true;
    const pc = ((midi % 12) + 12) % 12;
    return placed.call.kind === 'melody'
      ? placed.notes.response.some((n) => n.midi === midi)
      : placed.call.chords.some((c) => c.pitchClasses.includes(pc));
  };

  // What a browser test reads to play along: the answer's notes, in run
  // ticks, and the pad that plays each (EchoStage.tsx does the same).
  const targets = useMemo(() => {
    if (!placed) return undefined;
    const pads = melodyPads(classKey);
    return JSON.stringify(
      placed.call.kind === 'melody'
        ? placed.notes.response.map((n) => ({
            onset: n.onset,
            midis: [n.midi],
            pad: pads.pads.findIndex((p) => p.midi === n.midi),
          }))
        : placed.attacks.response.map((a) => ({
            onset: a.onset,
            midis: [...a.chord.midis],
            degree: a.chord.degree,
          })),
    );
  }, [placed, classKey]);

  const section = echo?.section ?? 'melodyEcho';
  const title = section === 'boss' ? 'Echo Boss' : SECTION_TITLE[section];
  const result =
    echo?.classResult && echo.classResult.run === echo.run
      ? echo.classResult
      : null;
  const boss = section === 'boss' ? echo?.classResult?.boss : undefined;
  const line = STATUS_LINE[status];

  const joinIn = () => {
    // On the tap itself, so the audio may start.
    void startPianoSampler()
      .catch(() => {})
      .finally(() => setReady(true));
  };

  return (
    <section
      aria-label={`Echo: ${title}`}
      data-echo-class-student
      data-echo-status={status}
      data-echo-run={echo?.run ?? 0}
      data-echo-live={running || undefined}
      data-echo-play-with={input}
      data-echo-starts-at={
        echo?.call ? echo.startsAt - clock.offsetMs : undefined
      }
      data-echo-targets={targets}
      data-echo-tempo={echo?.tempo}
      className="echo-class relative flex min-h-[560px] w-full flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#101012] p-4 text-[#e8e8f0] max-[639px]:p-3"
    >
      <div className="flex min-h-[44px] flex-wrap items-center gap-x-6 gap-y-2">
        <h2 className="text-xl">{title}</h2>
        {echo && echo.run > 0 && (
          <span className="text-sm tabular-nums text-white/55">
            Round {echo.run}
          </span>
        )}
        {settings.classProgress && boss && section === 'boss' && (
          <div className="flex items-center gap-3" data-echo-class-boss>
            <BossAvatar size={40} />
            <BossHealthBar health={bossHealth(boss)} color={keyColor} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-4">
          {settings.playOn === 'choice' && (
            <SegmentedControl<EchoInputMode>
              label="Play with"
              options={INPUT_OPTIONS}
              value={input}
              onChange={setPicked}
            />
          )}
          <StreakBadge streak={student.streak} keyColor={keyColor} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-4 max-[899px]:grid-cols-[minmax(0,1fr)] max-[899px]:grid-rows-[320px_minmax(260px,1fr)]">
        <EchoClassCallPanel
          classKey={classKey}
          placed={placed}
          view={run.view}
          running={running}
          idle={
            status === 'waiting'
              ? 'Waiting…'
              : status === 'getReady'
                ? 'Get Ready'
                : title
          }
          lights={lights}
          line={
            status === 'waiting'
              ? STATUS_LINE.waiting
              : lights
                ? 'Listen to Atlas, then play it back.'
                : 'Listen closely: no lights this time.'
          }
        />

        <div className="relative flex min-h-[220px] min-w-0 flex-col gap-3">
          {input === 'keyboard' && lights && placed && (
            <EchoRoll
              runId={echo?.run ?? 0}
              calls={calls}
              played={run.played}
              running={running}
              tempo={placed.timeline.tempo}
              keyColor={keyColor}
              tonic={melodyPads(classKey).tonic}
              isRight={isRight}
            />
          )}
          <EchoInputSurface
            input={input}
            kind={kind}
            keyChoice={classKey}
            onNoteOn={run.noteOn}
            onNoteOff={run.noteOff}
            lit={running && lights ? run.view.lit : []}
            targets={
              placed && lights
                ? placed.notes.call.map((n) => n.midi)
                : undefined
            }
            isRight={lights ? isRight : undefined}
            enabled={!disabled && ready && status !== 'paused'}
            className={input === 'pads' ? 'min-h-[180px] pt-6' : undefined}
          />
          {outcome && settings.afterRound === 'result' && (
            <EchoResultCard outcome={outcome} keyColor={keyColor} />
          )}
          {outcome && settings.afterRound === 'nothing' && (
            <Card>
              <span className="text-xl">Thanks! Your echo is in.</span>
            </Card>
          )}
          {!ready && !disabled && (
            <Card interactive>
              <Headphones aria-hidden className="size-8 text-white/70" />
              <span className="text-2xl">Put Your Headphones On</span>
              <span className="text-sm text-white/55">
                Atlas plays each call on this device. Echo it back on your pads
                or keys.
              </span>
              <button
                type="button"
                data-echo-join-in
                onClick={joinIn}
                className="mt-1 inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ backgroundColor: keyColor, color: inkOn(keyColor) }}
              >
                Join In
              </button>
            </Card>
          )}
          {status === 'paused' && (
            <Card>
              <Pause aria-hidden className="size-7 text-white/70" />
              <span className="text-2xl">Paused</span>
              <span className="text-sm text-white/55">{line}</span>
            </Card>
          )}
          {ready && status === 'sittingOut' && (
            <Card>
              <span className="text-xl">{line}</span>
            </Card>
          )}
        </div>
      </div>

      <footer className="flex min-h-[28px] flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
        {/* Said aloud; the circle's line shows it. */}
        <span
          role="status"
          aria-live="polite"
          data-echo-student-line
          className="sr-only"
        >
          {status === 'waiting' || status === 'getReady' ? line : ''}
        </span>
        {settings.classProgress && result && (
          <span
            role="status"
            aria-live="polite"
            data-echo-class-result
            className="ml-auto font-semibold text-[#e8e8f0]"
          >
            {classResultLine(result)}
          </span>
        )}
      </footer>
    </section>
  );
}

/** A card over the input, the column dimmed under it. */
function Card({
  children,
  interactive = false,
}: {
  children: ReactNode;
  /** It holds a button: it takes the pointer. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#101012]/70 p-4',
        !interactive && 'pointer-events-none',
      )}
    >
      <div
        role="status"
        className="echo-pop flex max-w-full flex-col items-center gap-2 rounded-2xl border border-white/10 bg-[#151518] px-6 py-5 text-center shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}
