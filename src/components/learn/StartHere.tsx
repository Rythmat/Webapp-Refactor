import { Check, Play, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CircleOfFifthsSvg } from '@/components/common/CircleOfFifthsSvg';
import { cn } from '@/components/utilities';
import {
  currentStop,
  useLiteracyPath,
  type LiteracyPathModule,
  type LiteracyStopKey,
  type LiteracyStopState,
} from '@/curriculum/musicLiteracy/literacyPath';

// ── Learn → Start Here ─────────────────────────────────────────────────────
// The Music Literacy path, drawn as a journey: five stops down a rail, each
// with its module, a line on what it is, and where the student stands. An
// open stop is a card in its lesson's key colour (Part 1: C's red) with
// Start / Continue; a stop still to come is a quiet row marked "Coming
// soon". The stops and their states come from musicLiteracy/literacyPath.ts.

const MODULE_ICON: Record<LiteracyPathModule, string> = {
  Learn: '/icons/learn-icon.svg',
  Studio: '/icons/studio-icon.svg',
  Arcade: '/icons/arcade-icon.svg',
};

/** "#D2404A" → "210, 64, 74", for rgba() tints. */
function rgbOf(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** A card's wash of its key colour, fading out left to right. */
export const keyTint = (color: string) =>
  `linear-gradient(100deg, rgba(${rgbOf(color)}, 0.16) 0%, rgba(${rgbOf(color)}, 0) 65%)`;

/** The open stop's action: Start, Continue, or Play again once it's done. */
export function stopAction(state: LiteracyStopState): string {
  return state.status === 'started'
    ? 'Continue'
    : state.status === 'done'
      ? 'Play again'
      : 'Start';
}

/** "3 of 7 steps", "7 steps", "All 7 steps passed". */
export function stepsLine(state: LiteracyStopState): string {
  const total = state.steps.length;
  if (state.status === 'done') return `All ${total} steps passed`;
  if (state.status === 'new') return `${total} steps`;
  return `${state.passed} of ${total} steps`;
}

/**
 * The module rounds done, once any is: "Challenge done", "1 of 4 create
 * rounds". Null before then.
 */
export function roundsLine(state: LiteracyStopState): string | null {
  const rounds = state.rounds;
  if (!rounds || rounds.done === 0) return null;
  const noun =
    rounds.kind === 'challenge'
      ? ['Challenge', 'challenges']
      : rounds.kind === 'create'
        ? ['Create round', 'create rounds']
        : ['Round', 'rounds'];
  return rounds.total === 1
    ? `${noun[0]} done`
    : `${rounds.done} of ${rounds.total} ${noun[1]}`;
}

/** The rounds' mark: the round's icon in the key's color, and its line. */
export const RoundsMark = ({
  state,
  className,
}: {
  state: LiteracyStopState;
  className?: string;
}) => {
  const line = roundsLine(state);
  if (!line) return null;
  const Icon = state.rounds?.kind === 'challenge' ? Trophy : Sparkles;
  return (
    <span
      data-path-rounds={`${state.rounds?.done}/${state.rounds?.total}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 text-sm text-white/60',
        className,
      )}
    >
      <Icon
        aria-hidden
        className="h-3.5 w-3.5"
        style={{ color: state.key?.color }}
      />
      {line}
    </span>
  );
};

/** More steps than this, and the pips are dots: Part 2's 57 fit a card. */
const DENSE_PIPS = 20;

/** The lesson's steps as a row of pips: passed, tried, still to do. */
export const StepPips = ({
  state,
  className,
}: {
  state: LiteracyStopState;
  className?: string;
}) => {
  const color = state.key?.color ?? '#e8e8f0';
  const dense = state.steps.length > DENSE_PIPS;
  return (
    <span
      role="img"
      aria-label={`${state.passed} of ${state.steps.length} steps passed`}
      className={cn(
        'flex items-center',
        dense ? 'gap-[3px]' : 'gap-1',
        className,
      )}
    >
      {state.steps.map((mark, i) => (
        <span
          key={i}
          data-step-mark={mark}
          className={cn(
            'h-1.5 rounded-full',
            dense ? 'w-1.5 md:w-2' : 'w-5 md:w-6',
          )}
          style={{
            backgroundColor:
              mark === 'passed'
                ? color
                : mark === 'tried'
                  ? `rgba(${rgbOf(color)}, 0.4)`
                  : 'rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </span>
  );
};

/**
 * The lesson's key on the circle of fifths, the series' colour language,
 * with its name in the ring's hole as the player's hub has the call. Sized
 * by `className`: the ring fills the box (the wheel's room for an outer
 * label, unused here, hangs outside it).
 */
export const KeyCircle = ({
  stopKey,
  className,
}: {
  stopKey: LiteracyStopKey;
  className?: string;
}) => (
  <span
    role="img"
    aria-label={stopKey.name}
    className={cn('relative block shrink-0', className)}
  >
    <CircleOfFifthsSvg
      selectedPitch={stopKey.pitch}
      selectedMode={stopKey.mode}
      size={140}
      showLabel={false}
      className="absolute inset-[-21%] h-[142%] w-[142%]"
    />
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full"
    >
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="26"
        fontWeight={500}
        fill="#e8e8f0"
      >
        {stopKey.tonic}
      </text>
    </svg>
  </span>
);

/**
 * An open stop's way in: Start, Continue, or Play again, as the white pill
 * every Learn banner leads with (Learn Home's Resume); `quiet`, an outline.
 */
export const StopActionLink = ({
  state,
  quiet,
  className,
}: {
  state: LiteracyStopState;
  quiet?: boolean;
  className?: string;
}) =>
  state.to ? (
    <Link
      to={state.to}
      aria-label={`${stopAction(state)} ${state.stop.title}`}
      className={cn(
        'flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-black transition-transform hover:scale-105',
        quiet &&
          'bg-transparent text-white ring-1 ring-white/25 hover:bg-white/5',
        className,
      )}
    >
      {state.status === 'done' ? (
        <RotateCcw className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" fill="currentColor" />
      )}
      {stopAction(state)}
    </Link>
  ) : null;

const ModuleLabel = ({
  state,
  dim,
}: {
  state: LiteracyStopState;
  dim?: boolean;
}) => (
  <div
    className={cn(
      'flex items-center gap-1.5 text-xs uppercase tracking-wide',
      dim ? 'text-white/40' : 'text-white/55',
    )}
  >
    <img
      src={MODULE_ICON[state.stop.module]}
      alt=""
      draggable={false}
      className={cn('h-4 w-4', dim ? 'opacity-40' : 'opacity-70')}
    />
    {state.stop.module}
    {state.stop.place && ` · ${state.stop.place}`}
  </div>
);

/**
 * The stop's place on the rail: its number in a ring that fills in the
 * lesson's colour as its steps are passed, solid with a check once done. A
 * stop still to come is a faint ring.
 */
const StopMarker = ({
  state,
  number,
}: {
  state: LiteracyStopState;
  number: number;
}) => {
  const open = state.status !== 'soon';
  const color = state.key?.color ?? '#e8e8f0';
  const share = state.steps.length ? state.passed / state.steps.length : 0;
  const r = 18;
  const around = 2 * Math.PI * r;
  return (
    <span
      aria-hidden
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#101012] sm:h-10 sm:w-10"
    >
      {state.status === 'done' ? (
        <span
          className="flex h-full w-full items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Check
            className="h-4 w-4 text-[#101012] sm:h-5 sm:w-5"
            strokeWidth={2.5}
          />
        </span>
      ) : (
        <>
          <svg
            viewBox="0 0 40 40"
            className="absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="20"
              cy="20"
              r={r}
              fill="none"
              strokeWidth={open ? 2 : 1}
              stroke={
                open ? `rgba(${rgbOf(color)}, 0.35)` : 'rgba(255,255,255,0.15)'
              }
              strokeDasharray={open ? undefined : '3 3'}
            />
            {open && share > 0 && (
              <circle
                cx="20"
                cy="20"
                r={r}
                fill="none"
                strokeWidth={2}
                stroke={color}
                strokeLinecap="round"
                strokeDasharray={`${share * around} ${around}`}
              />
            )}
          </svg>
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              open ? 'text-white' : 'text-white/35',
            )}
          >
            {number}
          </span>
        </>
      )}
    </span>
  );
};

/** An open stop: its card, in its lesson's colour, with the way in. */
const OpenStop = ({
  state,
  current,
}: {
  state: LiteracyStopState;
  current: boolean;
}) => {
  const { stop, key, next } = state;
  return (
    <div
      data-path-stop={stop.id}
      data-path-status={state.status}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
    >
      {key && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: keyTint(key.color) }}
        />
      )}
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 md:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
          {key && (
            <KeyCircle
              stopKey={key}
              className="hidden h-16 w-16 sm:block md:h-20 md:w-20"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <ModuleLabel state={state} />
            <h3 className="text-lg font-semibold leading-tight text-white md:text-2xl">
              {stop.title}
            </h3>
            {stop.description && (
              <p className="text-sm text-white/60 md:text-base">
                {stop.description}
              </p>
            )}
          </div>
        </div>
        <StopActionLink
          state={state}
          quiet={!current}
          className="self-start sm:self-center"
        />
      </div>
      {state.steps.length > 0 && (
        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] px-4 py-3 md:px-5">
          <StepPips state={state} />
          <span className="text-sm text-white/60">
            {stepsLine(state)}
            {state.status === 'started' && next && (
              <span className="text-white/45">
                {' · '}Next: {next.title}
              </span>
            )}
          </span>
          <RoundsMark state={state} className="sm:ml-auto" />
        </div>
      )}
    </div>
  );
};

/** A stop still to come: a quiet waypoint on the rail, not a link. */
const SoonStop = ({ state }: { state: LiteracyStopState }) => (
  <div
    data-path-stop={state.stop.id}
    data-path-status="soon"
    className="flex flex-col gap-2 px-4 py-1.5 sm:flex-row sm:items-center sm:gap-5 md:px-5"
  >
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <ModuleLabel state={state} dim />
      <h3 className="text-base font-medium leading-tight text-white/75 md:text-lg">
        {state.stop.title}
      </h3>
      {state.stop.description && (
        <p className="text-sm text-white/45">{state.stop.description}</p>
      )}
    </div>
    <span className="shrink-0 self-start rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/50 sm:self-center">
      Coming soon
    </span>
  </div>
);

/** The rail between two stops: solid into an open stop, dashed into one to come. */
const Rail = ({ into }: { into: LiteracyStopState | undefined }) =>
  into ? (
    <span
      aria-hidden
      className={cn(
        'w-0 flex-1 border-l-2',
        into.status === 'soon'
          ? 'border-dashed border-white/10'
          : 'border-solid border-white/20',
      )}
    />
  ) : (
    <span aria-hidden className="flex-1" />
  );

/**
 * Learn → Start Here: the Music Literacy path, the first thing a beginner
 * or a teacher is shown. The same path on piano and guitar: the lesson
 * plays on the on-screen and computer keys too.
 */
export const StartHere = () => {
  const states = useLiteracyPath();
  const { current } = currentStop(states);

  return (
    <div className="px-6 pb-12 pt-6 md:px-10 md:pt-8">
      <div className="flex max-w-[920px] flex-col gap-6 md:gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium leading-tight text-white sm:text-3xl md:text-4xl">
            <span className="text-white/45">Start here:</span> Music Literacy
          </h1>
          <p className="text-base text-white/60 md:text-lg">
            Learn Music from Step 1.
          </p>
        </header>

        <ol aria-label="The Music Literacy path" className="flex flex-col">
          {states.map((state, i) => (
            <li
              key={state.stop.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-x-5"
            >
              {/* The rail: half from the stop before, the marker, half on
                  to the next; the stop's card sits level with its marker. */}
              <div className="flex flex-col items-center">
                <Rail into={i > 0 ? state : undefined} />
                <StopMarker state={state} number={i + 1} />
                <Rail into={states[i + 1]} />
              </div>
              <div className="min-w-0 py-2 md:py-2.5">
                {state.status === 'soon' ? (
                  <SoonStop state={state} />
                ) : (
                  <OpenStop state={state} current={state === current} />
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
