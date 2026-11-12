import { useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SpectrumRim } from '@/components/art/light/SpectrumLight';
import { MicroLabel, microLabel } from '@/components/kit/MicroLabel';
import {
  GoButton,
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { ProfileRoutes } from '@/constants/routes';
import { FOCUS_RING } from '@/daw/ui/styles';
import { useInView } from '@/features/landing/motion/useInView';
import { topicTitle } from '@/features/learn/catalog/learnCatalog';
import type { Lead } from '@/features/learn/dashboard/recommend';
import type { LearnLevel } from '@/features/learn/profile/learnProfile';
import { CourseCover } from '../cover/CourseCover';

const START_WHY: Readonly<Record<LearnLevel, string>> = {
  new: 'A good first step if you’re new to it.',
  basics: 'Build on the basics you already have.',
  comfortable: 'Something to stretch what you can already play.',
  advanced: 'Deeper material for where you are now.',
};

/**
 * The dashboard's one thing to do first (Duolingo's path, Fender Play's "Up
 * Next"): the course they were last in and its next stop, or where to begin.
 * One Go pill; it opens the stop itself, so a resume is one press.
 */
export function ContinueHero({
  lead,
  level,
  className,
}: {
  lead: Lead;
  level: LearnLevel | null | undefined;
  className?: string;
}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { threshold: 0.4 });
  const [runs, setRuns] = useState(0);
  useEffect(() => {
    if (inView) setRuns((n) => (n === 0 ? 1 : n));
  }, [inView]);

  const { course, kind } = lead;
  const next = course.next;
  const resuming = kind === 'continue';
  const locked = Boolean(next?.locked);
  const target = locked ? ProfileRoutes.plan() : (next?.route ?? course.route);
  const go = () => navigate(target);
  const section =
    course.kind === 'genre'
      ? 'Genre'
      : course.kind === 'theory'
        ? 'Theory'
        : course.kind === 'technique'
          ? 'Technique'
          : 'Course';

  return (
    <section
      ref={ref}
      aria-label={resuming ? `Continue ${course.title}` : 'Start here'}
      data-learn-home="continue"
      className={cn(
        PROMPT_FRAME,
        PROMPT_WASH,
        'art-host @container isolate flex min-h-[15rem] overflow-hidden',
        className,
      )}
      style={{ '--home-glow-a': course.accent } as React.CSSProperties}
    >
      <SpectrumRim state="on" edge="bottom" />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <MicroLabel>
            {microLabel(
              resuming ? 'Continue' : 'Start here',
              topicTitle(course.topic),
              section,
            )}
          </MicroLabel>
          <h2 className="text-balance text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.05] text-daw-text">
            {course.title}
          </h2>
          {resuming && next ? (
            <p className="text-[0.9375rem] text-daw-text-3">
              Next: <span className="text-daw-text">{next.title}</span>
            </p>
          ) : (
            <p className="max-w-[44ch] text-[0.9375rem] text-daw-text-3">
              {START_WHY[level ?? 'new']}
              {next ? ` Begin with ${next.title}.` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {resuming && next && next.total > 0 && (
            <div className="flex max-w-[22rem] items-center gap-3">
              <span className="block h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-white/80"
                  style={{
                    width: `${Math.max(3, course.percent)}%`,
                  }}
                />
              </span>
              <span className="shrink-0 text-[0.8125rem] text-daw-text-3">
                {next.done} of {next.total}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <GoButton
              type="button"
              disabled={false}
              sweep={runs}
              reduce={reduce}
              icon={<ArrowRight className="size-4" />}
              onClick={go}
            >
              {locked ? 'Unlock' : resuming ? 'Continue' : 'Start'}
            </GoButton>
            <Link
              to={course.route}
              className={cn(
                'rounded-full px-3 py-1.5 text-[0.875rem] text-daw-text-3 hover:text-daw-text',
                FOCUS_RING,
              )}
            >
              See the course
            </Link>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="hidden w-[38%] max-w-[17rem] shrink-0 items-center p-6 pl-0 @[34rem]:flex"
      >
        <CourseCover
          cover={course.cover}
          detail="hero"
          stack={false}
          className="aspect-square w-full"
        />
      </div>
    </section>
  );
}
