/**
 * DEV only: a whole class's Echo on one computer.
 *
 * Route: /dev/echo/classroom  (registered in src/App.tsx behind
 * import.meta.env.DEV). Side by side, on one in-memory bus in the
 * session's own message shapes (echoClassBus.ts):
 *
 *   the teacher     the real panel: strip, grid, Teacher Settings
 *   the projector   the real projector view, silent, counts only
 *   you             a real student screen, playing the rounds in this
 *                   browser's audio (Join In first)
 *   the class       pretend students answering every call with their
 *                   own timing and slips (simulatedStudents.ts)
 *
 * So the whole loop (rounds, the grid, the class's result, the Boss) can
 * be seen and tested on one computer. The query sets the class:
 *
 *   ?students=8&level=1&tonic=C&mode=major&projector=class&you=1
 *
 * `you=0` leaves the real student out (no audio at all).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { placeCall } from '@/components/Games/Echo/echoRunCues';
import {
  LITERACY_TONICS,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import {
  echoRandom,
  echoTimeline,
  fromEchoCallWire,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import { LOCAL_SESSION_CLOCK } from '../../live/useServerClock';
import type { Interaction } from '../../types';
import { EchoClassStudent } from '../EchoClassStudent';
import { EchoMarkIcon } from '../EchoMarkIcon';
import { EchoProjectorView } from '../EchoProjectorView';
import { EchoTeacherPanel } from '../EchoTeacherPanel';
import {
  classRoundLengthMs,
  echoPayloadOf,
  markOf,
  roundOf,
  withRound,
  type EchoRosterEntry,
} from '../classRound';
import {
  DEFAULT_ECHO_CLASS_SETTINGS,
  DEFAULT_ECHO_INTERACTION,
  type EchoClassSettings,
} from '../types';
import { createEchoClassBus, type EchoClassBus } from './echoClassBus';
import {
  simulateAnswer,
  simulatedClockOffset,
  simulatedRoster,
  simulatedRound,
  type SimStudent,
} from './simulatedStudents';

const SLIDE_ID = 'slide-echo-dev';
const INTERACTION_ID = 'ix-echo-dev';
const YOU = 'you';
/** On the roster, never joined: the grid's ○. */
const ABSENT: EchoRosterEntry = {
  enrollmentId: 'absent-1',
  displayName: 'Zoe Q.',
};

const PROJECTORS: readonly EchoClassSettings['projector'][] = [
  'class',
  'leaderboard',
  'grid',
];

/** The pretend class answers each round, as their devices would. */
function useSimulatedClass(bus: EchoClassBus, sims: readonly SimStudent[]) {
  const pending = useRef(new Map<string, { at: number; timer: number }>());
  useEffect(() => {
    let seen = '';
    const cancelFrom = (now: number) => {
      // A device whose round was cut short (paused, skipped) sends nothing.
      for (const [key, p] of pending.current) {
        if (p.at > now) {
          window.clearTimeout(p.timer);
          pending.current.delete(key);
        }
      }
    };
    const onChange = () => {
      const echo = bus.snapshot().state.echo;
      if (!echo || echo.slideId !== SLIDE_ID) return;
      if (echo.paused) {
        cancelFrom(echo.startsAt);
        seen = '';
        return;
      }
      const id = `${echo.run}:${echo.startsAt}`;
      if (!echo.call || id === seen) return;
      seen = id;
      cancelFrom(echo.startsAt);
      const call = fromEchoCallWire(echo.call);
      if (!call) return;
      const placed = placeCall(call, echoTimeline(call, { tempo: echo.tempo }));
      const end = echo.startsAt + classRoundLengthMs(call, echo.tempo);
      for (const sim of sims) {
        const rng = echoRandom(`${id}:${sim.enrollmentId}`);
        if (rng() < sim.absent) continue;
        const played = simulateAnswer(sim, placed, rng);
        const round = simulatedRound(
          echo.run,
          placed,
          played,
          echo.settings.grading,
        );
        const at = end + 200 + rng() * 700;
        const key = `${id}:${sim.enrollmentId}`;
        const timer = window.setTimeout(
          () => {
            pending.current.delete(key);
            const before = echoPayloadOf(
              bus.snapshot().responses[sim.enrollmentId]?.[INTERACTION_ID],
              SLIDE_ID,
            );
            bus.send(
              'student',
              {
                kind: 'response',
                interactionId: INTERACTION_ID,
                enrollmentId: sim.enrollmentId,
                payload: withRound(before, SLIDE_ID, round),
              },
              sim.enrollmentId,
            );
          },
          Math.max(0, at - Date.now()),
        );
        pending.current.set(key, { at, timer });
      }
    };
    const stop = bus.subscribe(onChange);
    const timers = pending.current;
    return () => {
      stop();
      for (const p of timers.values()) window.clearTimeout(p.timer);
      timers.clear();
    };
  }, [bus, sims]);
}

