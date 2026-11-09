import { PROMPT_SURFACE } from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import type { LiteracyChallengeResult } from '@/curriculum/engine/musicLiteracy/grading';
import type { RunSegment } from '@/curriculum/engine/musicLiteracy/run';

// ── The challenge, segment by segment ──────────────────────────────────────
// "Go again and play ALL the notes!": after it, how each part of the run
// went, the words, the call and the answer, as notes hit out of notes
// played; and the challenge's own best, which never holds up the lesson.

const SEGMENT_NAME: Readonly<Record<RunSegment, string>> = {
  words: 'The words',
  call: 'The call',
  response: 'Your answer',
};

const ORDER: readonly RunSegment[] = ['words', 'call', 'response'];

export interface ChallengeSegmentsProps {
  segments: LiteracyChallengeResult['segments'];
  /** The challenge's best before this try, if any. */
  best: number | null;
}

export function ChallengeSegments({ segments, best }: ChallengeSegmentsProps) {
  const shown = ORDER.filter((s) => segments[s].targets > 0);
  return (
    <section
      aria-label="The challenge, part by part"
      data-literacy-challenge-segments
      className={cn(PROMPT_SURFACE, 'flex flex-col gap-3 p-5')}
    >
      <h3 className="text-xs uppercase tracking-[0.14em] text-white/55">
        The challenge
      </h3>
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        {shown.map((segment) => {
          const { targets, hit, extras } = segments[segment];
          return (
            <div key={segment} data-segment={segment} className="flex flex-col">
              <dt className="text-xs uppercase tracking-[0.14em] text-white/45">
                {SEGMENT_NAME[segment]}
              </dt>
              <dd className="text-xl leading-7 text-[#e8e8f0]">
                {hit} of {targets}{' '}
                <span className="text-sm text-white/55">
                  notes
                  {extras > 0 && ` · ${extras} extra`}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-xs text-white/45">
        Just for fun: the challenge never holds up the lesson.
        {best !== null && ` Your best: ${best}%.`}
      </p>
    </section>
  );
}
