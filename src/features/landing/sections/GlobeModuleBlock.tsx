import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { useNearViewport } from '../motion/useInView';
import { TOUR_BY_ID } from '../tour/tourSteps';
import { useModuleTour } from '../tour/useModuleTour';
import { FeatureCells } from './ModuleBlock';
import { Statement } from './Statement';
import type { LandingModule } from './modules';

// Code-split: the globe pulls in cobe.
const GlobeScene = lazy(() => import('../tour/scenes/GlobeScene'));

const noop = () => {};

/**
 * Globe block (Attio "Signals" layout): tag, two-tone headline, "See more",
 * then an accordion of the demo's steps on the left — the active item shows
 * its description and a progress bar that fills over the step — and the live
 * globe on the right, driven by the same step.
 */
export const GlobeModuleBlock = ({ module: m }: { module: LandingModule }) => {
  const tab = TOUR_BY_ID.globe;
  const ref = useRef<HTMLElement>(null);
  const near = useNearViewport(ref, '600px');
  const tour = useModuleTour(tab, ref);
  const { state } = tour;

  return (
    <section
      ref={ref}
      id={m.id}
      data-module={m.id}
      aria-labelledby="globe-title"
      className="scroll-mt-16 border-b border-white/[0.08]"
    >
      <div className="grid md:grid-cols-2">
        <div className="flex flex-col px-6 py-20 md:border-r md:border-white/[0.08] md:px-10 md:py-28">
          <span className="w-fit rounded-md bg-[#60a5fa]/15 px-2 py-0.5 text-sm font-medium text-[#93c5fd]">
            Globe
          </span>
          <Statement
            id="globe-title"
            lead={m.statement.lead}
            rest={m.statement.rest}
            className="mt-5"
          />
          <Link
            to={tab.href}
            className="group mt-6 inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white"
          >
            See more
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <ol className="mt-auto flex flex-col gap-1 pt-16">
            {tab.steps.map((s, i) => {
              const active = i === state.step;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => tour.selectStep(i)}
                    aria-expanded={active}
                    className={cn(
                      'w-full py-2.5 text-left text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                      active ? 'text-white' : 'text-white/60 hover:text-white',
                    )}
                  >
                    {s.label}
                  </button>
                  <AnimatePresence initial={false}>
                    {active && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[36ch] pb-4 text-[15px] text-white/50">
                          {s.callout}
                        </p>
                        <span className="relative block h-px w-full bg-white/10">
                          <motion.span
                            className="absolute inset-y-0 left-0 w-full origin-left bg-white/70"
                            style={{ scaleX: tour.stepProgress }}
                          />
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="relative h-[520px] md:h-auto md:min-h-[640px]">
          {near && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <GlobeScene
                  stepIndex={state.step}
                  mode={
                    state.status === 'static'
                      ? 'static'
                      : state.status === 'user'
                        ? 'user'
                        : 'auto'
                  }
                  visible={tour.visible}
                  compact
                  onUserAction={noop}
                  playNotes={noop}
                />
              </div>
            </Suspense>
          )}
        </div>
      </div>
      <FeatureCells features={m.features} />
    </section>
  );
};
