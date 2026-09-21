import { ExternalLink, PlayCircle } from 'lucide-react';
import { AtlasVideo } from '@/components/atlas/components/UI/AtlasVideo';
import type { HistoricalEvent } from '@/components/atlas/types';

/**
 * What to search YouTube for when an event has no video: the artist (always
 * `tags[0]` in this dataset) plus the quoted work in the title, if there is one.
 * Mirrors src/scripts/fillMissingGlobeVideos.mjs, which uses the same query to
 * find the videos that ARE attached.
 */
export function youtubeSearchQuery(event: HistoricalEvent): string {
  const work = event.title.match(/[“"]([^”"]{2,60})[”"]/)?.[1];
  const artist = event.tags[0];
  if (artist && work) return `${artist} ${work}`;
  if (artist) return `${artist} ${event.genre[0] ?? ''} music`.trim();
  return event.title;
}

/**
 * The event's video, or — when none is attached — a way to find one.
 *
 * A card that simply has no video reads as a broken link, which is exactly how
 * the influence pills came to feel unreliable. Almost every event carries a
 * video now; the few that do not (regional scenes with no one recording to
 * point at) still offer the viewer a next step instead of a dead end.
 */
export function EventVideo({
  event,
  onPlay,
  className = '',
}: {
  event: HistoricalEvent;
  onPlay?: () => void;
  className?: string;
}) {
  if (event.videoId) {
    return (
      <AtlasVideo
        className={className}
        title={event.title}
        videoId={event.videoId}
        onPlay={onPlay}
      />
    );
  }

  const href = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    youtubeSearchQuery(event),
  )}`;

  return (
    <a
      className={`flex aspect-video flex-col items-center justify-center gap-2 bg-white/5 text-center transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] ${className}`}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      onClick={(e) => e.stopPropagation()}
    >
      <PlayCircle aria-hidden className="size-8 text-white/40" />
      <span className="text-sm text-white/60">No video attached yet</span>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#60a5fa]">
        Find on YouTube
        <ExternalLink aria-hidden className="size-3.5" />
      </span>
    </a>
  );
}
