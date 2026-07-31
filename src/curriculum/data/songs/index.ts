/**
 * The song library's canonical import point.
 *
 * The data now lives in src/content/songStore.ts and is hydrated at runtime
 * from the published CDN bundle, falling back to ./bundled.ts when no CDN is
 * configured. Consumers keep the specifier they always used — every call site
 * already invoked these as functions rather than reading a module-scope
 * constant, which is what made the move a no-op for all 17 of them.
 *
 * See the header comment in songStore.ts for the one rule that matters: never
 * snapshot the library at module scope.
 *
 * `SONGS` is deliberately NOT re-exported. It was never used outside this
 * module, and exporting a mutable object invites exactly the eager-snapshot bug
 * the store exists to prevent.
 */
export {
  getAllSongs,
  getSong,
  getSongsByArtist,
  getSongsByDifficulty,
  getSongsByGenre,
  getSongsByGlobeEra,
  getSongsByGlobeRegion,
} from '@/content/songStore';
