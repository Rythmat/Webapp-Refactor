import { GameRoutes, LearnRoutes } from '@/constants/routes';
import type { LearnInstrument } from '@/features/learn/useInstrumentStore';

// ── Learn → Audio: what the section teaches, in order ──────────────────────
// Data only: the hub, the lesson rail, search and the prompt bar all read it,
// and search can't load the labs to do so. Add a topic here and in labPages.ts,
// and it has a tab, a place on the rail and its share of the tile's percent.
// Only what's built is listed: the section grows module by module, with no
// "coming soon" tiles.

/** Every topic's four steps, after Lightnote's lessons and the deck's
 *  activities: the sound first, then a guess, the answer, the student's turn. */
export const LAB_STEPS = [
  { id: 'hear', label: 'Hear' },
  { id: 'predict', label: 'Predict' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'try', label: 'Try' },
] as const;
export type LabStepId = (typeof LAB_STEPS)[number]['id'];

interface LessonBase {
  /** The slug in its route, unique in the section. */
  id: string;
  title: string;
  /** The interval its tile draws. */
  ratio: readonly [number, number];
}

/** One idea in a lab: its own stage and sound, Hear to Try. */
export interface LabTopic {
  /** Its `?topic=`, and the key of its page in labPages.ts. */
  id: string;
  title: string;
  /** Its tab: the name and the quieter line under it. */
  tab: string;
  sub: string;
  /** The guided lesson that has taken this topic's place on the course page. */
  replacedBy?: string;
}

/** A unit: one tile, one percent and one lesson page, its topics in order. */
export interface LabLesson extends LessonBase {
  kind: 'lab';
  topics: readonly LabTopic[];
}

export interface AnatomyEntry extends LessonBase {
  kind: 'anatomy';
  route: string;
  /** The Learn instrument whose rollout flag it follows, if any. */
  instrument?: LearnInstrument;
  /** The guided lesson it hangs from on its course's path. */
  sideOf?: string;
}

export interface ArcadeEntry extends LessonBase {
  kind: 'arcade';
  route: string;
}

/** A lesson in the focus player: one screen at a time, from its own script. */
export interface GuidedLesson extends LessonBase {
  kind: 'guided';
  blurb: string;
  /** How many screens it has, for a percent without loading its script. A test
   *  holds this to the script. */
  screens: number;
}

export type AudioLesson = LabLesson | GuidedLesson | AnatomyEntry | ArcadeEntry;

export interface AudioModule {
  id: string;
  title: string;
  /** The shelf it shares with other modules; left out, it has its own. */
  shelf?: string;
  /** Free modules open for everyone; the rest need Premium. */
  access: 'free' | 'premium';
  /** The key whose colour is this module's one accent (not A or D: yellow and
   *  amber, too near the brand yellow the app no longer uses). */
  accentKey: string;
  /** For a course: what its description card says. */
  blurb?: string;
  /** Its level's name, and what the level's popup says it teaches. */
  unit?: string;
  goals?: readonly string[];
  lessons: readonly AudioLesson[];
}

/** Every module taught in order, one tile each. */
const COURSE = 'Course';