export function EchoClassroomHarness() {
  const [params] = useSearchParams();
  const count = Math.max(1, Math.min(16, Number(params.get('students')) || 8));
  const level = (
    [1, 2, 3].includes(Number(params.get('level')))
      ? Number(params.get('level'))
      : 1
  ) as EchoLevelNumber;
  const tonic = (LITERACY_TONICS as readonly string[]).includes(
    params.get('tonic') ?? '',
  )
    ? (params.get('tonic') as LiteracyTonic)
    : 'C';
  const mode = params.get('mode') === 'minor' ? 'minor' : 'major';
  const projector = PROJECTORS.includes(
    params.get('projector') as EchoClassSettings['projector'],
  )
    ? (params.get('projector') as EchoClassSettings['projector'])
    : 'class';
  const withYou = params.get('you') !== '0';

  const [sessionId] = useState(() => `dev-sess-${Date.now().toString(36)}`);
  const bus = useMemo(
    () => createEchoClassBus({ sessionId, classroomId: `dev-${sessionId}` }),
    [sessionId],
  );
  const snap = useSyncExternalStore(bus.subscribe, bus.snapshot);
  const sims = useMemo(() => simulatedRoster(count), [count]);
  useSimulatedClass(bus, sims);

  const interaction = useMemo<Interaction>(
    () => ({
      id: INTERACTION_ID,
      type: 'echo',
      question: { en: 'Echo Atlas!' },
      shareable: false,
      echo: {
        ...DEFAULT_ECHO_INTERACTION,
        level,
        key: { tonic, mode },
        settings: { ...DEFAULT_ECHO_CLASS_SETTINGS, projector },
      },
    }),
    [level, tonic, mode, projector],
  );

  // Everyone pretend is here; "you" too; one student never comes.
  useEffect(() => {
    for (const sim of sims) bus.setPresence(sim.enrollmentId, 'active');
    if (withYou) bus.setPresence(YOU, 'active');
  }, [bus, sims, withYou]);

  const roster = useMemo<EchoRosterEntry[]>(
    () => [
      ...(withYou
        ? [{ enrollmentId: YOU, displayName: 'You (this browser)' }]
        : []),
      ...sims.map((s) => ({
        enrollmentId: s.enrollmentId,
        displayName: s.displayName,
      })),
      ABSENT,
    ],
    [sims, withYou],
  );
  const clockOffsets = useMemo(
    () =>
      Object.fromEntries(
        sims.map((s) => [
          s.enrollmentId,
          simulatedClockOffset(s, echoRandom(`clock:${s.enrollmentId}`)),
        ]),
      ),
    [sims],
  );

  const echo = snap.state.echo ?? null;
  const youPayload = snap.responses[YOU]?.[INTERACTION_ID] ?? null;

  return (
    <div
      data-dev-echo-classroom
      data-dev-messages={snap.messages}
      className="min-h-screen bg-[#0b0b0d] p-4 text-[#e8e8f0]"
    >
      <header className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h1 className="text-2xl">Echo in the Classroom</h1>
        <span className="text-sm text-white/55">
          A dev class on one page: {count} pretend students
          {withYou ? ', and you' : ''}, on an in-memory bus.
        </span>
        <span className="ml-auto text-xs tabular-nums text-white/40">
          {snap.messages} messages
        </span>
        <Link to="/arcade/echo" className="text-sm text-white/60 underline">
          Solo Echo
        </Link>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel title="Teacher">
          <EchoTeacherPanel
            sessionId={sessionId}
            classroomId={`dev-${sessionId}`}
            slideId={SLIDE_ID}
            interaction={interaction}
            echo={echo}
            responses={snap.responses}
            roster={roster}
            presence={snap.presence}
            clock={LOCAL_SESSION_CLOCK}
            sendEcho={(next) =>
              bus.send('teacher', { kind: 'echo', echo: next })
            }
          />
        </Panel>
        <Panel title="Projector">
          <div className="aspect-[16/9] w-full">
            <EchoProjectorView
              echo={echo}
              slideId={SLIDE_ID}
              clock={LOCAL_SESSION_CLOCK}
              embedded
            />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {withYou ? (
          <Panel title="You, a student">
            <EchoClassStudent
              interaction={interaction}
              echo={echo}
              slideId={SLIDE_ID}
              clock={LOCAL_SESSION_CLOCK}
              submittedPayload={youPayload}
              onSubmit={(payload) =>
                bus.send(
                  'student',
                  {
                    kind: 'response',
                    interactionId: INTERACTION_ID,
                    enrollmentId: YOU,
                    payload,
                  },
                  YOU,
                )
              }
            />
          </Panel>
        ) : (
          <div />
        )}
        <Panel title="The pretend class">
          <SimList
            sims={sims}
            responses={snap.responses}
            run={echo?.classResult?.run ?? 0}
            offsets={clockOffsets}
          />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-2">
      <h2 className="text-xs uppercase tracking-[0.14em] text-white/45">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Each pretend student: how steady they are, their clock, their last round. */
function SimList({
  sims,
  responses,
  run,
  offsets,
}: {
  sims: readonly SimStudent[];
  responses: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  run: number;
  offsets: Readonly<Record<string, number>>;
}) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {sims.map((sim) => {
        const payload = echoPayloadOf(
          responses[sim.enrollmentId]?.[INTERACTION_ID],
          SLIDE_ID,
        );
        const round = roundOf(payload, run);
        const good = payload?.rounds.filter((r) => r.passed).length ?? 0;
        const error = -((offsets[sim.enrollmentId] ?? 0) + sim.skewMs);
        return (
          <li
            key={sim.enrollmentId}
            data-dev-sim={sim.enrollmentId}
            className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-1.5"
          >
            <span className="w-24 truncate">{sim.displayName}</span>
            <EchoMarkIcon mark={markOf(round, true)} keyColor="#7fd6a4" />
            <span className="w-16 tabular-nums text-white/60">
              {round ? `${round.score}%` : '–'}
            </span>
            <span className="w-20 tabular-nums text-white/60">{good} good</span>
            <span className="text-xs tabular-nums text-white/40">
              ±{sim.jitterMs} ms · clock {sim.skewMs > 0 ? '+' : ''}
              {sim.skewMs} ms, in step within {Math.abs(Math.round(error))} ms
            </span>
          </li>
        );
      })}
    </ul>
  );
}
