import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import {
  GlobeCdn,
  type GlobeArc,
  type GlobeMarker,
} from '@/components/ui/cobe-globe-cdn';
import { cn } from '@/components/utilities';
import type { SceneProps } from './sceneTypes';

// Neutral markers/arcs (cobe RGB 0–1): color here would read as a key center.
const GREY: [number, number, number] = [0.8, 0.8, 0.82];
const LIGHT: [number, number, number] = [1, 1, 1];

const NEW_ORLEANS: [number, number] = [29.9511, -90.0715];
const CHICAGO: [number, number] = [41.8781, -87.6298];
const NEW_YORK: [number, number] = [40.7128, -74.006];

const MARKERS: GlobeMarker[] = [
  {
    id: 'tour-nola',
    location: NEW_ORLEANS,
    label: 'New Orleans',
    color: LIGHT,
    size: 0.05,
  },
  {
    id: 'tour-chi',
    location: CHICAGO,
    label: '',
    color: GREY,
    size: 0.035,
  },
  {
    id: 'tour-nyc',
    location: NEW_YORK,
    label: 'New York',
    color: GREY,
    size: 0.035,
  },
];

const ARCS: GlobeArc[] = [
  { from: NEW_ORLEANS, to: CHICAGO, color: GREY },
  { from: NEW_ORLEANS, to: NEW_YORK, color: GREY },
  { from: CHICAGO, to: NEW_YORK, color: LIGHT },
];

const NO_ARCS: GlobeArc[] = [];

/**
 * Globe scene (lazy chunk — pulls in cobe). A small, self-contained version of
 * the Atlas globe: jazz's early route out of New Orleans to Chicago and New
 * York, then a story card. The render loop is paused while the scene is not
 * visible.
 */
const GlobeScene = ({ stepIndex, mode, compact, visible }: SceneProps) => {
  const showArcs = stepIndex >= 1 || mode !== 'auto';
  const showStory = stepIndex >= 2 || mode !== 'auto';
  const arcs = useMemo(() => (showArcs ? ARCS : NO_ARCS), [showArcs]);

  return (
    <div
      className={cn(
        'grid h-full items-center gap-4 p-4 text-white',
        compact ? 'grid-cols-1 grid-rows-[1fr_auto]' : 'grid-cols-[55%_1fr]',
      )}
    >
      <div
        data-tour-target="globe"
        className="relative mx-auto aspect-square h-full max-h-full w-auto max-w-full"
      >
        <GlobeCdn
          markers={MARKERS}
          arcs={arcs}
          arcHeight={0.2}
          speed={mode === 'static' ? 0 : 0.0025}
          paused={!visible}
        />
      </div>

      <AnimatePresence>
        {showStory && (
          <motion.div
            data-tour-target="story"
            initial={mode === 'static' ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
              Pathways
            </span>
            <h4 className="text-lg font-bold leading-snug">
              Jazz takes shape in New Orleans
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" /> Early 1900s
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> New Orleans, USA
              </span>
            </div>
            {!compact && (
              <p className="text-sm leading-relaxed text-white/70">
                Blues, ragtime and brass-band traditions meet in New Orleans —
                and the new sound travels north to Chicago and New York.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {['Jazz', 'Blues', 'Ragtime'].map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/75"
                >
                  {g}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobeScene;
