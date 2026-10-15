import { EDGE_LABELS, type EntityId } from '@/content/graph/types';
import type { LessonCatalog } from './catalog';
import { kindOf, linked, type LessonGraph } from './graphQueries';
import { performerOptions } from './performerLesson';
import { producerOptions } from './producerTutorial';
import { promoterBoard } from './promoterBoard';
import { SHOWCASE_SLIDE_FACTS, showcaseFor } from './showcase';
import type { CortexLessonPlan, LessonFocus } from './types';

/**
 * Read the graph into a lesson plan for one focus: its Showcase, what each
 * group role would do with it, the vibes for the mood poll, and the
 * teacher's notes on why. Everything after this works from the plan alone.
 */

/** Options shown in the mood poll, at most. */
const MAX_VIBES = 4;

/** The focus's songs, for their vibes. */
const songsOf = (graph: LessonGraph, focusId: EntityId) =>
  kindOf(focusId) === 'artist'
    ? [
        ...linked(graph, focusId, 'performed_by', 'in', { guesses: true }),
        ...linked(graph, focusId, 'written_by', 'in'),
      ]
    : linked(graph, focusId, 'recorded_in', 'in');

/**
 * The vibes of the focus's songs, most common first: a song's own `has_vibe`
 * edges, and its progressions' (a song's vibes come through them).
 */
export const vibesFor = (graph: LessonGraph, focusId: EntityId): string[] => {
  const counts = new Map<string, number>();
  const count = (label: string) =>
    counts.set(label, (counts.get(label) ?? 0) + 1);
  for (const song of songsOf(graph, focusId)) {
    for (const vibe of linked(graph, song.id, 'has_vibe', 'out'))
      count(vibe.label);
    for (const progression of linked(graph, song.id, 'uses_progression', 'out'))
      for (const vibe of linked(graph, progression.id, 'has_vibe', 'out'))
        count(vibe.label);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_VIBES)
    .map(([label]) => label);
};

const reasonNote = (focus: LessonFocus): string => {
  switch (focus.reason.kind) {
    case 'plannedSong':
      return `Suggested from today's plan: the song “${focus.reason.title}”.`;
    case 'plannedEvent':
      return `Suggested from today's plan: the Globe event “${focus.reason.title}”.`;
    case 'searched':
      return 'Chosen by search.';
    case 'wellConnected':
      return "Suggested as one of the best-connected artists and cities the class hasn't had recently.";
  }
};

export const planCortexLesson = (
  graph: LessonGraph,
  catalog: LessonCatalog,
  focus: LessonFocus,
): CortexLessonPlan => {
  const showcase = showcaseFor(graph, catalog, focus);
  const promoter = promoterBoard(graph, catalog, focus.id);
  const producer = producerOptions(graph, catalog, focus.id);
  const performer = performerOptions(graph, catalog, focus.id);
  const vibes = vibesFor(graph, focus.id);

  const notes = [
    `Focus: ${focus.label} (${focus.kind === 'artist' ? 'artist' : 'place'}), ${focus.connections} confirmed connections in the Atlas.`,
    reasonNote(focus),
    `Showcase reads: ${[
      ...new Set(
        showcase.facts.map((f) =>
          f.source === 'description'
            ? 'the place’s description'
            : EDGE_LABELS[f.source].forward,
        ),
      ),
    ].join(', ')}.`,
    ...(showcase.facts.length > SHOWCASE_SLIDE_FACTS
      ? [
          `More to share about ${focus.label}: ${showcase.facts
            .slice(SHOWCASE_SLIDE_FACTS)
            .map((f) => f.text.en)
            .join(' · ')}`,
        ]
      : []),
    promoter
      ? `Promoter: ${promoter.nodes.length - 1} things to find on the Globe, ${promoter.edges.length} connections among them; the challenge asks for ${promoter.goal}.`
      : 'Promoter: too few confirmed connections for a mind map.',
    producer[0]
      ? `Producer: “${producer[0].tutorial.title}”${producer[0].genre ? `, picked for ${producer[0].genre}` : ''}${producer[0].tutorial.needsPremium ? ' (uses Prism: needs Premium)' : ''}.`
      : 'Producer: no Studio tutorials available.',
    performer[0]
      ? `Performer: ${performer[0].label.en}${performer[0].needsPremium ? ' (needs Premium)' : ''}.`
      : 'Performer: no connected Learn lesson.',
  ];

  return { focus, showcase, promoter, producer, performer, vibes, notes };
};
