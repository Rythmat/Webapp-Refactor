/* eslint-disable react/jsx-sort-props */
import { Link2, VideoOff } from 'lucide-react';
import { useEffect, useState, type FC, type ReactNode } from 'react';
import { AtlasVideo } from '@/components/atlas/components/UI/AtlasVideo';
import { cn } from '@/components/utilities';

/**
 * The video slot in the visual editors: a link input where the student sees a
 * player, with the real player previewing underneath it.
 *
 * Accepts a full YouTube URL (watch, youtu.be, embed, shorts) or a bare 11-char
 * id, because an author pasting from the address bar should not have to know
 * which of those the schema stores.
 */

const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (ID_PATTERN.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

export const youTubeWatchUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${videoId}`;

export const YouTubeLinkField: FC<{
  /** Current URL or id, as stored. Empty when the item has no video. */
  value: string;
  /** Called with the raw text the author typed; parse it with extractYouTubeId. */
  onChange: (value: string) => void;
  label?: string;
  /** Extra controls beside the input, e.g. a start-offset field. */
  trailing?: ReactNode;
  className?: string;
  previewTitle?: string;
}> = ({
  value,
  onChange,
  label = 'YouTube link',
  trailing,
  className,
  previewTitle = 'Video preview',
}) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const videoId = extractYouTubeId(draft);
  const invalid = draft.trim().length > 0 && !videoId;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="text-[10px] uppercase tracking-wide text-white/30">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
          <input
            aria-label={label}
            placeholder="https://www.youtube.com/watch?v=…"
            className={cn(
              'w-full rounded-lg border bg-black/30 py-1.5 pl-8 pr-2 text-xs text-white/80 outline-none',
              'placeholder:text-white/25 focus:ring-1 focus:ring-[#60a5fa]',
              invalid ? 'border-red-500/50' : 'border-white/10',
            )}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onChange(draft)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChange(draft);
              }
            }}
          />
        </div>
        {trailing}
      </div>

      {invalid && (
        <p className="text-xs text-red-400">
          That doesn’t contain a YouTube video id.
        </p>
      )}

      {videoId ? (
        <AtlasVideo
          key={videoId}
          videoId={videoId}
          title={previewTitle}
          className="rounded-lg border border-white/10 bg-black/40"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/[0.03] text-xs text-white/25">
          <VideoOff className="size-4" />
          No video
        </div>
      )}
    </div>
  );
};
