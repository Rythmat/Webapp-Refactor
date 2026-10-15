import { cn } from '@/components/utilities';
import { KEY_RAINBOW } from '../rainbow';

/** The hero horizon's light streaks: 1px lines 7px apart, fading off the rim. */
const STREAKS = {
  backgroundImage:
    'repeating-linear-gradient(to right, rgba(255,255,255,0.09) 0 1px, transparent 1px 7px)',
  maskImage: 'linear-gradient(to bottom, #000, transparent)',
  WebkitMaskImage: 'linear-gradient(to bottom, #000, transparent)',
};

/**
 * The hero's horizon straightened into a line along the top of its parent:
 * light streaks falling from a crisp rainbow rim, with the rim's bloom half
 * clipped by the top edge (as the arc's is by the frame). Decorative and
 * absolutely positioned, so the parent needs `relative` (and `isolate` to keep
 * it under the content).
 */
export const RainbowHorizon = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cn(
      'pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden',
      className,
    )}
  >
    <div className="absolute inset-0" style={STREAKS} />
    <div
      className="absolute inset-x-0 -top-6 h-12 opacity-55 blur-2xl"
      style={{ backgroundImage: KEY_RAINBOW }}
    />
    <div
      className="absolute inset-x-0 top-0 h-0.5"
      style={{ backgroundImage: KEY_RAINBOW }}
    />
  </div>
);
