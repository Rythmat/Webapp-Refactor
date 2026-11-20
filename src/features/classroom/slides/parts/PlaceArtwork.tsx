import { FEATURED_GAME, artForGame } from '@/components/Games/arcadeGames';
import { ArtCover } from '@/components/art/ArtCover';
import { AppIcons } from '@/components/icons/appIcons';
import { ProjectMosaic } from '@/features/library/LibraryTiles';
import { ProjectCover } from '@/features/library/player/PlayerParts';
import type { PlaceArt } from '../placeSummaries';
import type { ProjectPlace } from '../projectPlaces';

/**
 * A card's picture on the Independent Project slide (owner, 2026-11-13):
 * the thing the person left off at (the artist, the lesson's tile, the
 * project's cover, the session's, the Globe's event, the game's), drawn as
 * the app draws it elsewhere; with none, the place's own picture (a still
 * from its clip, the featured game's cover for the Arcade).
 */
export const PlaceArtwork = ({
  place,
  art,
}: {
  place: ProjectPlace;
  art: PlaceArt | undefined;
}) => {
  const shown = art ?? placeArt(place);
  switch (shown?.kind) {
    case 'image':
      return (
        <img
          src={shown.src}
          alt=""
          draggable={false}
          className="size-full object-cover"
          style={
            shown.tint
              ? {
                  background: `color-mix(in oklab, ${shown.tint} 28%, #151518)`,
                }
              : undefined
          }
        />
      );
    case 'cover':
      return <ProjectCover seed={shown.seed} />;
    case 'project':
      return <ProjectMosaic entry={shown.entry} />;
    case 'game': {
      const cover = artForGame(shown.game);
      return (
        <ArtCover
          seed={cover.seed}
          kind={cover.kind}
          variant={cover.variant}
          mode={cover.mode}
          palette={cover.palette}
          aspect={1}
          motion="none"
          density="thumb"
          className="size-full"
        />
      );
    }
    case 'tint':
      return (
        <span
          className="block size-full"
          style={{
            background: `color-mix(in oklab, ${shown.color} 28%, #151518)`,
          }}
        />
      );
    default: {
      const Icon = AppIcons[place.id];
      return (
        <span className="flex size-full items-center justify-center bg-white/[0.04] text-white">
          <Icon className="size-[32px]" aria-hidden />
        </span>
      );
    }
  }
};

/** The place's own picture, for a card with nothing of the person's. */
const placeArt = (place: ProjectPlace): PlaceArt | undefined => {
  if (place.clip) return { kind: 'image', src: place.clip.poster };
  if (place.id === 'arcade') return { kind: 'game', game: FEATURED_GAME };
  return undefined;
};
