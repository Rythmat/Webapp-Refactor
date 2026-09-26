import { MarketingRoutes } from '@/constants/routes';

export type TourTabId = 'learn' | 'studio' | 'globe' | 'arcade' | 'teach';

interface TourStep {
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

/** One demo's guided script (what `ModuleDemo` plays). */
export interface TourScript {
  label: string;
  /** Faux URL shown in the window chrome. */
  path: string;
  steps: TourStep[];
}

/** A landing module's demo. */
interface TourTab extends TourScript {
  id: TourTabId;
  /** Public feature page for "Learn more". */
  href: string;
}

const STEP_MS = 3600;
/**
 * Studio "Play it back": the Play press, one 4-bar pass at 120 BPM and the C
 * it resolves to (`studioScript` PLAY_AT_MS + LOOP_MS + RESOLVE_MS; asserted
 * in tests).
 */
const STUDIO_PLAY_MS = 9400;

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
          'Pick C on the circle of fifths. Its red floods every track and diatonic chord.',
        target: 'key',
        click: true,
        durationMs: STEP_MS,
      },
      {
        id: 'suggest',
        label: 'Pick by color',
        callout:
          'Prism lights the colors that can come next. Green holds one chord: E.',
        target: 'pick',
        click: true,
        durationMs: STEP_MS,
      },
      {
        id: 'build',
        label: 'Create the clip',
        callout:
          'Create writes the clip. Fm is borrowed, so it keeps E♭’s purple.',
        target: 'create',
        click: true,
        durationMs: STEP_MS,
      },
      {
        id: 'play',
        label: 'Play it back',
        callout:
          'Play it back: the red playhead runs four bars, each note in its chord’s color.',
        target: 'roll',
        click: true,
        durationMs: STUDIO_PLAY_MS,
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

/** Learn page demo: scales, chords and modes on the circle of fifths. */
export const THEORY_TOUR: TourScript = {
  label: 'Theory',
  path: 'learn?tab=Theory',
  steps: [
    {
      id: 'key',
      label: 'Pick a key',
      callout: 'Pick a key on the circle — its scale lights up in its color.',
      target: 'circle',
      durationMs: STEP_MS,
    },
    {
      id: 'chords',
      label: 'Build the chords',
      callout:
        'Stack the scale into seven chords. They all belong to the key, so they share its color.',
      target: 'chords',
      click: true,
      durationMs: STEP_MS,
    },
    {
      id: 'modes',
      label: 'Modes by color',
      callout:
        'Same root, seven modes. Each takes its parent key’s color — one step around the circle.',
      target: 'modes',
      click: true,
      durationMs: STEP_MS,
    },
  ],
};

/** Learn page demo: a real song's chord chart, colored and playable. */
export const SONGS_TOUR: TourScript = {
  label: 'Songs',
  path: 'songs',
  steps: [
    {
      id: 'song',
      label: 'Pick a song',
      callout: 'Pick from 650+ real songs, each with a chord chart.',
      target: 'songs',
      click: true,
      durationMs: STEP_MS,
    },
    {
      id: 'colors',
      label: 'Every chord has a color',
      callout:
        'G and C belong to G major. B7 and Cmin7 come from outside the key, so they get their own colors.',
      target: 'chart',
      durationMs: STEP_MS,
    },
    {
      id: 'play',
      label: 'Play along',
      callout: 'Press play and watch each chord light up the keys.',
      target: 'play',
      click: true,
      durationMs: STEP_MS * 2,
    },
  ],
};

/** Tour data by module id. */
export const TOUR_BY_ID = Object.fromEntries(
  TABS.map((t) => [t.id, t]),
) as Record<TourTabId, TourTab>;