export const AUDIO_MODULES: readonly AudioModule[] = [
  {
    id: 'sound-basics',
    title: 'Sound Basics',
    blurb:
      'What sound really is, how it reaches a mic, and how to read its frequency and level on any session.',
    unit: 'What Sound Is',
    goals: [
      'Hear why a mic’s distance and polarity change a recording',
      'Find each part of a kit in the spectrum',
      'Read faders and meters, and leave headroom',
    ],
    shelf: COURSE,
    access: 'free',
    accentKey: 'F#',
    lessons: [
      {
        kind: 'guided',
        id: 'physics-of-sound',
        title: 'Physics of Sound',
        blurb: 'What really travels from the kit to the mic',
        ratio: [2, 3],
        screens: 16,
      },
      {
        kind: 'guided',
        id: 'hear-the-kit',
        title: 'Hear the Kit',
        blurb: 'Why a kick thumps in a club and clicks on a phone',
        ratio: [3, 4],
        screens: 14,
      },
      {
        kind: 'guided',
        id: 'decibels-and-faders',
        title: 'Decibels and Faders',
        blurb: 'Why 0 sits near the top, and what −6 really does',
        ratio: [4, 5],
        screens: 14,
      },
    ],
  },
  {
    id: 'sound-color',
    title: 'Sound Color',
    blurb:
      'Why the same note sounds different on every instrument, and how to shape it.',
    unit: 'Tone and Timbre',
    goals: [
      'See how strings and pipes make harmonics',
      'Build a timbre from its harmonics',
      'Shape a note with attack, decay, sustain and release',
    ],
    shelf: COURSE,
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'lab',
        id: 'tone-and-timbre',
        title: 'Tone & Timbre',
        ratio: [3, 5],
        topics: [
          {
            id: 'strings-and-pipes',
            title: 'Strings & Pipes',
            tab: 'Strings & Pipes',
            sub: 'How instruments ring',
          },
          {
            id: 'timbre',
            title: 'Timbre & Harmonics',
            tab: 'Timbre',
            sub: 'Why one note differs',
          },
          {
            id: 'envelope',
            title: 'Envelope & ADSR',
            tab: 'Envelope',
            sub: 'How a note moves',
          },
        ],
      },
    ],
  },
  {
    id: 'waves-together',
    title: 'Waves Together',
    blurb:
      'What happens when sounds meet: in the air, in your mix and between two notes.',
    unit: 'How Waves Combine',
    goals: [
      'Hear waves add and cancel, and what phase does',
      'Read a sound’s frequency spectrum',
      'See why some intervals blend',
    ],
    shelf: COURSE,
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'lab',
        id: 'how-waves-combine',
        title: 'How Waves Combine',
        ratio: [5, 7],
        topics: [
          {
            id: 'interference',
            title: 'Interference & Phase',
            tab: 'Interference',
            sub: 'Waves adding up',
          },
          {
            id: 'spectrum',
            title: 'Frequency Spectrum',
            tab: 'Spectrum',
            sub: 'From low to high',
          },
          {
            id: 'intervals',
            title: 'Intervals & Ratios',
            tab: 'Intervals',
            sub: 'Why notes blend',
          },
        ],
      },
    ],
  },
  {
    id: 'hearing',
    title: 'Hearing',
    blurb:
      'How your ears and brain turn changing air pressure into music you can feel.',
    unit: 'How We Hear',
    goals: [
      'Follow a sound from the eardrum to the nerve',
      'Hear what your brain fills in and hides',
      'Explore how music moves the body',
    ],
    shelf: COURSE,
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'lab',
        id: 'how-we-hear',
        title: 'How We Hear',
        ratio: [7, 9],
        topics: [
          {
            id: 'ear',
            title: 'Ear Mechanics',
            tab: 'The Ear',
            sub: 'From air to nerve',
          },
          {
            id: 'brain',
            title: 'Brain & Psychoacoustics',
            tab: 'The Brain',
            sub: 'What you really hear',
          },
          {
            id: 'emotion',
            title: 'Music, Emotion & Body',
            tab: 'Emotion',
            sub: 'How music moves us',
          },
        ],
      },
    ],
  },
  {
    id: 'sound-to-electricity',
    title: 'Sound to Electricity',
    blurb: 'How a movement in the air becomes a signal you can record.',
    unit: 'From Air to Signal',
    goals: [
      'Understand voltage and current',
      'See how movement makes voltage',
      'Compare the transducers that turn sound into signal',
    ],
    shelf: COURSE,
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'lab',
        id: 'air-to-signal',
        title: 'From Air to Signal',
        ratio: [5, 9],
        topics: [
          {
            id: 'electricity',
            title: 'Electricity & Voltage',
            tab: 'Electricity',
            sub: 'Voltage and current',
          },
          {
            id: 'electromagnetism',
            title: 'Electromagnetism',
            tab: 'Magnetism',
            sub: 'Movement makes voltage',
          },
          {
            id: 'transducers',
            title: 'Transducers',
            tab: 'Transducers',
            sub: 'Sound to signal and back',
          },
        ],
      },
    ],
  },
  {
    id: 'signal-path',
    title: 'The Signal Path',
    blurb:
      'Follow a signal from the mic through the converter and the amp to the speaker.',
    unit: 'From Mic to Speaker',
    goals: [
      'Set gain so a take can’t be ruined',
      'Understand sampling and sample rate',
      'Know what amps, loudspeakers and cables do to your sound',
    ],
    shelf: COURSE,
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'guided',
        id: 'mic-to-speaker',
        title: 'From Mic to Speaker',
        blurb: 'Follow one snare hit through the desk, the amp and the PA',
        ratio: [7, 10],
        screens: 20,
      },
      {
        kind: 'guided',
        id: 'gain-staging',
        title: 'Gain Staging',
        blurb: 'The one knob you can’t fix later',
        ratio: [5, 6],
        screens: 14,
      },
      {
        kind: 'anatomy',
        id: 'microphone',
        title: 'Take the mic apart',
        route: LearnRoutes.microphoneAnatomy(),
        ratio: [8, 9],
        sideOf: 'gain-staging',
      },
    ],
  },
  {
    id: 'instrument-anatomy',
    title: 'Instrument Anatomy',
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'anatomy',
        id: 'piano',
        title: 'Piano Anatomy',
        route: LearnRoutes.pianoAnatomy(),
        ratio: [3, 4],
      },
      {
        kind: 'anatomy',
        id: 'keyboard',
        title: 'Keyboard Anatomy',
        route: LearnRoutes.keyboardAnatomy(),
        ratio: [4, 5],
      },
      {
        kind: 'anatomy',
        id: 'synth',
        title: 'Synth Anatomy',
        route: LearnRoutes.synthAnatomy(),
        ratio: [5, 6],
      },
      {
        kind: 'anatomy',
        id: 'guitar',
        title: 'Guitar Anatomy',
        route: LearnRoutes.guitarAnatomy(),
        instrument: 'guitar',
        ratio: [2, 3],
      },
      {
        kind: 'anatomy',
        id: 'bass',
        title: 'Bass Anatomy',
        route: LearnRoutes.bassAnatomy(),
        instrument: 'bass',
        ratio: [3, 8],
      },
      {
        kind: 'anatomy',
        id: 'ukulele',
        title: 'Ukulele Anatomy',
        route: LearnRoutes.ukuleleAnatomy(),
        instrument: 'ukulele',
        ratio: [4, 7],
      },
    ],
  },
  {
    id: 'gear-anatomy',
    title: 'Gear Anatomy',
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'anatomy',
        id: 'combo-amp',
        title: 'Combo Amp Anatomy',
        route: LearnRoutes.comboAmpAnatomy(),
        ratio: [3, 5],
      },
      {
        kind: 'anatomy',
        id: 'headphones',
        title: 'Headphone Anatomy',
        route: LearnRoutes.headphoneAnatomy(),
        ratio: [5, 8],
      },
    ],
  },
  {
    id: 'hands-on',
    title: 'Hands On',
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'arcade',
        id: 'signal-flow',
        title: 'Signal Flow',
        route: GameRoutes.signalFlow(),
        ratio: [7, 8],
      },
    ],
  },
];

