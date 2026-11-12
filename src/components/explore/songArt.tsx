import { useState } from 'react';
import { ArtCover } from '@/components/art/ArtCover';
import type { Song } from '@/curriculum/types/songLibrary';
import { engineModeName, keyColourOf } from '@/daw/prism-engine/data/keyColour';

/** A song's key centre's colour (24k Magic, F minor: A♭'s), as the app gives
 *  keys everywhere. */
export const songKeyColour = (song: Song) =>
  keyColourOf(song.keyRoot, engineModeName(song.mode) ?? 'ionian');

/** The artist's photo, or the song's own art where there's none. */
export function SongThumb({ song }: { song: Song }) {
  const [broken, setBroken] = useState(false);
  const photo =
    song.artistImageSource !== 'none' && song.artistImageRef && !broken
      ? song.artistImageRef
      : null;
  return photo ? (
    <img
      src={photo}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="size-full object-cover"
    />
  ) : (
    <ArtCover
      seed={`song:${song.id}`}
      aspect={1}
      motion="none"
      density="thumb"
    />
  );
}
