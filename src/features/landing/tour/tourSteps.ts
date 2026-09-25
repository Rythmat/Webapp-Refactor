import { MarketingRoutes } from '@/constants/routes';

export type TourTabId = 'learn' | 'studio' | 'globe' | 'arcade' | 'teach';

export interface TourStep {
  id: string;
  /** Short label for the step list under the window. */
  label: string;
  /** Callout text shown next to the step's target. */
  callout: string;
  /** `data-tour-target` the animated cursor moves to. */
  target: string;
  /** Whether the cursor "clicks" when it arrives. */
  click?: boolean;
  durationMs: number;
}

export interface TourTab {
  id: TourTabId;
  label: string;
  /** Faux URL shown in the window chrome. */
  path: string;
  /** Public feature page for "Learn more". */
  href: string;
  steps: TourStep[];
}

const STEP_MS = 3600;

const TABS: TourTab[] = [
  {
    id: 'studio',
    label: 'Studio',
    path: 'studio',
    href: MarketingRoutes.studio(),
    steps: [
      {
        id: 'key',
        label: 'Pick a key',
        callout:
          'Pick a key center — C major. Its color, red, colors every diatonic chord.',
        target: 'key',
        click: true,
        durationMs: STEP_MS,
      },
      {
        id: 'suggest',
        label: 'Prism suggests',
        callout:
          'Prism suggests what can come next, straight from its progression graph.',
        target: 'pick',
        click: true,
        durationMs: STEP_MS,
      },
      {
        id: 'build',
        label: 'Build the progression',
        callout:
          'Borrowed chords take the color of the key they come from — Fm is Eb’s purple.',
        target: 'lane',
        durationMs: STEP_MS,
      },
      {
        id: 'play',
        label: 'Play it back',
        callout: 'Play it back and watch each chord light up the keys.',
        target: 'keys',
        durationMs: STEP_MS,
      },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    path: 'learn',
    href: MarketingRoutes.learn(),
    steps: [
      {
        id: 'circle',
        label: 'Every key has a color',
        callout: 'Every key center has its own color on the circle of fifths.',
        target: 'circle',
        durationMs: STEP_MS,
      },
      {
        id: 'scale',
        label: 'See the scale',
        callout:
          'G major on the keys — the whole scale in one color, the key center’s.',
        target: 'keys',
        durationMs: STEP_MS,
      },
      {
        id: 'lesson',
        label: 'Hear it in a lesson',
        callout:
          'Short, playable lessons turn theory into something you can hear.',
        target: 'lesson',
        click: true,
        durationMs: STEP_MS,
      },
    ],
  },
  {
    id: 'arcade',
    label: 'Arcade',
    path: 'arcade',
    href: MarketingRoutes.arcade(),
    steps: [
      {
        id: 'fall',
        label: 'Notes fall to the beat',
        callout: 'Notes fall to the beat — read them as they come.',
        target: 'lanes',
        durationMs: STEP_MS,
      },
      {
        id: 'hit',
        label: 'Hit them in time',
        callout: 'Hit them in time on the keys.',
        target: 'keys',
        durationMs: STEP_MS,
      },
      {
        id: 'score',
        label: 'Build streaks',
        callout: 'Build streaks and earn XP as your ear improves.',
        target: 'score',
        durationMs: STEP_MS,
      },
    ],
  },
  {
    id: 'globe',
    label: 'Globe',
    path: 'atlas',
    href: MarketingRoutes.globe(),
    steps: [
      {
        id: 'spin',
        label: 'Spin the globe',
        callout: 'Spin the globe to see where styles of music took shape.',
        target: 'globe',
        durationMs: STEP_MS,
      },
      {
        id: 'arcs',
        label: 'Follow the influence',
        callout: 'Follow the arcs as a sound travels from city to city.',
        target: 'globe',
        durationMs: STEP_MS,
      },
      {
        id: 'story',
        label: 'Open a story',
        callout: 'Open a moment in music history and hear how it connects.',
        target: 'story',
        click: true,
        durationMs: STEP_MS,
      },
    ],
  },
  {
    id: 'teach',
    label: 'Teach',
    path: 'classroom',
    href: MarketingRoutes.teachers(),
    steps: [
      {
        id: 'class',
        label: 'Create your class',
        callout: 'Set up a roster and share a join code with students.',
        target: 'code',
        click: true,
        durationMs: STEP_MS,
      },
      {
        id: 'live',
        label: 'Run a live session',
        callout: 'Your projector leads and every student device follows.',
        target: 'projector',
        durationMs: STEP_MS,
      },
      {
        id: 'progress',
        label: 'Track progress',
        callout: 'See XP and streaks for every student.',
        target: 'students',
        durationMs: STEP_MS,
      },
    ],
  },
];

/** Tour data by module id. */
export const TOUR_BY_ID = Object.fromEntries(
  TABS.map((t) => [t.id, t]),
) as Record<TourTabId, TourTab>;
