import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModuleDemo } from '../tour/ModuleDemo';
import { TOUR_BY_ID } from '../tour/tourSteps';
import { Statement } from './Statement';
import type { LandingModule } from './modules';

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
 * One module's featured block in the TOC flow: a two-tone statement, the live
 * guided demo on a raised panel, and two feature cells.
 */
export const ModuleBlock = ({ module: m }: { module: LandingModule }) => {
  const tab = TOUR_BY_ID[m.id];
  if (!m.Scene) return null;
  return (
    <section
      id={m.id}
      data-module={m.id}
      aria-labelledby={`${m.id}-title`}
      className="scroll-mt-16 border-b border-white/[0.08]"
    >
      <div className="flex flex-col gap-6 px-6 pb-14 pt-20 md:px-10 md:pt-28">
        <Statement
          id={`${m.id}-title`}
          lead={m.statement.lead}
          rest={m.statement.rest}
        />
        <Link
          to={tab.href}
          className="group inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          See more
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-10 md:px-10 md:py-14">
        <ModuleDemo tab={tab} Scene={m.Scene} />
      </div>
      <FeatureCells features={m.features} />
    </section>
  );
};
