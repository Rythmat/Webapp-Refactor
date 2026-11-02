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
}

export interface ArcadeEntry extends LessonBase {
  kind: 'arcade';
  route: string;
}

export type AudioLesson = LabLesson | AnatomyEntry | ArcadeEntry;

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
  lessons: readonly AudioLesson[];
}

/** Every module taught in order, one tile each. */
const COURSE = 'Course';

export const AUDIO_MODULES: readonly AudioModule[] = [
  {
    id: 'sound-basics',
    title: 'Sound Basics',
    shelf: COURSE,
    access: 'free',
    accentKey: 'F#',
    lessons: [
      {
        kind: 'lab',
        id: 'physics-of-sound',
        title: 'Physics of Sound',
        ratio: [2, 3],
        topics: [
          {
            id: 'waves',
            title: 'Waves & Mediums',
            tab: 'Waves',
            sub: 'How sound travels',
          },
          {
            id: 'compression',
            title: 'Compression & Rarefaction',
            tab: 'Compression',
            sub: 'Pressure in the air',
          },
          {
            id: 'frequency',
            title: 'Frequency & Pitch',
            tab: 'Frequency',
            sub: 'What we hear as pitch',
          },
          {
            id: 'amplitude',
            title: 'Amplitude & Volume',
            tab: 'Amplitude',
            sub: 'What we hear as volume',
          },
        ],
      },
    ],
  },
  {
    id: 'sound-color',
    title: 'Sound Color',
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
    shelf: COURSE,
    access: 'premium',
    accentKey: 'E',
    lessons: [
      {
        kind: 'lab',
        id: 'mic-to-speaker',
        title: 'From Mic to Speaker',
        ratio: [7, 10],
        topics: [
          {
            id: 'preamps',
            title: 'Preamps & Levels',
            tab: 'Preamps',
            sub: 'Up to line level',
          },
          {
            id: 'digital',
            title: 'ADC, DAC & Sample Rate',
            tab: 'Digital',
            sub: 'Sound as numbers',
          },
          {
            id: 'amps',
            title: 'Amps & Speaker Level',
            tab: 'Amps',
            sub: 'Power and tone',
          },
          {
            id: 'loudspeakers',
            title: 'Loudspeakers',
            tab: 'Speakers',
            sub: 'Back into air',
          },
          {
            id: 'cables',
            title: 'Connectors & Cables',
            tab: 'Cables',
            sub: 'Getting it there',
          },
        ],
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
        id: 'microphone',
        title: 'Microphone Anatomy',
        route: LearnRoutes.microphoneAnatomy(),
        ratio: [8, 9],
      },
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
  lesson.kind === 'lab'
    ? LearnRoutes.audioLesson({ module: module.id, lesson: lesson.id })
    : lesson.route;
