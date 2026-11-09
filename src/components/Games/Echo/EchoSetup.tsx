import {
  Lock,
  Play,
  Presentation,
  Trophy,
  User,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import type {
  LiteracyMode,
  LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import {
  ECHO_LEVEL_NUMBERS,
  type EchoLevelNumber,
} from '@/curriculum/engine/echo';
import { circleOfFifths } from '@/curriculum/engine/musicLiteracy/choices';
import { colorKeyOf, keyName } from '@/curriculum/musicLiteracy/ChooseKeyPanel';
import {
  KeyRing,
  ringPosition,
  type RingSlice,
} from '@/curriculum/musicLiteracy/KeyRing';
import { useElementSize } from '@/hooks/useElementSize';
import type { EchoAudience, EchoLeader } from './echoFlow';
import {
  highScoreOf,
  levelOpen,
  type EchoKeyChoice,
  type EchoProgress,
} from './echoProgress';
import type { EchoInputMode } from './echoSettings';

// ── Setup: a color, major or minor, a level ────────────────────────────────
// Music Literacy's chooser, in a row: the big circle of key colors (Part 2's
// KeyRing), its note the student's 1; Major or Minor, each in the color it
// wears (a minor key takes its relative major's); then the three levels,
// in order, a lock on each not yet reached, each with its High Score (the
// best streak there). Start plays Melody Echo.
//
// A teacher sees one more choice, Who's Playing?: Just Me, or My Class, to
// present Echo on the big screen (docs/echo-classroom.md, Presenter mode).
// Presenting opens every level, and asks who leads the calls: Atlas, or
// the teacher.

const MODES: readonly LiteracyMode[] = ['major', 'minor'];

/** What each level brings, in a line. */
export const LEVEL_BLURB: Readonly<Record<EchoLevelNumber, string>> = {
  1: 'Short tunes that start on the 1.',
  2: 'New starting notes and quicker rhythms.',
  3: 'Trickier rhythms and the longest songs.',
};

export interface EchoSetupProps {
  progress: EchoProgress;
  initialLevel: EchoLevelNumber;
  initialKey: EchoKeyChoice;
  /** Pads or Keyboard, as the level would play (Game Settings). */
  inputFor: (level: EchoLevelNumber) => EchoInputMode;
  /** A teacher may present to their class. */
  canPresent?: boolean;
  initialAudience?: EchoAudience;
  initialLeader?: EchoLeader;
  onStart: (
    level: EchoLevelNumber,
    key: EchoKeyChoice,
    who: { audience: EchoAudience; leader: EchoLeader },
  ) => void;
}

/** A row of two big choices, one picked. */
function ChoicePair<T extends string>({
  label,
  value,
  options,
  color,
  onChange,
  data,
}: {
  label: string;
  value: T;
  options: { value: T; title: string; line: string; Icon: LucideIcon }[];
  color: string;
  onChange: (value: T) => void;
  data: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs uppercase tracking-[0.14em] text-white/45">
        {label}
      </h3>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-3"
      >
        {options.map(({ value: v, title, line, Icon }) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              {...{ [`data-echo-${data}`]: v }}
              onClick={() => onChange(v)}
              className={cn(
                'flex min-h-14 items-center gap-3 rounded-xl border bg-[#151518] px-4 py-2 text-left transition-colors',
                on
                  ? 'border-transparent'
                  : 'border-white/[0.08] hover:bg-white/[0.06]',
              )}
              style={on ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
            >
              <Icon aria-hidden className="size-5 shrink-0 text-white/70" />
              <span className="flex min-w-0 flex-col">
                <span className="text-base text-[#e8e8f0]">{title}</span>
                <span className="text-xs leading-4 text-white/50">{line}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EchoSetup({
  progress,
  initialLevel,
  initialKey,
  inputFor,
  canPresent = false,
  initialAudience = 'solo',
  initialLeader = 'atlas',
  onStart,
}: EchoSetupProps) {
  const [audience, setAudience] = useState<EchoAudience>(
    canPresent ? initialAudience : 'solo',
  );
  const [leader, setLeader] = useState<EchoLeader>(initialLeader);
  const presenting = audience === 'class';
  const [tonic, setTonic] = useState<LiteracyTonic>(initialKey.tonic);
  const [mode, setMode] = useState<LiteracyMode>(initialKey.mode);
  const [level, setLevel] = useState<EchoLevelNumber>(
    levelOpen(progress, initialLevel) ? initialLevel : 1,
  );
  // Back to Just Me on a level not yet open: the highest that is.
  const pickAudience = (next: EchoAudience) => {
    setAudience(next);
    if (next === 'solo' && !levelOpen(progress, level)) {
      setLevel(progress.unlocked);
    }
  };
  const ringBox = useRef<HTMLDivElement>(null);
  const box = useElementSize(ringBox);
  const size = Math.max(
    220,
    Math.floor(Math.min(box.width || 420, box.height || 420, 460)),
  );

  const keys = circleOfFifths(mode);
  const chosen = keys.find((k) => k.tonic === tonic) ?? keys[0];
  const slices: RingSlice[] = keys.map((key) => ({
    id: key.tonic,
    position: ringPosition(key.pitchClass),
    color: key.color,
    label: key.label,
    ariaLabel: keyName(key.tonic, mode),
    enabled: true,
    selected: key.tonic === tonic,
  }));
  const input = inputFor(level);

  return (
    <section
      aria-label="Set up Echo"
      data-echo-screen="setup"
      className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-8 overflow-y-auto p-6 max-[899px]:grid-cols-[minmax(0,1fr)] max-[899px]:content-start max-[639px]:p-4"
    >
      <div
        ref={ringBox}
        className="flex h-full min-h-[240px] items-center justify-center max-[899px]:h-[320px]"
      >
        <KeyRing
          slices={slices}
          size={size}
          role="radio"
          ariaLabel="Pick your color"
          onPick={(slice) => setTonic(slice.id as LiteracyTonic)}
          center={
            <>
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                Your 1
              </span>
              <span
                data-echo-chosen-key
                className="font-semibold leading-none"
                style={{ color: chosen.color, fontSize: size * 0.12 }}
              >
                {chosen.label}
              </span>
            </>
          }
        />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[28px] font-normal leading-9 text-[#e8e8f0]">
            Pick Your Color
          </h2>
          <p className="text-[15px] leading-6 text-white/55">
            Every color is a key. Its note is your 1. Atlas plays a tune, and
            you play it back!
          </p>
        </div>

        {canPresent && (
          <ChoicePair<EchoAudience>
            label="Who’s Playing?"
            data="audience"
            value={audience}
            color={chosen.color}
            onChange={pickAudience}
            options={[
              {
                value: 'solo',
                title: 'Just Me',
                line: 'Play on this device.',
                Icon: User,
              },
              {
                value: 'class',
                title: 'My Class',
                line: 'Present on the big screen.',
                Icon: Presentation,
              },
            ]}
          />
        )}
        {presenting && (
          <ChoicePair<EchoLeader>
            label="Who Leads?"
            data="leader-pick"
            value={leader}
            color={chosen.color}
            onChange={setLeader}
            options={[
              {
                value: 'atlas',
                title: 'Atlas Leads',
                line: 'Atlas plays each call.',
                Icon: Users,
              },
              {
                value: 'teacher',
                title: 'I Lead',
                line: 'You play each call. Switch any time.',
                Icon: UserRound,
              },
            ]}
          />
        )}

        <div
          role="radiogroup"
          aria-label="Major or minor"
          className="grid grid-cols-2 gap-3"
        >
          {MODES.map((m) => {
            const color = circleOfFifths(m).find(
              (k) => k.tonic === tonic,
            )!.color;
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                data-echo-mode={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex h-14 items-center gap-3 rounded-xl border bg-[#151518] px-4 text-left transition-colors',
                  on
                    ? 'border-transparent'
                    : 'border-white/[0.08] hover:bg-white/[0.06]',
                )}
                style={on ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
              >
                <span
                  aria-hidden
                  className="size-6 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-base text-[#e8e8f0]">
                    {keyName(tonic, m)}
                  </span>
                  <span className="truncate text-xs text-white/50">
                    {m === 'minor'
                      ? `In ${colorKeyOf(tonic)}’s color`
                      : 'Bright and happy'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs uppercase tracking-[0.14em] text-white/45">
            Level
          </h3>
          <div
            role="radiogroup"
            aria-label="Level"
            className="grid grid-cols-3 gap-3 max-[639px]:grid-cols-1"
          >
            {ECHO_LEVEL_NUMBERS.map((n) => {
              // Presenting, every level is the teacher's to pick.
              const open = presenting || levelOpen(progress, n);
              const on = level === n;
              const best = highScoreOf(progress, n);
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={!open || undefined}
                  disabled={!open}
                  data-echo-level={n}
                  data-locked={!open || undefined}
                  onClick={() => setLevel(n)}
                  className={cn(
                    'flex min-h-[104px] flex-col items-start gap-1 rounded-xl border bg-[#151518] p-3 text-left transition-colors',
                    on
                      ? 'border-transparent'
                      : 'border-white/[0.08] enabled:hover:bg-white/[0.06]',
                    !open && 'cursor-not-allowed opacity-55',
                  )}
                  style={
                    on ? { boxShadow: `0 0 0 2px ${chosen.color}` } : undefined
                  }
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-lg text-[#e8e8f0]">Level {n}</span>
                    {!open && (
                      <Lock
                        aria-label="Locked"
                        className="size-4 text-white/60"
                      />
                    )}
                  </span>
                  <span className="text-xs leading-4 text-white/55">
                    {open
                      ? LEVEL_BLURB[n]
                      : `Finish a Level ${n - 1} song to open it.`}
                  </span>
                  <span
                    data-echo-high-score={best}
                    className="mt-auto flex items-center gap-1 text-xs text-white/60"
                  >
                    <Trophy aria-hidden className="size-3.5" />
                    High Score {best}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-echo-start
            onClick={() =>
              onStart(level, { tonic, mode }, { audience, leader })
            }
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-[#101012] transition-transform hover:scale-105"
          >
            <Play aria-hidden className="size-4" fill="currentColor" />
            {presenting ? 'Present Echo' : 'Play Echo'}
          </button>
          <span className="text-sm text-white/45">
            Playing with {input === 'pads' ? 'pads' : 'the keyboard'}. Change it
            in Game Settings.
          </span>
        </div>
      </div>
    </section>
  );
}
