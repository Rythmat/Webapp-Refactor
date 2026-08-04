/**
 * contentRefs — the INVERSE of `resolveContentHref.ts`. Pure, React-free
 * builders that produce the namespaced, colon-delimited `activityRef` strings
 * the shared resolver (`resolveActivityRefHref`) understands, so a content
 * picker can emit refs that are guaranteed to deep-link. Keep these in lockstep
 * with the grammar documented at the top of `resolveContentHref.ts`:
 *
 *   song:<id>:lesson | song:<id>:chart
 *   learn:<mode>:<key>
 *   curriculum:<GENRE>:L<level>[:A|B|C|D]
 *   studio:template:<id> | studio:song:<id>
 *   globe:pathway:<id> | globe:event:<id>
 *   globe:region:<id> | globe:city:<id> | globe:era:<id>
 *
 * Also exposes `refFirewallCollision` — a pre-publish guard so the picker never
 * emits a ref/label containing a Rule 1 forbidden substring, which would make
 * the whole Day fail to publish (see `publishDay.ts` FORBIDDEN_SUBSTRINGS).
 */
import type { CurriculumGenreId } from '@/curriculum/bridge/genreIdMap';
import { keyLabelToUrlParam } from '@/lib/musicKeyUrl';
import { FORBIDDEN_SUBSTRINGS } from '../publish/publishDay';
import type { LaunchTile } from '../types';

export type PickerKind =
  | 'songChart'
  | 'songLesson'
  | 'learnMode'
  | 'curriculumActivity'
  | 'studioTemplate'
  | 'studioSong'
  | 'globePathway'
  | 'globeEvent'
  | 'globeRegion'
  | 'globeCity'
  | 'globeEra';

export type CurriculumSection = 'A' | 'B' | 'C' | 'D';

/** `song:<id>:chart` → the song's practice / chord-chart page (`/songs/:id`). */
export const songChartRef = (songId: string): string => `song:${songId}:chart`;

/** `song:<id>:lesson` → the song's Theory lesson for its key/mode. Needs the
 *  resolver's injected `getSong` to resolve (present on tiles + app-routes). */
export const songLessonRef = (songId: string): string =>
  `song:${songId}:lesson`;

/**
 * `learn:<mode>:<key>` → a Theory lesson (a mode in a key). `keyLabel` may be a
 * full label ("B♭ minor"), a bare accidental token ("bflat"), or a plain letter
 * — it is canonicalized to the URL token the Lesson page parses (matching the
 * resolver's `canonicalLessonKeyParam`, which splits off any trailing quality).
 */
export const learnRef = (mode: string, keyLabel: string): string =>
  `learn:${mode}:${keyLabelToUrlParam((keyLabel ?? '').trim().split(/\s+/)[0] ?? '')}`;

/** `curriculum:<GENRE>:L<level>[:<section>]` → a genre curriculum activity. The
 *  resolver accepts the uppercase `CurriculumGenreId` and the `L#` level form. */
export const curriculumRef = (
  genreId: CurriculumGenreId,
  level: number,
  section?: CurriculumSection,
): string => `curriculum:${genreId}:L${level}${section ? `:${section}` : ''}`;

/** `studio:template:<id>` → opens the Studio editor seeded with a project template. */
export const studioTemplateRef = (templateId: string): string =>
  `studio:template:${templateId}`;

/** `studio:song:<id>` → opens the Studio editor seeded from a song's chart. */
export const studioSongRef = (songId: string): string =>
  `studio:song:${songId}`;

/** `globe:pathway:<id>` → auto-starts that pathway on the interactive globe. */
export const globePathwayRef = (pathwayId: string): string =>
  `globe:pathway:${pathwayId}`;

/** `globe:event:<id>` → opens the globe focused on a historical event. */
export const eventRef = (eventId: string): string => `globe:event:${eventId}`;

/** `globe:region:<id>` → flies the globe to that region's guided tour. */
export const globeRegionRef = (regionId: string): string =>
  `globe:region:${regionId}`;

/** `globe:city:<id>` → flies the globe to that city's guided tour. */
export const globeCityRef = (cityId: string): string => `globe:city:${cityId}`;

/** `globe:era:<id>` → filters the globe timeline to a musical era. */
export const globeEraRef = (eraId: string): string => `globe:era:${eraId}`;

/**
 * The `LaunchTile.module` a given picker kind maps to. Songs, Learn theory and
 * curriculum all live under the `'learn'` module tag — the resolver keys off the
 * ref NAMESPACE, not this tag, so the coarse tag only affects the fallback base
 * and the eyebrow label. Studio picks use `'studio'`; all globe picks `'globe'`.
 */
export const moduleForKind = (kind: PickerKind): LaunchTile['module'] =>
  kind.startsWith('globe')
    ? 'globe'
    : kind.startsWith('studio')
      ? 'studio'
      : 'learn';

/**
 * Return the first Rule 1 forbidden substring found in the ref or label, or
 * null when safe. The publish firewall (`findForbiddenSubstring`) serializes the
 * whole snapshot and rejects the Day if any occurs — e.g. song ids like
 * `tears_of_a_clown` contain `clo`. The picker calls this to block such items.
 */
export const refFirewallCollision = (
  ref: string,
  label?: string,
): string | null => {
  const haystack = `${ref} ${label ?? ''}`.toLowerCase();
  for (const forbidden of FORBIDDEN_SUBSTRINGS) {
    if (haystack.includes(forbidden)) return forbidden;
  }
  return null;
};
