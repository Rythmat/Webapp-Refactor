import type { IconBaseProps } from 'react-icons';
import { PiHeartStraightFill, PiHeartStraightLight } from 'react-icons/pi';

/**
 * The app's heart: save, saved, favourites, a game's lives. Phosphor's
 * HeartStraight (owner, 27 Oct 2026, from the save-heart options): straight
 * sides to a sharp point, in the light weight, and solid when `filled`.
 *
 * It replaces lucide's Heart, whose saved state was `fill="currentColor"`
 * on a stroke; this heart is a drawn shape, so saved is its own glyph. Like
 * lucide's it is 24 by 24 unless sized (`size`, or a className such as
 * `size-4`, which wins over the attributes), coloured by `currentColor`.
 */
export function HeartIcon({
  filled = false,
  size = 24,
  ...props
}: IconBaseProps & {
  /** The saved / favourite state: the solid heart. */
  filled?: boolean;
}) {
  const Icon = filled ? PiHeartStraightFill : PiHeartStraightLight;
  // Decorative unless it's given a name, as lucide's are.
  const named = props.title || props['aria-label'];
  return (
    <Icon
      size={size}
      aria-hidden={named ? undefined : true}
      data-heart={filled ? 'filled' : 'outline'}
      {...props}
    />
  );
}
