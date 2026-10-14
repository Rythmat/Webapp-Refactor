/**
 * Turns a canonical-curriculum Day *stub* into a real Day.
 *
 * The canonical curriculum is retired from the teacher app; its only consumer
 * is the console's Teach mirror, which renders each stub through the same path
 * a teacher's Day takes (`seededDayFromStub` → `DeckPreview`).
 */
import { PHASES } from '../phases';
import { newBlankDay } from '../plan/newBlankDay';
import type { Day } from '../types';
import type { DayStub } from './curriculumTemplate';

/**
 * Materialize a template stub into a real Day. The Day's label carries the
 * stub's label; each phase cell's `presentation.prompt` gets the stub's
 * bilingual `phaseSeeds` entry (missing phases stay blank).
 *
 * Song + Globe integration on the Connect cell:
 *   - `songId`: sets `presentation.song = { id }` on the Connect cell (a
 *     structured reference the presentation surface resolves to artwork) —
 *     NOT appended into the prompt prose.
 *   - `globeEventIds`: each id becomes a `LaunchTile { module: 'globe',
 *     activityRef: <id> }` on the Connect cell — students click and land
 *     on the Globe with the pin already selected.
 *
 * `scheduledDate` starts unset.
 */
export const seededDayFromStub = (stub: DayStub): Day => {
  const day = newBlankDay(stub.label);
  const cells = { ...day.cells };
  for (const phase of PHASES) {
    const seed = stub.phaseSeeds[phase];
    if (!seed) continue;
    cells[phase] = {
      ...cells[phase],
      presentation: {
        ...cells[phase].presentation,
        prompt: { en: seed.en, es: seed.es },
      },
    };
  }

  // Enrich Connect with song reference + globe launch tiles.
  const connect = cells.connectRegulate;
  const connectPresentation = connect.presentation;

  const globeTiles = (stub.globeEventIds ?? []).map((eventId, i) => ({
    id: `${day.id}-globe-${i}`,
    module: 'globe' as const,
    activityRef: eventId,
    label: { en: 'Explore on the Globe', es: 'Explora en el Globo' },
  }));

  cells.connectRegulate = {
    ...connect,
    presentation: {
      ...connectPresentation,
      // Structured song reference — resolved to artwork by the presentation
      // surface. Never appended to the prompt (that produced a raw slug).
      ...(stub.songId ? { song: { id: stub.songId } } : {}),
      launchTiles: [...connectPresentation.launchTiles, ...globeTiles],
    },
  };

  return { ...day, cells };
};
