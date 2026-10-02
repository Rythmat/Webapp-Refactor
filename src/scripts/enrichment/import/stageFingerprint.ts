import type { LibrarySong, RegistryArtist } from './cacheStage';
import { sha256 } from './fileCache';

/**
 * What the cache stage's output was computed from, written into it, so the
 * stages after it can tell a stale `stage-cache.json` from a current one.
 *
 * The fetch plans its queue from that file, and scoring will read its song
 * evidence. A registry artist added since, a song retitled, a fix to the
 * stage's own matching or a refreshed `_mb_cache.json` would otherwise go
 * unnoticed: the file still parses, and says what the old inputs said.
 */

export interface StageFingerprint {
  registryArtists: number;
  songs: number;
  /** Over the registry, the songs, the stage's code and its local inputs. */
  sha256: string;
}

export function fingerprintCacheStage({
  registry,
  songs,
  code,
  inputs,
}: {
  registry: readonly RegistryArtist[];
  songs: readonly LibrarySong[];
  /** The source text of the modules the stage runs. */
  code: readonly string[];
  /** The local-only inputs by content, as the cache manifest keeps them. */
  inputs: Readonly<Record<string, { sha256: string }>>;
}): StageFingerprint {
  // Arrays of fields rather than the objects themselves: the same data must
  // hash the same whatever order its keys were written in.
  const canonical = JSON.stringify({
    registry: registry.map((a) => [a.slug, a.name, a.aliases ?? []]),
    songs: songs.map((s) => [
      s.id,
      s.title,
      s.artist,
      s.year ?? null,
      s.artistGlobeId ?? null,
    ]),
    code: code.map(sha256),
    inputs: Object.keys(inputs)
      .sort()
      .map((name) => [name, inputs[name].sha256]),
  });
  return {
    registryArtists: registry.length,
    songs: songs.length,
    sha256: sha256(canonical),
  };
}

/** Why a stored output no longer matches its inputs, or null when it does. */
export function whyStale(
  stored: StageFingerprint | undefined,
  current: StageFingerprint,
): string | null {
  if (!stored) {
    return 'it was written before stage outputs carried a fingerprint';
  }
  if (stored.registryArtists !== current.registryArtists) {
    return `it was built from ${stored.registryArtists} registry artists, and there are ${current.registryArtists} now`;
  }
  if (stored.songs !== current.songs) {
    return `it was built from ${stored.songs} songs, and there are ${current.songs} now`;
  }
  if (stored.sha256 !== current.sha256) {
    return 'the registry, the songs, the stage’s code or a local input has changed since';
  }
  return null;
}