/** The hub's shelves, in teaching order: modules sharing one, side by side. */
export function audioShelves(): readonly {
  title: string;
  modules: readonly AudioModule[];
}[] {
  const shelves: { title: string; modules: AudioModule[] }[] = [];
  for (const module of AUDIO_MODULES) {
    const title = module.shelf ?? module.title;
    const shelf = shelves.find((s) => s.title === title);
    if (shelf) shelf.modules.push(module);
    else shelves.push({ title, modules: [module] });
  }
  return shelves;
}

export const audioModule = (id: string | undefined) =>
  AUDIO_MODULES.find((module) => module.id === id);

/** Where a lesson opens. */
export const audioLessonRoute = (module: AudioModule, lesson: AudioLesson) =>
  lesson.kind === 'lab' || lesson.kind === 'guided'
    ? LearnRoutes.audioLesson({ module: module.id, lesson: lesson.id })
    : lesson.route;

/** One stop on a course's path. */
export type CourseRow =
  | { kind: 'guided'; lesson: GuidedLesson; side: AnatomyEntry | null }
  | { kind: 'lab'; lesson: LabLesson; topic: LabTopic }
  | { kind: 'anatomy' | 'arcade'; lesson: AnatomyEntry | ArcadeEntry };

/**
 * A course's path, in teaching order: its lessons as listed, a lab as one stop per
 * topic so that every course has a wave to walk, each topic that's been replaced
 * giving way to its guided lesson. Anatomy hangs off the lesson that uses it.
 */
export function courseRows(module: AudioModule): readonly CourseRow[] {
  const rows: CourseRow[] = [];
  const replacing = new Set(
    module.lessons.flatMap((l) =>
      l.kind === 'lab' ? l.topics.flatMap((t) => t.replacedBy ?? []) : [],
    ),
  );
  const guided = (id: string): CourseRow | null => {
    const lesson = module.lessons.find(
      (l): l is GuidedLesson => l.kind === 'guided' && l.id === id,
    );
    if (!lesson) return null;
    const side = module.lessons.find(
      (l): l is AnatomyEntry => l.kind === 'anatomy' && l.sideOf === id,
    );
    return { kind: 'guided', lesson, side: side ?? null };
  };
  for (const lesson of module.lessons) {
    if (lesson.kind === 'lab') {
      for (const topic of lesson.topics) {
        const row = topic.replacedBy ? guided(topic.replacedBy) : null;
        rows.push(row ?? { kind: 'lab', lesson, topic });
      }
    } else if (lesson.kind === 'guided') {
      // One that took a topic's place goes where that topic was.
      const row = replacing.has(lesson.id) ? null : guided(lesson.id);
      if (row) rows.push(row);
    } else if (lesson.kind === 'anatomy' || lesson.kind === 'arcade') {
      if (lesson.kind === 'arcade' || !lesson.sideOf) {
        rows.push({ kind: lesson.kind, lesson });
      }
    }
  }
  return rows;
}
