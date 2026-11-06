import { compiledInstrument } from '@/curriculum/anatomy/compileModel';
import {
  doScreenFor,
  type LessonScript,
} from '@/curriculum/audio/lessons/types';

// ── Meet your instrument (owner, 2026-11-05) ───────────────────────────────
// Piano Fundamentals' first lesson, for someone who has never sat at one:
// what's inside a piano (keys, hammers, strings, soundboard, pedals), how an
// upright and a digital keyboard differ, where to plug in and how to sit, and
// low to high on the keys. The drawings are the Anatomy pages' own.

export type PianoModel = 'grand' | 'upright' | 'keyboard';

/** What's on the stage beyond its view (which drawing, or the keys). */
export interface PianoScene {
  /** The notes played on this screen, oldest first. */
  played: readonly number[];
}

const MODEL_KIND = {
  grand: 'grandPiano',
  upright: 'uprightPiano',
  keyboard: 'keyboard',
} as const;

export const pianoModel = (model: PianoModel) =>
  compiledInstrument(MODEL_KIND[model], false);

/** A part's name as the drawing labels it. */
const named = (model: PianoModel, term: string) =>
  pianoModel(model).termById[term]?.name.toLowerCase() ?? 'that part';

const doScreen = doScreenFor<PianoScene>();

/** The last two notes went up: a low one, then a higher one. */
function lowThenHigh(scene: PianoScene) {
  const [before, last] = scene.played.slice(-2);
  if (last == null || before == null) {
    return { ok: false, mistake: 'one' } as const;
  }
  if (last <= before) return { ok: false, mistake: 'falling' } as const;
  return { ok: true } as const;
}

const LOW_HIGH_WHY = {
  title: 'Why low is on the left',
  paragraphs: [
    'Every key plays one note, and each key to the right plays a little higher than the one before. So the far left is the lowest note the instrument has, and the far right is the highest.',
    'It’s the same on every piano and keyboard, whatever its size, so once you know it you can sit at any of them.',
  ],
};

