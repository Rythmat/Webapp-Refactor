import { ArrowRight } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { ModuleDemo } from '../tour/ModuleDemo';
import type { SceneProps } from '../tour/scenes/sceneTypes';
import { TOUR_BY_ID, type TourScript } from '../tour/tourSteps';
import { Statement } from './Statement';
import type { LandingModule } from './modules';

/** Outlined "See more →" link to a module's page (bento row + module blocks). */
export const SeeMoreLink = ({
  to,
  className,
}: {
  to: string;
  className?: string;
}) => (
  <Link
    to={to}
    className={cn(
      'group inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white',
      className,
    )}
  >
    See more
    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
  </Link>
);

/** Two feature cells in a hairline grid (shared by every module block). */
export const FeatureCells = ({
  features,
}: {
  features: LandingModule['features'];
}) => (
  <div className="grid border-t border-white/[0.08] md:grid-cols-2">
    {features.map((f, i) => (
      <div
        key={f.title}
        className={
          i === 0
            ? 'border-b border-white/[0.08] px-6 py-10 md:border-b-0 md:border-r md:px-10'
            : 'px-6 py-10 md:px-10'
        }
      >
        <h4 className="text-lg font-semibold text-white">{f.title}</h4>
        <p className="mt-1 max-w-[40ch] text-[15px] text-white/50">{f.body}</p>
      </div>
    ))}
  </div>
);

/**
 * A demo section: a two-tone statement (an optional tag above it, `aside` under
 * it), the live guided demo on a raised panel, then optional feature cells.
 * Shared by the landing's module blocks and the /features pages.
 */
export const DemoSection = ({
  id,
  tag,
  statement,
  aside,
  script,
  Scene,
  features,
}: {
  id: string;
  tag?: string;
  statement: { lead: string; rest: string };
  aside?: ReactNode;
  script: TourScript;
  Scene: ComponentType<SceneProps>;
  features?: LandingModule['features'];
}) => (
  <section
    id={id}
    data-module={id}
    aria-labelledby={`${id}-title`}
    className="scroll-mt-16 border-b border-white/[0.08]"
  >
    <div className="flex flex-col gap-6 px-6 pb-14 pt-20 md:px-10 md:pt-28">
      {tag && (
        <span className="w-fit rounded-md bg-white/10 px-2 py-0.5 text-sm font-medium text-white/80">
          {tag}
        </span>
      )}
      <Statement
        id={`${id}-title`}
        lead={statement.lead}
        rest={statement.rest}
      />
      {aside}
    </div>
    <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-10 md:px-10 md:py-14">
      {/* Centered at its max size on full-width pages (no-op in the TOC column). */}
      <ModuleDemo
        tab={script}
        Scene={Scene}
        className="mx-auto w-full max-w-[1150px]"
      />
    </div>
    {features && <FeatureCells features={features} />}
  </section>
);

/** One module's featured block in the landing's TOC flow. */
export const ModuleBlock = ({ module: m }: { module: LandingModule }) => {
  const tab = TOUR_BY_ID[m.id];
  if (!m.Scene) return null;
  return (
    <DemoSection
      id={m.id}
      statement={m.statement}
      aside={<SeeMoreLink to={tab.href} />}
      script={tab}
      Scene={m.Scene}
      features={m.features}
    />
  );
};
