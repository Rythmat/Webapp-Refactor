/**
 * The Showcase slide's two halves (owner, 2026-11-10): the globe on the left,
 * flying to the subject's place when the slide is shown, and the subject's
 * photo on the right, edge to edge, darkened at its foot for the name and the
 * facts the slide's own elements draw there.
 *
 * Painted by the stage from the slide's visuals, as the accent bar is from its
 * flag (the `halfLeft` / `halfRight` chrome zones), so no teacher moves them.
 * Only on a slide whose preset is `showcase`.
 */
import { Suspense, lazy, useMemo, useState } from 'react';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { getSong } from '@/curriculum/data/songs';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { SLIDE_GRID } from '../slideGrid';
import type { Slide, SlideMedia } from '../types';

const GlobeCdn = lazy(() =>
  import('@/components/ui/cobe-globe-cdn').then((m) => ({
    default: m.GlobeCdn,
  })),
);

/** How long the flight to the subject takes, in ms. */
const FLIGHT_MS = 2200;

const WHITE: [number, number, number] = [1, 1, 1];

export const isShowcaseSlide = (slide: Slide): boolean =>
  slide.presetId === 'showcase';

/** The slide's globe and photo, wherever the two visuals were stored. */
export const showcaseVisuals = (slide: Slide) => {
  const visuals = [
    'media' in slide ? slide.media : undefined,
    'sideMedia' in slide ? slide.sideMedia : undefined,
  ].filter((m): m is SlideMedia => Boolean(m));
  const globe = visuals.find(
    (m): m is Extract<SlideMedia, { type: 'globePreview' }> =>
      m.type === 'globePreview',
  );
  const photo = visuals.find(
    (m): m is Extract<SlideMedia, { type: 'artistImage' }> =>
      m.type === 'artistImage',
  );
  return { globe, photo };
};

/** The globe, flying in from the far side unless the slide is static. */
export const ShowcaseGlobe = ({
  globe,
  fly,
}: {
  globe: Extract<SlideMedia, { type: 'globePreview' }> | undefined;
  /** Fly to the focus (a shown slide); otherwise sit on it, still. */
  fly: boolean;
}) => {
  const focus = globe?.focus ?? globe?.markers?.[0]?.location ?? null;
  const markers = useMemo(
    () =>
      (globe?.markers ?? (focus ? [{ location: focus, size: 0.09 }] : [])).map(
        (m, i) => ({
          id: `showcase-marker-${i}`,
          location: m.location,
          label: '',
          color: WHITE,
          ...(m.size !== undefined ? { size: m.size } : {}),
        }),
      ),
    [globe?.markers, focus],
  );
  const arcs = useMemo(
    () => (globe?.arcs ?? []).map((a) => ({ from: a.from, to: a.to })),
    [globe?.arcs],
  );
  const from: [number, number] | undefined = focus
    ? [0, focus[1] - 150]
    : undefined;
  return (
    <Suspense fallback={null}>
      <GlobeCdn
        fill
        markers={markers}
        // GlobeCdn draws demo arcs when given none; the Showcase has its own.
        arcs={arcs}
        focus={focus}
        {...(from ? { focusFrom: from } : {})}
        focusMs={fly ? FLIGHT_MS : 0}
        speed={focus ? 0 : fly ? 0.003 : 0}
        scale={1.05}
      />
    </Suspense>
  );
};

/** The subject's photo, or its generated avatar when there is none. */
export const ShowcasePhoto = ({
  songId,
  position = 'center',
}: {
  songId: string | undefined;
  /** `top` keeps a tall portrait's face in a wide frame. */
  position?: 'center' | 'top';
}) => {
  const song = songId ? getSong(songId) : undefined;
  const [broken, setBroken] = useState(false);
  const src =
    song?.artistImageRef && song.artistImageSource !== 'none' && !broken
      ? song.artistImageRef
      : null;
  const avatar = useMemo(
    () => defaultAvatarConfig(song?.genreTags[0] ?? song?.artist ?? 'atlas'),
    [song],
  );
  return src ? (
    <img
      src={src}
      alt=""
      draggable={false}
      className={`absolute inset-0 size-full object-cover ${position === 'top' ? 'object-top' : ''}`}
      onError={() => setBroken(true)}
    />
  ) : (
    <HexAvatarSVG
      config={avatar}
      circular={false}
      className="absolute inset-0 size-full opacity-60"
    />
  );
};

const at = (zone: 'halfLeft' | 'halfRight') => {
  const r = SLIDE_GRID[zone].rect;
  return { left: r.x, top: r.y, width: r.w, height: r.h };
};

export const ShowcaseBackdrop = ({
  slide,
  fly,
}: {
  slide: Slide;
  fly: boolean;
}) => {
  const { globe, photo } = showcaseVisuals(slide);
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute overflow-hidden bg-[#0b0b0d]"
        style={at('halfLeft')}
      >
        <ShowcaseGlobe globe={globe} fly={fly} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute overflow-hidden bg-white/[0.03]"
        style={at('halfRight')}
      >
        <ShowcasePhoto songId={photo?.songId} />
        {/* The name and the facts sit over the photo's foot. */}
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      </div>
    </>
  );
};
