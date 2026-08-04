/**
 * Renders one `SlideMedia` value:
 *  - `youtube`      → live player (lazy) on interactive surfaces, static
 *                     thumbnail everywhere else (video plays on the projector
 *                     machine only — classroom speakers live there).
 *  - `artistImage`  → rounded portrait card from `song.artistImageRef` with
 *                     the HexAvatar + initials fallback (SongArtwork pattern).
 *  - `globePreview` → lazy GlobeCdn mini-globe using the GlobeSection bleed
 *                     technique (canvas bleeds past its layout square so tall
 *                     arcs aren't clipped).
 *  - `chordChart`   → placeholder card (Phase 2).
 */
import { Suspense, lazy, useMemo, useState } from 'react';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import type { GlobeArc, GlobeMarker } from '@/components/ui/cobe-globe-cdn';
import { getSong } from '@/curriculum/data/songs';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { LocalizedText, StudentLanguage } from '../../types';
import type { SlideMedia } from '../types';
import { PathwayGlobePreview } from './PathwayGlobePreview';
import { ScaleKeyboardCard } from './ScaleKeyboardCard';

const YouTubeSlidePlayer = lazy(() => import('./YouTubeSlidePlayer'));
type MediaSlideCommand = import('./YouTubeSlidePlayer').MediaSlideCommand;
const GlobeCdn = lazy(() =>
  import('@/components/ui/cobe-globe-cdn').then((m) => ({
    default: m.GlobeCdn,
  })),
);

const CHORD_CHART_LABEL: LocalizedText = {
  en: 'Song Chart',
  es: 'Tabla de acordes',
};
const CHORD_CHART_NOTE: LocalizedText = {
  en: 'Coming soon',
  es: 'Próximamente',
};

interface SlideMediaPanelProps {
  media: SlideMedia;
  language: StudentLanguage;
  /**
   * false on student/teacher surfaces — youtube renders a static thumbnail
   * instead of mounting the live IFrame player.
   */
  interactive: boolean;
  className?: string;
  /** Phase 4 — remote play/pause command (projector). */
  command?: MediaSlideCommand;
}

export const SlideMediaPanel = ({
  media,
  language,
  interactive,
  className,
  command,
}: SlideMediaPanelProps) => {
  switch (media.type) {
    case 'youtube':
      if (!interactive) {
        return (
          <div
            className={`relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 ${className ?? ''}`}
          >
            <img
              src={`https://i.ytimg.com/vi/${media.videoId}/mqdefault.jpg`}
              alt=""
              loading="lazy"
              draggable={false}
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        );
      }
      return (
        <Suspense
          fallback={
            <div
              className={`slide-media__skeleton aspect-video w-full rounded-3xl border border-white/10 bg-white/[0.03] ${className ?? ''}`}
            />
          }
        >
          <YouTubeSlidePlayer
            videoId={media.videoId}
            startSec={media.startSec}
            loop={media.loop}
            className={className}
            command={command}
          />
        </Suspense>
      );

    case 'artistImage':
      return <ArtistImageCard songId={media.songId} className={className} />;

    case 'globePreview':
      return (
        <GlobePreviewCard
          markers={media.markers}
          arcs={media.arcs}
          className={className}
        />
      );

    case 'globePathway':
      return (
        <PathwayGlobePreview
          pathwayId={media.pathwayId}
          className={className}
        />
      );

    case 'scaleKeyboard':
      return (
        <ScaleKeyboardCard
          mode={media.mode}
          keyToken={media.key}
          className={className}
        />
      );

    case 'chordChart':
      return (
        <div
          className={`flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] ${className ?? ''}`}
        >
          <p
            className="font-semibold text-white/80"
            style={{ fontSize: 'var(--slide-prompt-fz)' }}
          >
            {pickLocalized(CHORD_CHART_LABEL, language)}
            {secondaryLine(CHORD_CHART_LABEL, language) && (
              <span className="text-white/40">
                {' '}
                · {secondaryLine(CHORD_CHART_LABEL, language)}
              </span>
            )}
          </p>
          <p
            className="text-white/40"
            style={{ fontSize: 'var(--slide-body-fz)' }}
          >
            {pickLocalized(CHORD_CHART_NOTE, language)}
            {secondaryLine(CHORD_CHART_NOTE, language) && (
              <span> · {secondaryLine(CHORD_CHART_NOTE, language)}</span>
            )}
          </p>
        </div>
      );
  }
};

/**
 * Portrait card for a song's artist image — copies SongDetailPage's
 * SongArtwork treatment (image with generated hex-avatar + initials
 * fallback), simplified to a rounded-3xl portrait frame.
 */
const ArtistImageCard = ({
  songId,
  className,
}: {
  songId: string;
  className?: string;
}) => {
  const song = getSong(songId);
  const [imageBroken, setImageBroken] = useState(false);
  const hasArtistImage =
    !!song?.artistImageRef && song.artistImageSource !== 'none' && !imageBroken;

  const avatarConfig = useMemo(
    () =>
      defaultAvatarConfig(song ? (song.genreTags[0] ?? song.artist) : songId),
    [song, songId],
  );

  const initials = useMemo(
    () =>
      (song?.artist ?? songId)
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [song, songId],
  );

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] ${className ?? ''}`}
    >
      {hasArtistImage ? (
        <img
          src={song.artistImageRef}
          alt=""
          loading="lazy"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageBroken(true)}
        />
      ) : (
        <>
          <HexAvatarSVG
            config={avatarConfig}
            circular={false}
            className="absolute left-0 top-0 size-[120%] opacity-60"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="font-bold text-white/20"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
            >
              {initials}
            </span>
          </div>
        </>
      )}
      {song && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
          <p
            className="truncate font-semibold text-white"
            style={{ fontSize: 'var(--slide-body-fz)' }}
          >
            {song.artist}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Mini-globe preview. The outer box reserves the layout square; the inner
 * box bleeds the canvas outward (GlobeSection technique) so tall arcs render
 * past the edge without clipping.
 */
const GlobePreviewCard = ({
  markers,
  arcs,
  className,
}: {
  markers?: Array<{ location: [number, number]; size?: number }>;
  arcs?: Array<{ from: [number, number]; to: [number, number] }>;
  className?: string;
}) => {
  const globeMarkers = useMemo<GlobeMarker[] | undefined>(
    () =>
      markers?.map((m, i) => ({
        id: `slide-marker-${i}`,
        location: m.location,
        label: '',
        ...(m.size != null ? { size: m.size } : {}),
      })),
    [markers],
  );
  const globeArcs = useMemo<GlobeArc[] | undefined>(
    () => arcs?.map((a) => ({ from: a.from, to: a.to })),
    [arcs],
  );

  return (
    <div className={`relative aspect-square w-full ${className ?? ''}`}>
      <div className="absolute inset-[-10%]">
        <Suspense fallback={<div className="size-full" />}>
          <GlobeCdn
            {...(globeMarkers ? { markers: globeMarkers } : {})}
            {...(globeArcs ? { arcs: globeArcs } : {})}
            speed={0.003}
          />
        </Suspense>
      </div>
    </div>
  );
};
