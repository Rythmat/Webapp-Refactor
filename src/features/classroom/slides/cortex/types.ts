import type { MindMapBoard } from '@/content/graph/mindMapBoard';
import type { EdgeKind, EntityId } from '@/content/graph/types';
import type { LocalizedText } from '../../types';
import type { SlideMedia } from '../types';

/**
 * The Cortex lesson: five parts, generated from the Atlas graph.
 *
 *   Connection          a check-in (connectRegulate)
 *   Showcase            one artist or one city (connectRegulate)
 *   Group Project       Promoter, Producer or Performer (groupPractice)
 *   Individual Project  the student's own Studio project (creativeProjects)
 *   Present             progress and a project shared with the teacher
 *                       (presentPerform)
 *
 * `planCortexLesson` reads the graph into a `CortexLessonPlan`: the focus, its
 * facts and media, and what each group role would do with it. The teacher's
 * choices (`CortexLessonChoices`) then turn the plan into slides without the
 * graph (`buildCortexLessonDeck`).
 */

export type GroupRole = 'promoter' | 'producer' | 'performer';

export const GROUP_ROLES: readonly GroupRole[] = [
  'promoter',
  'producer',
  'performer',
];

export type FocusKind = 'artist' | 'place';

/** Why the generator offered a focus, for the teacher's card. */
export type FocusReason =
  | { kind: 'plannedSong'; songId: string; title: string }
  | { kind: 'plannedEvent'; eventId: string; title: string }
  | { kind: 'wellConnected' }
  | { kind: 'searched' };

export interface LessonFocus {
  /** `artist:marvin-gaye`, `place:detroit`. */
  id: EntityId;
  kind: FocusKind;
  label: string;
  reason: FocusReason;
  /** Confirmed connections to artists, cities, events and songs. */
  connections: number;
}

/** One line of the Showcase slide, and the connection that states it. */
export interface ShowcaseFact {
  text: LocalizedText;
  /** The edge kind it reads, or the place record's own description. */
  source: EdgeKind | 'description';
  /** The nodes it names. */
  about: EntityId[];
}

export interface ShowcaseListen {
  videoId: string;
  startSec?: number;
  title: string;
  /** "“What’s Going On” · Marvin Gaye · 1971". */
  caption: string;
  songId?: string;
}

export interface ShowcaseContent {
  facts: ShowcaseFact[];
  /** The artist's portrait, or a mini-globe of the city and its events. */
  visual?: SlideMedia;
  /** A video to listen to, on a slide of its own. */
  listen?: ShowcaseListen;
  /** The focus kind's Cortex colour, as the slide accent. */
  accent: string;
}

export interface TutorialInfo {
  id: string;
  title: string;
  estMinutes: number;
  difficulty: string;
  /** Uses Prism, which free accounts cannot open. */
  needsPremium: boolean;
}

export interface ProducerOption {
  tutorial: TutorialInfo;
  /** The genre that chose it, when one did ("Funk"). */
  genre?: string;
}

export interface PerformerOption {
  /** `song:<id>:lesson` or `curriculum:<GENRE>:L1`. */
  activityRef: string;
  label: LocalizedText;
  needsPremium: boolean;
  songId?: string;
}

export interface CortexLessonPlan {
  focus: LessonFocus;
  showcase: ShowcaseContent;
  /** Null when the focus is too thinly connected for a map. */
  promoter: MindMapBoard | null;
  /** Every tutorial, the genre's pick first. */
  producer: ProducerOption[];
  /** Lessons connected to the focus, best first; empty when there are none. */
  performer: PerformerOption[];
  /** Up to four vibes of the focus's songs, for the mood poll. */
  vibes: string[];
  /** Teacher-only: why this focus, and what each part reads. */
  notes: string[];
}

export type CheckInStyle = 'emoji' | 'scale' | 'word';

export interface CortexLessonChoices {
  role: GroupRole;
  /** A Producer's tutorial; the plan's first when absent. */
  tutorialId?: string;
  /** A Performer's lesson ref; the plan's first when absent. */
  performerRef?: string;
  checkInStyle: CheckInStyle;
  checkInQuestion?: LocalizedText;
  /** Add the "which sound matches your mood?" poll when there are vibes. */
  vibePoll: boolean;
  /** Individual Project timer, minutes. */
  projectMinutes: number;
  /** The suggestion's shuffle position, kept for regenerate and reports. */
  seed: number;
}

export const DEFAULT_CORTEX_CHOICES: Omit<CortexLessonChoices, 'role'> = {
  checkInStyle: 'emoji',
  vibePoll: true,
  projectMinutes: 20,
  seed: 0,
};
