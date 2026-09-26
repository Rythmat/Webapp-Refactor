import { Check, Flame, Presentation, Trophy, Users, Wifi } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getScaleSpellings } from '@prism/engine';
import { cn } from '@/components/utilities';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { keyCenterColor, majorScale } from '../../music';
import type { SceneProps } from './sceneTypes';

/** Lesson key: G major (key-center color = G's vermillion; whole scale one color). */
const G = 7;
const STUDENTS = [
  { name: 'Student A', xp: 340, streak: 6 },
  { name: 'Student B', xp: 290, streak: 4 },
  { name: 'Student C', xp: 410, streak: 9 },
];
const SLIDES = 4;

/** A lesson slide: the G major scale, highlighted up to `upTo` notes. */
const Slide = ({ upTo, small }: { upTo: number; small?: boolean }) => {
  const color = keyCenterColor(G);
  const spellings = useMemo(() => getScaleSpellings(G, 'ionian'), []);
  const notes = [...majorScale(G), G];
  return (
    <div className={cn('flex flex-col', small ? 'gap-1.5' : 'gap-4')}>
      {!small && (
        <span className="text-lg font-bold text-white">The G major scale</span>
      )}
      <div className={cn('flex', small ? 'gap-0.5' : 'gap-1.5')}>
        {notes.map((pc, i) => (
          <span
            key={i}
            className={cn(
              'flex flex-1 items-center justify-center rounded-md font-semibold transition-colors duration-300',
              small ? 'h-5 text-[9px]' : 'h-12 text-sm',
              i <= upTo ? 'text-[#101012]' : 'bg-white/[0.06] text-white/50',
            )}
            style={i <= upTo ? { background: color } : undefined}
          >
            {displayAccidentals(spellings.get(pc) ?? '')}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Teach scene — a live classroom: join code, a projector slide that every
 * student device mirrors in sync, then per-student XP and streaks. Claims
 * match the For Teachers page (realtime sessions, rosters & join codes, XP and
 * streaks).
 */
export const TeachScene = ({
  stepIndex,
  mode,
  compact,
  visible,
}: SceneProps) => {
  const [joined, setJoined] = useState(0);
  const [slide, setSlide] = useState(0);
  const auto = mode === 'auto';

  // Step 1: students join one by one.
  useEffect(() => {
    if (!auto || stepIndex !== 0) {
      setJoined(STUDENTS.length);
      return;
    }
    setJoined(0);
    if (!visible) return;
    const id = window.setInterval(
      () => setJoined((j) => Math.min(STUDENTS.length, j + 1)),
      800,
    );
    return () => window.clearInterval(id);
  }, [auto, stepIndex, visible]);

  // Step 2: the projector advances; devices follow.
  useEffect(() => {
    if (!auto || stepIndex !== 1) {
      setSlide(stepIndex > 1 || !auto ? 7 : 0);
      return;
    }
    setSlide(0);
    if (!visible) return;
    const id = window.setInterval(() => setSlide((s) => (s + 1) % 8), 420);
    return () => window.clearInterval(id);
  }, [auto, stepIndex, visible]);

  const showProgress = stepIndex >= 2 || !auto;
  const slideNo = Math.min(SLIDES, Math.floor(slide / 2) + 1);

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-white">
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1.5 font-semibold">
          <Users className="size-3.5 text-white/70" />
          My class
        </span>
        <span
          data-tour-target="code"
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-semibold tracking-wider transition-shadow duration-500',
            stepIndex === 0 && auto
              ? 'border-white/50 shadow-[0_0_0_4px_rgba(255,255,255,0.12)]'
              : 'border-white/10',
          )}
        >
          Join code · 4F7K2
        </span>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white">
          <Wifi className="size-3.5" /> Live
        </span>
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1 gap-3',
          compact ? 'grid-rows-[auto_1fr]' : 'grid-cols-[1.35fr_1fr]',
        )}
      >
        {/* Projector */}
        <div
          data-tour-target="projector"
          className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
        >
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Presentation className="size-4 text-white/70" />
            Projector
            <span className="ml-auto">
              Slide {slideNo} / {SLIDES}
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <Slide upTo={slide} />
          </div>
        </div>

        {/* Student devices */}
        <div data-tour-target="students" className="flex flex-col gap-2">
          {STUDENTS.map((s, i) => {
            const isJoined = i < joined;
            return (
              <div
                key={s.name}
                className={cn(
                  'flex flex-1 flex-col gap-2 rounded-xl border p-3 transition-all duration-500',
                  isJoined
                    ? 'border-white/10 bg-white/[0.03]'
                    : 'border-dashed border-white/10 opacity-40',
                )}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold">{s.name}</span>
                  {isJoined && (
                    <span className="flex items-center gap-1 text-white/60">
                      <Check className="size-3" /> Joined
                    </span>
                  )}
                  {showProgress && isJoined && (
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="flex items-center gap-0.5 rounded-full bg-white/[0.06] px-1.5 py-0.5">
                        <Flame className="size-3 text-white/80" />
                        {s.streak}
                      </span>
                      <span className="flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-white">
                        <Trophy className="size-3" />
                        {s.xp} XP
                      </span>
                    </span>
                  )}
                </div>
                {isJoined && <Slide upTo={slide} small />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
