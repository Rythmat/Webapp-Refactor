import {
  ChevronDown,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SkipForward,
  Swords,
  Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { BossHealthBar } from '@/components/Games/Echo/EchoBoss';
import { placeCall } from '@/components/Games/Echo/echoRunCues';
import {
  useClockRun,
  type ClockRun,
} from '@/components/Games/Echo/useClockRun';
import '@/components/Games/Echo/echoGame.css';
import { cn } from '@/components/utilities';
import { LITERACY_TONICS } from '@/content/musicLiteracy/schemas';
import {
  ECHO_LEVEL_NUMBERS,
  ECHO_TEMPO_STEP,
  echoTempoRange,
  echoTimeline,
  fromEchoCallWire,
  melodyPads,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import { SegmentedControl } from '@/curriculum/guitar/layout/settingsControls';
import { toLocalTime } from '../live/serverClock';
import type { PresenceStateValue } from '../live/sessionsStore';
import type { SessionClock } from '../live/useServerClock';
import type { Interaction, InteractionResponsePayload } from '../types';
import { EchoClassCallPanel } from './EchoClassCallPanel';
import { EchoMarkIcon } from './EchoMarkIcon';
import { EchoTeacherSettingsSheet } from './EchoTeacherSettingsSheet';
import {
  bossHealth,
  classResultLine,
  missedNoteLine,
  type EchoGridRow,
  type EchoRosterEntry,
} from './classRound';
import {
  DEFAULT_ECHO_INTERACTION,
  type EchoClassSection,
  type SessionEcho,
} from './types';
import {
  useEchoClassTeacher,
  type EchoTeacherPhase,
} from './useEchoClassTeacher';

// ── The teacher's screen in a class's Echo ─────────────────────────────────
// docs/echo-classroom.md, The Teacher's Screen (connected), Atlas leading:
//
//   the strip   Start, Pause and Play, Next Round, Again; the leader
//               switch (I Lead comes with step 3); Melody, Chords or the
//               Boss; the level, the key and the tempo; who's joined;
//               Teacher Settings
//   the round   the circle as the class sees it, silent, and the class's
//               result after each round ("21 of 24 echoed it!")
//   the grid    a row per student, a column per round: ✓ ✗ – ○, then
//               their percentage and best streak. A row opens their last
//               answer: what Atlas asked, what they played, note by note
//
// The rounds themselves run in useEchoClassTeacher.ts.

const SECTIONS = [
  { value: 'melodyEcho', label: 'Melody' },
  { value: 'chordEcho', label: 'Chords' },
  { value: 'boss', label: 'Boss' },
] as const;

const MODES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
] as const;

const PHASE_LINE: Record<EchoTeacherPhase, string> = {
  idle: 'Press Start when the class has joined.',
  playing: 'The class is playing…',
  result: 'The next round is coming.',
  paused: 'Paused. Press Play to hear the call again.',
  done: 'That’s the section’s rounds! Pick what’s next, or keep going.',
  won: 'The class beat the Echo Boss!',
  lost: 'The Echo Boss wins this time. Fight again?',
};

export interface EchoTeacherPanelProps {
  sessionId: string;
  classroomId: string;
  slideId: string;
  interaction: Interaction;
  /** `SessionState.echo`. */
  echo: SessionEcho | null | undefined;
  responses: Readonly<
    Record<string, Readonly<Record<string, InteractionResponsePayload>>>
  >;
  roster: readonly EchoRosterEntry[];
  presence?: Readonly<Record<string, PresenceStateValue>>;
  clock: SessionClock;
  sendEcho: (echo: SessionEcho | null) => void;
}

/** The teacher's Echo panel (above). */
export function EchoTeacherPanel({
  sessionId,
  classroomId,
  slideId,
  interaction,
  echo: published,
  responses,
  roster,
  presence,
  clock,
  sendEcho,
}: EchoTeacherPanelProps) {
  const config = interaction.echo ?? DEFAULT_ECHO_INTERACTION;
  const teacher = useEchoClassTeacher({
    sessionId,
    classroomId,
    slideId,
    interactionId: interaction.id,
    config,
    echo: published,
    responses,
    roster,
    presence,
    serverNow: clock.serverNow,
    sendEcho,
  });
  const { echo, phase, stage, setStage, settings } = teacher;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const keyColor = useMemo(() => melodyPads(stage.key).keyColor, [stage.key]);

  // The round as the class sees it, read off the clock.
  const run = echo?.run ?? 0;
  const clockRun = useMemo<ClockRun | null>(() => {
    const call = fromEchoCallWire(echo?.call);
    if (!call || !echo || echo.paused) return null;
    return {
      calls: [placeCall(call, echoTimeline(call, { tempo: echo.tempo }))],
      startsAt: toLocalTime(echo.startsAt, clock.offsetMs),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, echo?.startsAt, echo?.paused, clock.offsetMs]);
  const { view, running } = useClockRun(clockRun);

  const range = echoTempoRange(stage.level);
  const result = teacher.classResult;
  const boss = echo?.section === 'boss' ? echo.classResult?.boss : undefined;
  const playing = phase === 'playing';
  const decided = phase === 'won' || phase === 'lost';

  return (
    <section
      aria-label="Echo (class)"
      data-echo-teacher
      data-echo-phase={phase}
      data-echo-run={run}
      className="echo-class flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#101012] p-4 text-[#e8e8f0]"
    >
      {/* ── The strip ── */}
      <div
        role="toolbar"
        aria-label="Echo controls"
        className="flex flex-wrap items-center gap-2"
      >
        {phase === 'idle' ? (
          <StripButton
            primary
            keyColor={keyColor}
            onClick={teacher.start}
            data="start"
          >
            <Play aria-hidden className="size-4" />
            Start
          </StripButton>
        ) : phase === 'paused' ? (
          <StripButton
            primary
            keyColor={keyColor}
            onClick={teacher.play}
            data="play"
          >
            <Play aria-hidden className="size-4" />
            Play
          </StripButton>
        ) : decided ? null : (
          <StripButton onClick={teacher.pause} data="pause">
            <Pause aria-hidden className="size-4" />
            Pause
          </StripButton>
        )}
        {decided ? (
          <StripButton
            primary
            keyColor={keyColor}
            onClick={teacher.fightAgain}
            data="fight-again"
          >
            <Swords aria-hidden className="size-4" />
            Fight Again
          </StripButton>
        ) : (
          <StripButton
            onClick={teacher.nextRound}
            disabled={phase === 'idle'}
            data="next"
          >
            <SkipForward aria-hidden className="size-4" />
            Next Round
          </StripButton>
        )}
        <StripButton
          onClick={teacher.again}
          disabled={phase === 'idle'}
          data="again"
        >
          <RotateCcw aria-hidden className="size-4" />
          Again
        </StripButton>

        <div
          role="group"
          aria-label="Who leads"
          className="ml-2 inline-flex items-center gap-0.5 rounded-full border border-white/10 p-0.5 text-sm"
        >
          <button
            type="button"
            aria-pressed
            className="h-9 rounded-full bg-white px-3 text-[#101012]"
          >
            Atlas Leads
          </button>
          <button
            type="button"
            aria-pressed={false}
            disabled
            title="Coming next: lead the class from your keyboard."
            className="h-9 cursor-not-allowed rounded-full px-3 text-white/35"
          >
            I Lead
          </button>
        </div>

        <span
          className="ml-auto inline-flex items-center gap-1.5 text-sm tabular-nums text-white/65"
          data-echo-joined={teacher.joined}
        >
          <Users aria-hidden className="size-4" />
          Students joined: {teacher.joined} of{' '}
          {Math.max(teacher.rosterCount, teacher.joined)}
        </span>
        <StripButton
          onClick={() => setSettingsOpen(true)}
          data="settings"
          label="Teacher Settings"
        >
          <Settings2 aria-hidden className="size-4" />
          Settings
        </StripButton>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <SegmentedControl<EchoClassSection>
          label="What Atlas plays"
          options={SECTIONS}
          value={stage.section}
          onChange={(section) => setStage({ section })}
        />
        <LabeledSelect
          label="Level"
          value={String(stage.level)}
          options={ECHO_LEVEL_NUMBERS.map((l) => ({
            value: String(l),
            label: `Level ${l}`,
          }))}
          onChange={(v) => setStage({ level: Number(v) as EchoLevelNumber })}
        />
        <LabeledSelect
          label="Key"
          value={stage.key.tonic}
          options={LITERACY_TONICS.map((t) => ({ value: t, label: t }))}
          onChange={(tonic) =>
            setStage({
              key: { ...stage.key, tonic: tonic as typeof stage.key.tonic },
            })
          }
        />
        <SegmentedControl<'major' | 'minor'>
          label="Major or minor"
          options={MODES}
          value={stage.key.mode}
          onChange={(mode) => setStage({ key: { ...stage.key, mode } })}
        />
        <div
          role="group"
          aria-label="Tempo"
          className="inline-flex items-center gap-1 text-sm"
        >
          <IconButton
            label="Slower"
            disabled={stage.tempo <= range.low}
            onClick={() => setStage({ tempo: stage.tempo - ECHO_TEMPO_STEP })}
          >
            <Minus aria-hidden className="size-4" />
          </IconButton>
          <span
            className="w-20 text-center tabular-nums"
            aria-live="polite"
            data-echo-teacher-tempo={stage.tempo}
          >
            {stage.tempo} BPM
          </span>
          <IconButton
            label="Faster"
            disabled={stage.tempo >= range.high}
            onClick={() => setStage({ tempo: stage.tempo + ECHO_TEMPO_STEP })}
          >
            <Plus aria-hidden className="size-4" />
          </IconButton>
        </div>
        {playing && (
          <span className="text-xs text-white/45">
            Changes play from the next round.
          </span>
        )}
      </div>

      {/* ── The round and the grid ── */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <div className="grid h-[380px]">
            <EchoClassCallPanel
              classKey={echo?.key ?? stage.key}
              placed={clockRun?.calls[0] ?? null}
              view={view}
              running={running}
              idle={echo?.call ? 'Echo' : 'Ready'}
              lights={settings.lights === 'pads'}
            />
          </div>
          {boss && (
            <div className="flex justify-center">
              <BossHealthBar health={bossHealth(boss)} color={keyColor} />
            </div>
          )}
          <div
            role="status"
            aria-live="polite"
            data-echo-teacher-result={result ? result.good : undefined}
            className="flex min-h-[3.5em] flex-col items-center gap-1 text-center"
          >
            {result && (
              <span className="echo-pop text-2xl font-semibold">
                {classResultLine(result)}
              </span>
            )}
            {result && teacher.missed.length > 0 && (
              <span data-echo-missed-most className="text-sm text-white/65">
                Missed most: {teacher.missed.map(missedNoteLine).join(' · ')}
              </span>
            )}
            <span className="text-sm text-white/55">
              {phase === 'playing' && run > 0
                ? `Round ${run}${
                    echo?.section !== 'boss'
                      ? ` · ${Math.min(
                          teacher.roundInSection + 1,
                          teacher.sectionRounds,
                        )} of ${teacher.sectionRounds}`
                      : ` · Boss call ${(echo?.bossAt ?? 0) + 1}`
                  }`
                : PHASE_LINE[phase]}
            </span>
          </div>
        </div>

        <EchoGrid rows={teacher.grid} runs={teacher.runs} keyColor={keyColor} />
      </div>

      <EchoTeacherSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onChange={teacher.updateSettings}
      />
    </section>
  );
}

// ── The live grid ──────────────────────────────────────────────────────────

/** The rounds the grid shows, the latest. */
const GRID_ROUNDS = 12;

function EchoGrid({
  rows,
  runs,
  keyColor,
}: {
  rows: readonly EchoGridRow[];
  runs: readonly number[];
  keyColor: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const from = Math.max(0, runs.length - GRID_ROUNDS);
  const shown = runs.slice(from);
  if (rows.length === 0) {
    return (
      <p className="self-center text-sm text-white/50">
        No students yet. They join from the class code.
      </p>
    );
  }
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-1 text-sm">
        <caption className="sr-only">
          Each student’s echoes, round by round
        </caption>
        <thead>
          <tr className="text-xs uppercase tracking-widest text-white/45">
            <th scope="col" className="px-2 text-left font-normal">
              Student
            </th>
            {shown.map((run) => (
              <th
                key={run}
                scope="col"
                className="w-7 font-normal tabular-nums"
              >
                {run}
              </th>
            ))}
            <th scope="col" className="px-2 text-right font-normal">
              %
            </th>
            <th scope="col" className="px-2 text-right font-normal">
              Best
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = open === row.enrollmentId;
            return (
              <GridRow
                key={row.enrollmentId}
                row={row}
                marks={row.marks.slice(from)}
                columns={shown.length}
                keyColor={keyColor}
                open={isOpen}
                onToggle={() => setOpen(isOpen ? null : row.enrollmentId)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GridRow({
  row,
  marks,
  columns,
  keyColor,
  open,
  onToggle,
}: {
  row: EchoGridRow;
  marks: EchoGridRow['marks'];
  columns: number;
  keyColor: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        data-echo-grid-row={row.enrollmentId}
        className={cn('bg-white/[0.03]', !row.joined && 'opacity-60')}
      >
        <th
          scope="row"
          className="rounded-l-lg px-2 py-1 text-left font-normal"
        >
          <button
            type="button"
            onClick={onToggle}
            disabled={!row.last}
            aria-expanded={open}
            className="inline-flex max-w-48 items-center gap-1 truncate rounded text-left hover:text-white disabled:cursor-default"
          >
            {row.last && (
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-3.5 shrink-0 transition-transform',
                  open && 'rotate-180',
                )}
              />
            )}
            <span className="truncate">{row.displayName}</span>
          </button>
        </th>
        {marks.map((mark, i) => (
          <td key={i} className="text-center">
            <EchoMarkIcon mark={mark} keyColor={keyColor} />
          </td>
        ))}
        <td className="px-2 text-right tabular-nums" data-echo-grid-percent>
          {row.percent}%
        </td>
        <td className="rounded-r-lg px-2 text-right tabular-nums">
          {row.bestStreak}
        </td>
      </tr>
      {open && row.last && (
        <tr>
          <td colSpan={columns + 3} className="px-2 pb-2">
            <LastAnswer round={row.last} keyColor={keyColor} />
          </td>
        </tr>
      )}
    </>
  );
}

/** A student's last answer: what Atlas asked and what they played, note by note. */
function LastAnswer({
  round,
  keyColor,
}: {
  round: NonNullable<EchoGridRow['last']>;
  keyColor: string;
}) {
  const timing = (ms: number | null | undefined) =>
    ms === null || ms === undefined
      ? 'missed'
      : Math.abs(ms) < 30
        ? 'on time'
        : ms < 0
          ? `${-ms} ms early`
          : `${ms} ms late`;
  return (
    <div
      data-echo-last-answer
      className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#151518] p-3"
    >
      <span className="text-xs uppercase tracking-[0.12em] text-white/45">
        Round {round.run} · {round.passed ? 'Good echo' : 'Missed'} ·{' '}
        {round.score}%
      </span>
      <ol className="flex flex-wrap gap-2">
        {round.asked.map((label, i) => {
          const ms = round.timing?.[i];
          const hit = ms !== null && ms !== undefined;
          return (
            <li
              key={i}
              className="flex flex-col items-center rounded-md border border-white/10 px-2 py-1"
            >
              <span
                className="text-base font-semibold"
                style={{ color: hit ? keyColor : '#9a9aa6' }}
              >
                {label}
              </span>
              <span className="text-[11px] text-white/55">
                {round.timing ? timing(ms) : ''}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="text-sm text-white/65">
        Played: {round.played.length ? round.played.join(' · ') : 'no notes'}
      </span>
    </div>
  );
}

// ── Small controls ─────────────────────────────────────────────────────────

function StripButton({
  children,
  onClick,
  disabled = false,
  primary = false,
  keyColor,
  data,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  keyColor?: string;
  /** Its data-echo-control, for the browser tests. */
  data: string;
  /** Its spoken name, when the text is short. */
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-echo-control={data}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40',
        primary
          ? 'text-[#101012]'
          : 'border border-white/15 bg-white/[0.04] text-[#e8e8f0] hover:border-white/30',
      )}
      style={primary && keyColor ? { backgroundColor: keyColor } : undefined}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white/80 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-white/60">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-full border border-white/15 bg-[#1a1a1c] px-3 text-sm text-[#e8e8f0] focus:border-white/40 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
