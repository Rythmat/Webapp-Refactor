/**
 * LessonThumb — the top banner cover on a Lessons-page card. Resolves the
 * `lessonThumbnailSource` descriptor to an image, in precedence order:
 *   1. artist image (the lesson features a song with artwork)
 *   2. globe location polygon (region/city)
 *   3. HexAvatar (a song without artwork — the ArtistImageCard fallback)
 *   4. interactive hex (`HexWaveBackground`) — everything else
 * Degrades gracefully while the song library hydrates (shows the hex, then
 * upgrades to the artist image once `songsReady`).
 */
import type { Feature } from 'geojson';
import { useMemo, useState } from 'react';
import { RegionPolygonThumb } from '@/components/ClassroomLayout/globe/RegionPolygonThumb';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import { HexWaveBackground } from '@/components/ui/hex-wave-background';
import { getSong } from '@/content/songStore';
import { defaultAvatarConfig } from '@/lib/avatarHexGrid';
import { generateStudioTileSvg } from '@/lib/studioProjectTile';
import type { Day } from '../types';
import { lessonThumbnailSource } from './lessonThumbnail';

interface LessonThumbProps {
  day: Day;
  /** Shared country GeoJSON (lifted to PlanPage) for the location polygon. */
  countryFeatures: Feature[] | null;
  /** Whether the song library has hydrated (so `getSong` resolves artwork). */
  songsReady: boolean;
}

export const LessonThumb = ({
  day,
  countryFeatures,
  songsReady,
}: LessonThumbProps) => {
  const [imgBroken, setImgBroken] = useState(false);
  const { songId, location } = lessonThumbnailSource(day);
  const song = songsReady && songId ? getSong(songId) : null;
  const hasArtistImage =
    !!song?.artistImageRef && song.artistImageSource !== 'none' && !imgBroken;
  // Deterministic curated-palette hex per lesson (matches Globe/Arcade cards).
  // Square to match the card's square banner so the hexes stay regular.
  const tile = useMemo(
    () => generateStudioTileSvg(`lesson:${day.id}`, 480, 480),
    [day.id],
  );

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#101012]">
      {hasArtistImage ? (
        <img
          src={song.artistImageRef}
          alt=""
          loading="lazy"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
          onError={() => setImgBroken(true)}
        />
      ) : location ? (
        <RegionPolygonThumb
          features={countryFeatures}
          center={location.center}
          zoom={location.zoom}
        />
      ) : song ? (
        <HexAvatarSVG
          config={defaultAvatarConfig(song.genreTags[0] ?? song.artist)}
          circular={false}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <HexWaveBackground
          src={tile}
          drain={false}
          backgroundColor="#101012"
          colorThreshold={0.05}
          brushRadius={40}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
};
