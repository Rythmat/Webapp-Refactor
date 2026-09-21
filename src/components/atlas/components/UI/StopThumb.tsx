import {
  Compass,
  Globe,
  MapPin,
  Mic2,
  Music,
  Route,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import type { AtlasStop } from '@/components/atlas/navigation/atlasStop';
import type { StopPresentation } from '@/components/atlas/navigation/describeStop';

const GLYPHS: Record<AtlasStop['kind'], LucideIcon> = {
  event: Music,
  artist: Mic2,
  place: MapPin,
  search: Search,
  pathway: Route,
  tour: Compass,
  home: Globe,
};

/**
 * A 16:9 tile for a stop: its video thumbnail when it has one, otherwise a
 * glyph on its country colour. Falls back to the glyph if the thumbnail fails
 * to load, rather than leaving a broken-image box in the trail.
 */
export function StopThumb({
  presentation,
  className = '',
}: {
  presentation: StopPresentation;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const Glyph = GLYPHS[presentation.kind];

  if (presentation.thumb && !failed) {
    return (
      <img
        alt=""
        className={`aspect-video w-full rounded object-cover ${className}`}
        loading="lazy"
        src={presentation.thumb}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`flex aspect-video w-full items-center justify-center rounded bg-white/10 ${className}`}
      style={
        presentation.color
          ? { backgroundColor: `${presentation.color}40` }
          : undefined
      }
    >
      {presentation.emoji ? (
        <span className="text-base leading-none">{presentation.emoji}</span>
      ) : (
        <Glyph className="size-4 text-white/70" />
      )}
    </div>
  );
}