export const MEET_SCRIPT: LessonScript<PianoScene> = {
  id: 'meet-your-instrument',
  needs: [],
  initial: { played: [] },
  hook: {
    kind: 'hook',
    id: 'hook',
    view: 'grand',
    quiet: true,
    title: 'What happens when you press a key?',
    body: 'This is a grand piano. Every key sets off a small machine inside it. Let’s take it apart and see how it makes its sound.',
  },
  screens: [
    {
      kind: 'choose',
      id: 'what-sounds',
      view: 'grand',
      quiet: true,
      body: 'Inside are 88 keys, a row of felt hammers and over 200 steel strings. No electricity at all.',
      question: 'When you press a key, what makes the sound?',
      correct: 'hammer',
      right: 'Yes: a felt hammer strikes a string, and the string rings.',
      choices: [
        { id: 'hammer', text: 'A hammer strikes a string' },
        {
          id: 'speaker',
          text: 'A speaker plays a recording',
          feedback:
            'That’s how a digital keyboard works. A piano needs no power: its sound is struck from real strings.',
        },
        {
          id: 'air',
          text: 'Air blows through a pipe',
          feedback: 'That’s an organ. A piano’s strings are struck, not blown.',
        },
      ],
      why: {
        title: 'A piano is a struck string instrument',
        paragraphs: [
          'Pressing a key works a lever, and the lever flicks a felt hammer at the strings. The hammer bounces straight off, so the strings are free to ring.',
          'That’s why a piano can play softly and loudly: press gently and the hammer moves slowly; press firmly and it hits hard.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'keys',
      view: 'grand',
      quiet: true,
      term: 'keys',
      body: 'Each **key** is a lever. A full piano has 88: 52 white and 36 black. Press one down and its far end lifts, inside the case.',
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'hammers',
      view: 'grand',
      quiet: true,
      term: 'hammers',
      body: 'The lever throws a felt **hammer** up at the strings. It strikes, then falls straight back, so the string can ring.',
    },
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-hammers',
      view: 'grand',
      quiet: true,
      target: 'hammers',
      body: 'Your turn. Tap the part that strikes the strings.',
      right: 'Those are the hammers: one for every key.',
      wrong: (term) =>
        `That’s the ${named('grand', term)}. Look for the row of felt heads just behind the keys.`,
      why: {
        title: 'One hammer a key',
        paragraphs: [
          'Every key has its own hammer, lined up in a row behind the keys. Together with the levers that throw them, they’re called the action.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'strings',
      view: 'grand',
      quiet: true,
      term: 'strings',
      body: 'Each hammer hits **strings** stretched tight across an iron frame. Low notes have long, thick strings; high notes have short, thin ones.',
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'soundboard',
      view: 'grand',
      quiet: true,
      term: 'soundboard',
      body: 'A string on its own is quiet. It passes its shaking to the **soundboard**, a thin sheet of wood that moves the air: the piano’s speaker.',
    },
    {
      kind: 'choose',
      id: 'long-strings',
      view: 'grand',
      quiet: true,
      body: 'Think about the strings again.',
      question: 'Which strings play the low notes?',
      correct: 'long',
      right:
        'Right. Long, heavy strings shake slowly, and slow shaking sounds low.',
      choices: [
        { id: 'long', text: 'The long, thick ones' },
        {
          id: 'short',
          text: 'The short, thin ones',
          feedback:
            'Short, thin strings shake fast, which sounds high. Low notes need long, heavy strings.',
        },
        {
          id: 'same',
          text: 'They’re all the same',
          feedback:
            'Look again: they get shorter and thinner towards the right, as the notes go up.',
        },
      ],
      why: {
        title: 'Slow shaking sounds low',
        paragraphs: [
          'A note’s pitch is how fast its string shakes. Long, heavy strings shake slowly and sound low; short, light ones shake quickly and sound high.',
          'That’s why a grand piano has its curved shape: the case follows the strings, long on the left and short on the right.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'pedals',
      view: 'grand',
      quiet: true,
      term: 'pedals',
      body: 'At your feet are the **pedals**. The right one, the **damper pedal**, is the one you’ll use most.',
    },
    {
      kind: 'choose',
      id: 'damper',
      view: 'grand',
      quiet: true,
      body: 'Felt dampers rest on the strings and stop them when you let go of a key. The damper pedal lifts them all off.',
      question: 'So what does pressing the damper pedal do?',
      correct: 'ring',
      right:
        'Yes: with the dampers lifted, notes keep ringing after you let go.',
      choices: [
        { id: 'ring', text: 'Notes keep ringing after you let go' },
        {
          id: 'loud',
          text: 'Every note gets louder',
          feedback:
            'Loudness comes from how firmly you press a key. The damper pedal only lets notes keep sounding.',
        },
        {
          id: 'stop',
          text: 'Notes stop sooner',
          feedback:
            'The dampers are what stop a note. Lifting them does the opposite: notes ring on.',
        },
      ],
      why: {
        title: 'Dampers stop the strings',
        paragraphs: [
          'Without dampers, every string you struck would keep ringing into the next note. They drop back onto a string the moment you let its key go.',
          'The damper pedal lifts every damper at once, so notes ring on and blend. Pianists use it to join notes up smoothly.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'upright',
      view: 'upright',
      quiet: true,
      body: 'Most homes have an **upright** piano. It works the same way, folded to stand against a wall: its strings and soundboard stand up behind the keys.',
    },
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-soundboard',
      view: 'upright',
      quiet: true,
      target: 'soundboard',
      body: 'Tap the soundboard on the upright.',
      right: 'That’s it, standing up behind the strings.',
      wrong: (term) =>
        `That’s the ${named('upright', term)}. The soundboard is the big wooden sheet at the very back.`,
      why: {
        title: 'Same parts, stood up',
        paragraphs: [
          'An upright has the same keys, hammers, strings and soundboard as a grand. Standing them up makes it fit against a wall, and its hammers strike forwards instead of upwards.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'keyboard',
      view: 'keyboard',
      quiet: true,
      body: 'A **digital keyboard** has no hammers or strings. Each key presses a sensor, and a circuit plays a recorded piano through its speakers.',
    },
    {
      kind: 'choose',
      id: 'keyboard-sound',
      view: 'keyboard',
      quiet: true,
      body: 'Think about what’s inside the case.',
      question: 'Where does a digital keyboard’s sound come from?',
      correct: 'speakers',
      right: 'Yes: its speakers, or your headphones once they’re plugged in.',
      choices: [
        { id: 'speakers', text: 'Its speakers, or your headphones' },
        {
          id: 'strings',
          text: 'Strings inside it',
          feedback:
            'Open one up and there are none: just sensors, a circuit board and speakers.',
        },
        {
          id: 'keys',
          text: 'The keys themselves',
          feedback:
            'The keys only tell the circuit which note and how hard. The sound comes out of the speakers.',
        },
      ],
      why: {
        title: 'Recorded, then played back',
        paragraphs: [
          'A digital keyboard stores recordings of a real piano. Its sensors tell it which key went down and how fast, and it plays the matching recording, louder for a faster press.',
          'Because nothing is struck, it never needs tuning, and you can turn it down or practise in headphones.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'jacks',
      view: 'keyboard',
      quiet: true,
      term: 'jacks',
      body: 'Round the back are sockets called **jacks**: one for headphones, one for a sustain pedal, often a USB port too.',
    },
    {
      kind: 'choose',
      id: 'quiet-practice',
      view: 'keyboard',
      quiet: true,
      body: 'Plug headphones in and the speakers go quiet.',
      question:
        'You want to practise without the whole house hearing. What do you do?',
      correct: 'headphones',
      right: 'Yes: headphones in a jack, and only you can hear it.',
      choices: [
        { id: 'headphones', text: 'Plug headphones into a jack' },
        {
          id: 'pedal',
          text: 'Plug in a sustain pedal',
          feedback:
            'A sustain pedal lets notes ring on, like a piano’s damper pedal. It doesn’t make anything quieter.',
        },
        {
          id: 'power',
          text: 'Turn the power off',
          feedback:
            'Then nothing sounds at all, even for you. Headphones send the sound to you alone.',
        },
      ],
      why: {
        title: 'Plugging in',
        paragraphs: [
          'Most keyboards have a headphone jack, a jack for a sustain pedal, and often USB to connect to a computer or tablet. Plug headphones in and the speakers go quiet.',
          'A sustain pedal is a small foot switch. It does what a piano’s damper pedal does: notes ring on while it’s down.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'volume',
      view: 'keyboard',
      quiet: true,
      term: 'volumeKnob',
      body: 'No sound? Check three things: the power is on, the **volume** is up, and nothing is left in the headphone jack.',
    },
    {
      kind: 'explain',
      id: 'sit',
      view: 'sit',
      quiet: true,
      scene: { played: [] },
      body: 'Sit facing the middle of the keys, far enough back that your elbows bend a little. Keep your forearms level with the keys and your wrists loose.',
    },
    doScreen<'one' | 'falling'>({
      id: 'low-high',
      view: 'keys',
      quiet: true,
      scene: { played: [] },
      body: 'The keys run from low notes on the left to high notes on the right. Play a key on the left, then one on the right.',
      evaluate: lowThenHigh,
      right: 'That’s it: further right is always higher.',
      feedback: {
        one: 'Play two keys: one on the left, then one further right.',
        falling:
          'That went down. Start on the left and finish further to the right.',
      },
      answer: { played: [48, 72] },
      probes: [
        { scene: { played: [60] }, expect: 'one' },
        { scene: { played: [72, 48] }, expect: 'falling' },
        { scene: { played: [48, 72] }, expect: 'ok' },
      ],
      why: LOW_HIGH_WHY,
    }),
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    view: 'keys',
    quiet: true,
    body: 'That’s your instrument, inside and out.',
    points: [
      'A piano’s keys throw hammers at strings, and the soundboard makes them loud.',
      'A digital keyboard plays a recording through its speakers or your headphones.',
      'Low notes are on the left, high notes on the right.',
    ],
    inSession:
      'Before you practise: sit at the middle, elbows bent a little. On a keyboard, power on, volume up, headphones in if you need quiet.',
    limits:
      'Many keyboards have fewer than 88 keys; 61 is common. Everything in this course works on any size.',
    next: 'Next, the layout: the black keys come in groups of two and three, and they’re how you find every note.',
  },
  practice: [
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'check-hammers',
      view: 'upright',
      quiet: true,
      target: 'hammers',
      body: 'Tap the part that strikes the strings.',
      right: 'The hammers: one for every key.',
      wrong: (term) => `That’s the ${named('upright', term)}.`,
      why: {
        title: 'The hammers',
        paragraphs: [
          'Pressing a key throws its felt hammer at the strings. On an upright they strike forwards; on a grand, upwards.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'check-pedal',
      view: 'grand',
      quiet: true,
      body: 'One more about the pedals.',
      question: 'Which pedal keeps notes ringing after you let go?',
      correct: 'right',
      right: 'The right one, the damper pedal.',
      choices: [
        {
          id: 'left',
          text: 'The left pedal',
          feedback:
            'The left pedal makes notes softer. The right one lets them ring.',
        },
        {
          id: 'middle',
          text: 'The middle pedal',
          feedback:
            'The middle pedal does different things on different pianos. The one that lets every note ring is on the right.',
        },
        { id: 'right', text: 'The right pedal' },
      ],
      why: {
        title: 'The damper pedal',
        paragraphs: [
          'The right pedal lifts every damper off the strings, so notes keep sounding after you let go of their keys. On a keyboard, a sustain pedal does the same job.',
        ],
      },
    },
    doScreen<'one' | 'falling'>({
      id: 'check-low-high',
      view: 'keys',
      quiet: true,
      scene: { played: [] },
      body: 'Play a low note, then a higher one.',
      evaluate: lowThenHigh,
      right: 'Low on the left, high on the right.',
      feedback: {
        one: 'Play two keys, the second further right.',
        falling: 'That went down. Finish further to the right.',
      },
      answer: { played: [48, 72] },
      probes: [
        { scene: { played: [] }, expect: 'one' },
        { scene: { played: [67, 55] }, expect: 'falling' },
        { scene: { played: [55, 67] }, expect: 'ok' },
      ],
      why: LOW_HIGH_WHY,
    }),
  ],
};
