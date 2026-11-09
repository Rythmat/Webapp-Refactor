import { useState } from 'react';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { cn } from '@/components/utilities';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import type { SearchResult } from './types';

/**
 * Row thumbnail. Prefers an image (artist portrait, learn hex tile, or globe
 * video still), falls back to a generative HexAvatar (songs/artists), then to
 * the category icon. `square` drops the shapes and fills: every thumb a
 * plain square, the whole image shown on a transparent ground (Home's
 * search list, owner 2026-10-24).
 */
export function ResultThumb({
  result,
  size = 48,
  square = false,
}: {
  result: SearchResult;
  /** Its edge in CSS px. */
  size?: number;
  /** Square and unfilled, never cropped to a circle (see above). */
  square?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const thumb = result.thumb;

  if (thumb?.src && !broken) {
    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden',
          !square && thumb.shape === 'circle' && 'rounded-full bg-white/[0.04]',
          !square && thumb.shape === 'rounded' && 'rounded-lg bg-white/[0.04]',
        )}
        style={{ width: size, height: size }}
      >
        <img
          src={thumb.src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className={cn(
            'h-full w-full',
            square || thumb.shape === 'hex' ? 'object-contain' : 'object-cover',
          )}
        />
      </div>
    );
  }

  if (thumb?.avatarSeed) {
    return (
      <HexAvatarSVG
        config={defaultAvatarConfig(thumb.avatarSeed)}
        size={size}
        circular={!square}
        className={cn('shrink-0', !square && 'rounded-full')}
      />
    );
  }

  const RowIcon = result.icon;
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        !square && 'rounded-lg bg-white/[0.05]',
      )}
      style={{ width: size, height: size }}
    >
      <RowIcon className="h-5 w-5 text-white/55" />
    </div>
  );
}
