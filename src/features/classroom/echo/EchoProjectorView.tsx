import { Pause, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { BossAvatar, BossHealthBar } from '@/components/Games/Echo/EchoBoss';
import { SECTION_TITLE } from '@/components/Games/Echo/EchoGate';
import { placeCall } from '@/components/Games/Echo/echoRunCues';
import {
  useClockRun,
  type ClockRun,
} from '@/components/Games/Echo/useClockRun';
import '@/components/Games/Echo/echoGame.css';
import { cn } from '@/components/utilities';
import {
  echoTimeline,
  fromEchoCallWire,
  melodyPads,
} from '@/curriculum/engine/echo';
import { keyName } from '@/curriculum/musicLiteracy/ChooseKeyPanel';
import { toLocalTime } from '../live/serverClock';
import type { SessionClock } from '../live/useServerClock';
import { EchoClassCallPanel } from './EchoClassCallPanel';
import { EchoMarkIcon } from './EchoMarkIcon';
import { bossHealth, bossOutcome, classResultLine } from './classRound';
import type { EchoNameRow, SessionEcho } from './types';

// ── The projector in a class's Echo ────────────────────────────────────────
// What the whole room looks at (docs/echo-classroom.md, The Projector):
//
//   the circle    big, with the round's cues (Get Ready, Listen, the
//                 count-off, Your Turn), read off the clock and silent: the
//                 students hear the round in their own headphones
//   the class     after each round, its result in counts: "21 of 24
//                 echoed it!"
//   the Boss      from the Boss on, its face and health; won or lost
//   names         only if the teacher chose them (Teacher Settings): a
//                 first-name leaderboard, or the grid with first names.
//                 Otherwise none, ever: the projector never gets a
//                 student's results (buildProjectorView refuses `echo`)

export interface EchoProjectorViewProps {
  /** `SessionState.echo`, whatever slide it's for. */
  echo: SessionEcho | null | undefined;
  slideId: string;
  clock: SessionClock;
  /** The slide's title, shown before the first round. */
  title?: string;
  /** Inside a box of its own (the dev class page), not the whole screen. */
  embedded?: boolean;
}

/** The projector's Echo (above). */
export function EchoProjectorView({
  echo: published,
  slideId,
  clock,
  title = 'Echo!',
  embedded = false,
}: EchoProjectorViewProps) {
  const echo = published?.slideId === slideId ? published : null;
  const run = echo?.run ?? 0;
  const startsAt = echo?.startsAt ?? 0;
  const clockRun = useMemo<ClockRun | null>(() => {
    const call = fromEchoCallWire(echo?.call);
    if (!call || !echo || echo.paused) return null;
    return {
      calls: [placeCall(call, echoTimeline(call, { tempo: echo.tempo }))],
      startsAt: toLocalTime(echo.startsAt, clock.offsetMs),
    };
    // One run per round (and again when it's paused or played).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, startsAt, echo?.paused, clock.offsetMs]);
  const { view, running } = useClockRun(clockRun);

  const classKey = echo?.key ?? { tonic: 'C' as const, mode: 'major' as const };
  const keyColor = useMemo(() => melodyPads(classKey).keyColor, [classKey]);
  const section = echo?.section ?? 'melodyEcho';
  const result =
    echo?.classResult && echo.classResult.run === run ? echo.classResult : null;
  const boss = section === 'boss' ? echo?.classResult?.boss : undefined;
  const outcome = section === 'boss' && result ? bossOutcome(boss) : 'fighting';
  const lights = (echo?.settings.lights ?? 'pads') === 'pads';
  const idle = !echo?.call
    ? 'Headphones on!'
    : echo.paused
      ? 'Paused'
      : result
        ? 'Nice!'
        : 'Get Ready';

  return (
    <div
      data-echo-projector
      data-echo-run={run}
      data-echo-live={running || undefined}
      className={cn(
        'echo-class flex flex-col overflow-hidden bg-[#101012] text-[#e8e8f0]',
        embedded ? 'gap-3 p-4' : 'gap-6 p-8',
        embedded ? 'relative h-full w-full rounded-2xl' : 'fixed inset-0',
      )}
    >
      <header className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h1
          className={cn(
            'leading-tight',
            embedded ? 'text-3xl' : 'text-[clamp(28px,3vw,44px)]',
          )}
        >
          {echo?.call ? SECTION_TITLE[section] : title}
        </h1>
        {run > 0 && (
          <span className="text-xl tabular-nums text-white/55">
            Round {run}
          </span>
        )}
        <span className="ml-auto text-xl text-white/55">
          {keyName(classKey.tonic, classKey.mode)}
          {echo?.tempo ? ` · ${echo.tempo} BPM` : ''}
        </span>
      </header>

      <div
        className={cn(
          'grid min-h-0 flex-1',
          embedded
            ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4'
            : 'grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8 max-[899px]:grid-cols-1',
        )}
      >
        <EchoClassCallPanel
          classKey={classKey}
          placed={clockRun?.calls[0] ?? null}
          view={view}
          running={running}
          idle={idle}
          lights={lights}
          line={
            echo?.call
              ? 'Listen to Atlas, then play it back together.'
              : 'Echo is about to start. Get your headphones on!'
          }
        />

        <aside
          className={cn(
            'flex min-h-0 min-w-0 flex-col justify-center overflow-hidden',
            embedded ? 'gap-4' : 'gap-8',
          )}
        >
          {section === 'boss' && echo?.call && (
            <div
              data-echo-projector-boss={outcome}
              className="flex min-w-0 flex-wrap items-center gap-5"
            >
              <BossAvatar size={embedded ? 56 : 88} />
              <div className="flex min-w-0 flex-col gap-2">
                <BossHealthBar health={bossHealth(boss)} color={keyColor} />
                <span
                  className={cn(
                    'text-white/60',
                    embedded ? 'text-sm' : 'text-lg',
                  )}
                >
                  {outcome === 'won'
                    ? 'The class beat the Echo Boss!'
                    : outcome === 'lost'
                      ? 'The Echo Boss wins this time!'
                      : '70% of the class echoing it is a hit.'}
                </span>
              </div>
            </div>
          )}

          <div
            role="status"
            aria-live="polite"
            data-echo-projector-result={result ? result.good : undefined}
            className="min-h-[3em]"
          >
            {echo?.paused ? (
              <span className="flex items-center gap-3 text-[clamp(28px,3vw,44px)]">
                <Pause aria-hidden className="size-10" />
                Paused
              </span>
            ) : result ? (
              <span className="echo-pop flex min-w-0 flex-col gap-1">
                <span
                  className={cn(
                    'break-words font-semibold leading-tight',
                    embedded ? 'text-3xl' : 'text-[clamp(40px,4.5vw,80px)]',
                  )}
                  style={{ color: keyColor }}
                >
                  {classResultLine(result)}
                </span>
                {outcome === 'won' && (
                  <span className="flex items-center gap-2 text-2xl text-white/80">
                    <Trophy aria-hidden className="size-6" />
                    Boss Defeated!
                  </span>
                )}
              </span>
            ) : null}
          </div>

          {echo?.names && echo.settings.projector === 'leaderboard' && (
            <Leaderboard rows={echo.names} keyColor={keyColor} />
          )}
          {echo?.names && echo.settings.projector === 'grid' && (
            <NameGrid rows={echo.names} keyColor={keyColor} />
          )}
        </aside>
      </div>
    </div>
  );
}

/** The leaders by good echoes, first names only. */
function Leaderboard({
  rows,
  keyColor,
}: {
  rows: readonly EchoNameRow[];
  keyColor: string;
}) {
  if (rows.length === 0) return null;
  return (
    <ol aria-label="Leaderboard" className="flex flex-col gap-2 text-2xl">
      {rows.map((row, i) => (
        <li key={`${row.name}-${i}`} className="flex items-baseline gap-4">
          <span className="w-8 text-right tabular-nums text-white/45">
            {i + 1}
          </span>
          <span className="flex-1 truncate">{row.name}</span>
          <span className="tabular-nums" style={{ color: keyColor }}>
            {row.good}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The grid with first names: the latest rounds. */
function NameGrid({
  rows,
  keyColor,
}: {
  rows: readonly EchoNameRow[];
  keyColor: string;
}) {
  return (
    <ul aria-label="The class's echoes" className="flex flex-col gap-1 text-xl">
      {rows.map((row, i) => (
        <li key={`${row.name}-${i}`} className="flex items-center gap-3">
          <span className="w-32 truncate">{row.name}</span>
          <span className="flex gap-1">
            {row.marks.map((mark, j) => (
              <EchoMarkIcon key={j} mark={mark} keyColor={keyColor} />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
