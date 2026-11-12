import { AnimatePresence, motion } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import {
  ConnectionsCard,
  EraRail,
  EventsCard,
  GLOBE_UI,
  GlobeBottomRail,
  GlobeTopRail,
} from './globe/GlobeChrome';
import { MiniGlobe } from './globe/MiniGlobe';
import { NEW_ORLEANS } from './globe/globeData';
import type { SceneProps } from './sceneTypes';

/** The column is narrow (a phone): one card at a time, under the place. */
const NARROW_BELOW = 560;
/** The flight to New Orleans, before its card comes in. */
const FLIGHT_MS = 1200;
const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Globe scene (lazy chunk — carries the map art): a miniature of today's
 * Globe in its frame — the search pill on top, the data map on its stage
 * with the era rail at the foot, Explore · Connections · Tours below. The
 * tour explores the whole map, picks New Orleans — the map flies in,
 * Louisiana lifts and its events card opens — then follows where its sound
 * came from and went. Every place, count and event is the Atlas's own
 * (`globe/globeData`).
 */
const GlobeScene = ({ stepIndex, mode, visible }: SceneProps) => {
  const still = mode === 'static';
  const picked = stepIndex >= 1;
  const linked = stepIndex >= 2;

  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setNarrow(el.clientWidth < NARROW_BELOW);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showEvents = picked && (!narrow || !linked);
  const showConnections = linked;
  const cardIn = (delay: number) => ({
    initial: still ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
    transition: { duration: 0.45, delay: still ? 0 : delay, ease: EASE },
  });

  return (
    <div
      ref={ref}
      className="flex size-full select-none flex-col overflow-hidden"
      style={{ background: GLOBE_UI.page, color: GLOBE_UI.text }}
    >
      <GlobeTopRail compact={narrow} />
      <div
        className="relative mx-2 min-h-0 flex-1 overflow-hidden rounded-xl"
        style={{ background: GLOBE_UI.panel }}
      >
        <MiniGlobe
          story={NEW_ORLEANS}
          focused={picked}
          links={linked}
          still={still}
          paused={!visible}
          flightMs={FLIGHT_MS}
          focusAt={narrow ? [0.5, 0.32] : [0.52, 0.7]}
          zoom={4}
          placeTarget="place"
        >
          <AnimatePresence>
            {showEvents && (
              <motion.div
                key="events"
                className={cn(
                  'absolute z-20',
                  narrow
                    ? 'inset-x-2 bottom-12'
                    : 'left-2 top-2 w-[min(46%,18rem)]',
                )}
                {...cardIn(FLIGHT_MS / 1000)}
              >
                <EventsCard
                  story={NEW_ORLEANS}
                  title="New Orleans"
                  tiles={narrow ? 1 : 2}
                />
              </motion.div>
            )}
            {showConnections && (
              <motion.div
                key="connections"
                data-tour-target="connections"
                className={cn(
                  'absolute z-20',
                  narrow
                    ? 'inset-x-2 bottom-12'
                    : 'right-2 top-2 w-[min(38%,15rem)]',
                )}
                {...cardIn(0.5)}
              >
                <ConnectionsCard
                  story={NEW_ORLEANS}
                  rows={narrow ? 2 : 3}
                  still={still}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <EraRail story={picked ? NEW_ORLEANS : null} still={still} />
        </MiniGlobe>
      </div>
      <GlobeBottomRail compact={narrow} />
    </div>
  );
};

export default GlobeScene;
