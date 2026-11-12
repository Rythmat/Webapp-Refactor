import type { Why } from '@/curriculum/audio/lessons/types';
import { noteNameInKey, pitchClassOf } from '../noteNames';
import { listNames } from '../takeFeedback';
import type {
  CheckedScreen,
  ChooseScreen,
  GuidedChapter,
  PickNotesScreen,
  PlayScreen,
  Rung,
} from '../types';

// ── Ionian, in any key ─────────────────────────────────────────────────────
// Written once and spelled for each key, on keyboard and on guitar: the idea is the
// same, and only how it's played changes. `notes` is the scale as the lesson spells
// it, from its tonic.

export interface IonianKey {
  /** "E♭". */
  key: string;
  /** The seven notes from the tonic: E♭ F G A♭ B♭ C D. */
  notes: readonly string[];
  /** The scales one note away, as wrong answers: its 4th raised, its 7th lowered. */
  lydian?: readonly string[];
  mixolydian?: readonly string[];
}

/** Pairs a step with the one it proves: in time proves the same out of time. */
const pair = (
  own: string,
  inTime: string,
  name = '',
): readonly [Rung, Rung] => [
  { step: own, label: name ? `${name}, own pace` : 'At your own pace' },
  {
    step: inTime,
    label: name ? `${name}, in time` : 'In time',
    credits: [own],
  },
];

const scaleWhy = (key: string): Why => ({
  title: 'Why it’s called Ionian',
  paragraphs: [
    `Ionian is the old name for the major scale. ${key} Ionian and ${key} major are the same notes.`,
    'You’ll meet six more modes built from these very notes. Each starts somewhere else, and the name tells you which one you’re in.',
  ],
});

const SPACING = 'whole, whole, half, whole, whole, whole, half';

/** Find the scale's notes by counting its spacing up from the tonic, by hand. */
function findTheNotes({
  key,
  notes,
  face,
}: IonianKey & { face: 'keys' | 'names' }): PickNotesScreen {
  const scale = notes.map(pitchClassOf);
  return {
    kind: 'pick',
    id: 'find-notes',
    body: `${key} is already chosen. Click the other six, counting up from it: ${SPACING}.`,
    question: 'Which notes are in this scale?',
    face,
    tonicPc: scale[0],
    scale,
    nameOf: (pc) => noteNameInKey(pc + 60, key),
    right: `${notes.join(', ')}. You just built ${key} major from its spacing.`,
    extra: (names) =>
      `${listNames(names)} ${names.length > 1 ? 'aren’t' : 'isn’t'} in ${key} Ionian. Count up from ${key} again: ${SPACING}.`,
    missing: (found, total) =>
      `You’ve found ${found} of ${total}, and they’re all right. Keep counting up from ${key}: ${SPACING}.`,
    why: {
      title: 'Building a scale from its spacing',
      paragraphs: [
        `Start on ${key}, and take those seven steps in order. A whole step skips one note, and a half step goes to the very next one.`,
        `That’s all a key is. It’s also why ${key} has the sharps or flats it does: they keep the spacing right.`,
      ],
    },
  };
}

/** The scale's spacing, against those of two of its neighbouring modes. */
const WHICH_INTERVALS: ChooseScreen = {
  kind: 'choose',
  id: 'intervals',
  body: 'An **interval** is the distance from one note to another. Now name the distances you just counted.',
  question: 'What intervals are in this scale?',
  correct: 'ionian',
  right:
    'Whole, whole, half, whole, whole, whole, half. Every major scale has it.',
  choices: [
    {
      id: 'dorian',
      text: 'Whole, half, whole, whole, whole, half, whole',
      feedback:
        'That’s Dorian’s spacing. Its half steps come after notes 2 and 6, and this scale’s come after 3 and 7.',
    },
    { id: 'ionian', text: 'Whole, whole, half, whole, whole, whole, half' },
    {
      id: 'lydian',
      text: 'Whole, whole, whole, half, whole, whole, half',
      feedback:
        'That’s Lydian’s spacing. Its first half step comes after note 4, and this scale’s comes after 3.',
    },
  ],
  why: {
    title: 'Why the order matters',
    paragraphs: [
      'All seven modes use five whole steps and two half steps. Only where those half steps fall changes, and that’s what gives each its own sound.',
      'You’ll meet the others later in this family, built from these same notes.',
    ],
  },
};

/** Two questions from the key itself, so that they differ from key to key. */
function scaleChecks({
  key,
  notes,
  lydian,
  mixolydian,
}: IonianKey): readonly [ChooseScreen, ChooseScreen] {
  const [, b, c, d, e, f, g] = notes;
  return [
    {
      kind: 'choose',
      id: 'check-fifth',
      body: 'No hints from here.',
      question: `What’s the 5th note of ${key} Ionian?`,
      correct: 'e',
      right: `${e}. Count up from ${key}: ${key}, ${b}, ${c}, ${d}, ${e}.`,
      choices: [
        {
          id: 'd',
          text: d,
          feedback: `${d} is the 4th. Count ${key} itself as the first.`,
        },
        { id: 'e', text: e },
        {
          id: 'f',
          text: f,
          feedback: `${f} is the 6th. Count ${key} itself as the first.`,
        },
      ],
      why: {
        title: 'Why the 5th matters',
        paragraphs: [
          `After ${key} itself, ${e} is the strongest note in the key. It’s the top of the ${key} chord and the root of the chord that pulls home.`,
        ],
      },
    },
    {
      kind: 'choose',
      id: 'check-notes',
      body: 'Only one note separates these three.',
      question: `Which notes are in ${key} Ionian?`,
      correct: 'ionian',
      right: `${notes.join(', ')}.`,
      choices: [
        {
          id: 'lydian',
          text: (lydian ?? notes).join(', '),
          feedback: `That has ${lydian?.[3]} as its 4th note, and ${key} Ionian has ${d}. Count it out: whole, whole, half.`,
        },
        { id: 'ionian', text: notes.join(', ') },
        {
          id: 'mixolydian',
          text: (mixolydian ?? notes).join(', '),
          feedback: `That has ${mixolydian?.[6]} as its 7th note, and ${key} Ionian has ${g}, a half step under ${key}.`,
        },
      ],
      why: {
        title: 'One note makes a different scale',
        paragraphs: [
          `Raise the 4th of ${key} Ionian and you have ${key} Lydian. Lower its 7th and you have ${key} Mixolydian. They’re that close, and you can hear the difference at once.`,
        ],
      },
    },
  ];
}

const articulationWhy: Why = {
  title: 'Why the same notes can sound so different',
  paragraphs: [
    'Short notes, or **staccato**, sound light and bouncy. Long, connected notes, or **legato**, sound smooth and singing.',
    'Which notes you play is only half of a melody. How long you hold them is much of the other half, and it’s a lot of what makes a player sound like themselves.',
  ],
};

const chordsWhy = (key: string, notes: readonly string[]): Why => ({
  title: 'Where chords come from',
  paragraphs: [
    `Take any note of the scale, skip one, take one, skip one, take one. Starting on ${key}, that’s ${notes[0]}, ${notes[2]} and ${notes[4]}.`,
    'Do that from each of the seven notes and you get the seven chords of the key. They’re numbered by the note they start from, so 5 is always the chord on the 5th note, in any key.',
  ],
});

// ── On keyboard ────────────────────────────────────────────────────────────

/** A Theory step of the keyboard lesson, as its Chords chapter lists them. */
export interface TheoryStep {
  ref: string;
  /** "1 maj Chord • Arpeggio & Hold", "Chord Progression 1 – 4 – 5 – 1 • Play Along". */
  title: string;
}

const chordLabel = (title: string) =>
  title.replace(/\s*(7th )?Chord\b.*$/, '').trim();
const progressionLabel = (title: string) =>
  /Progression\s+(.+?)\s*•/.exec(title)?.[1]?.trim() ?? title;

export function ionianKeyboardChapters(
  ctx: IonianKey,
  steps: readonly TheoryStep[],
): readonly GuidedChapter[] {
  const { key, notes } = ctx;
  const [, , c, , e, , g] = notes;
  const rungsFor = (
    pattern: RegExp,
    label: (title: string) => string,
  ): Rung[] =>
    steps
      .filter((step) => pattern.test(step.ref))
      .map((step) => ({ step: step.ref, label: label(step.title) }));

  const melody: GuidedChapter = {
    id: 'A',
    name: 'Melody',
    hook: {
      kind: 'hook',
      id: 'hook',
      hear: 'ascdesc-pa',
      title: 'Seven notes make a key.',
      body: `Hear it. That’s **${key} Ionian**, the major scale: ${notes.join(', ')}. Nearly everything in ${key} major is drawn from these seven.`,
    },
    screens: [
      {
        kind: 'play',
        id: 'up',
        body: `Walk up the scale from ${key}. First the notes wait for you, then you keep time with them.`,
        rungs: pair('asc-nh', 'asc-pa'),
        right: `That’s ${key} major, from the bottom to the top.`,
        why: scaleWhy(key),
      },
      {
        kind: 'explain',
        id: 'spacing',
        body: 'Every major scale has the same spacing: **whole, whole, half, whole, whole, whole, half**. A half step is the very next key, with nothing in between.',
        show: { overview: 'lesson-overview' },
      },
      findTheNotes({ ...ctx, face: 'keys' }),
      WHICH_INTERVALS,
      {
        kind: 'play',
        id: 'down',
        body: 'Now from the top down, the same notes in reverse. It’s harder than it sounds, because your hand has to cross the other way.',
        rungs: pair('desc-nh', 'desc-pa'),
        right: 'Coming down is its own skill, and now you’ve got it too.',
        why: {
          title: 'Why practise it downwards',
          paragraphs: [
            'Melodies go both ways, and your fingers don’t mirror themselves. The thumb has to pass under in one direction and the fingers over in the other.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'both',
        body: `All the way up to ${key} and back down again, without a break.`,
        rungs: pair('ascdesc-nh', 'ascdesc-pa'),
        right: 'Up and back without stopping: the whole key, under your hand.',
        why: {
          title: 'Why the turnaround is the hard part',
          paragraphs: [
            'At the top your hand has to change direction without a gap in the beat. Practising it now means it won’t catch you out in the middle of a melody.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'phrase',
        body: 'Scales are the raw material. Here’s a short phrase made from them, then a longer one.',
        rungs: [
          ...pair('contour-1-nh', 'contour-1-pa', 'Short'),
          ...pair('contour-2-nh', 'contour-2-pa', 'Longer'),
        ],
        right: 'Same seven notes, and now they’re saying something.',
        why: {
          title: 'What a contour is',
          paragraphs: [
            'A contour is the shape a melody makes: up, down, leaping or stepping. The ear remembers the shape long before it remembers the notes.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'articulation',
        body: 'Same phrase, three ways: **staccato** is short and detached, **legato** is long and connected, then a mix of the two.',
        rungs: [
          { step: 'contour-1-stac-pa', label: 'Staccato' },
          { step: 'contour-1-lega-pa', label: 'Legato' },
          { step: 'contour-1-mix-pa', label: 'Mixed' },
        ],
        right: 'Same notes, three characters. That’s touch.',
        why: articulationWhy,
      },
    ],
    takeaway: {
      kind: 'takeaway',
      id: 'takeaway',
      body: `That’s ${key} major: the notes, the spacing, and what you can do with them.`,
      points: [
        `**${key} Ionian** is ${notes.join(', ')}.`,
        `Its spacing is ${SPACING}.`,
        'How long you hold a note changes the music as much as which note it is.',
      ],
      inSession: `Improvise over a ${key} drone or chord, using only these seven notes. Try ending your phrases on ${key} or ${e}, then on ${g}, and hear the difference.`,
      limits:
        'Knowing a scale doesn’t make a melody. Most good lines use only a few of these notes at a time.',
      next: `Next, the chords hiding inside ${key} major.`,
    },
    practice: [
      ...scaleChecks(ctx),
      {
        kind: 'play',
        id: 'check-memory',
        fromMemory: true,
        body: `From memory: ${key} Ionian, up and back down, in time. Nothing on the screen this time.`,
        rungs: [{ step: 'ascdesc-pa', label: 'In time' }],
        right: `From memory and in time. ${key} major is yours.`,
        why: {
          title: 'Why from memory',
          paragraphs: [
            'Reading notes and knowing them are different things. Once a scale is in your hands, you can listen instead of looking.',
          ],
        },
      } satisfies PlayScreen,
    ] as unknown as readonly [CheckedScreen, CheckedScreen, CheckedScreen],
  };

  const chords: GuidedChapter = {
    id: 'B',
    name: 'Chords',
    hook: {
      kind: 'hook',
      id: 'hook',
      hear: 'triad-progression-1-pa',
      title: 'One scale, seven chords.',
      body: `Hear it. Every chord in that progression uses only notes from ${key} major. You’re about to build each of them.`,
    },
    screens: [
      {
        kind: 'play',
        id: 'triads',
        body: 'A **triad** is three notes from the scale, each skipping one. For each chord: play its notes going up, then hold them together.',
        rungs: rungsFor(/^triad-\d/, chordLabel),
        right: `That’s every chord in ${key} major, all seven.`,
        faults: {
          missed:
            'Going up is easy to rush. Have the whole shape ready before you play the held chord.',
        },
        why: chordsWhy(key, notes),
      },
      {
        kind: 'choose',
        id: 'spell-it',
        body: `Chord 1 in ${key} starts on ${key}. Chord 4 starts on ${notes[3]}.`,
        question: 'Which notes make chord 4?',
        correct: 'right',
        right: `${notes[3]}, ${notes[5]} and ${notes[0]}. Take one, skip one, take one, skip one, take one.`,
        choices: [
          { id: 'right', text: `${notes[3]}, ${notes[5]}, ${notes[0]}` },
          {
            id: 'neighbours',
            text: `${notes[3]}, ${notes[4]}, ${notes[5]}`,
            feedback: 'Those are neighbours. A chord skips a note each time.',
          },
          {
            id: 'five',
            text: `${notes[4]}, ${notes[6]}, ${notes[1]}`,
            feedback: 'That’s chord 5, built from the next note up.',
          },
        ],
        why: {
          title: 'Why 1, 4 and 5 are major',
          paragraphs: [
            'Those three chords all have the wider gap at the bottom, which makes them major. Chords 2, 3 and 6 have the narrower gap, which makes them minor. Chord 7 is narrow twice, which makes it diminished.',
            'The spacing of the scale decides all of that, so it’s the same in every major key.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'progressions',
        body: 'Chords mean most in order. Play each progression, one chord to a bar, and move right on the new bar.',
        rungs: rungsFor(/^triad-progression/, progressionLabel),
        right: 'Those are real progressions. You’ll hear them in songs now.',
        faults: {
          late: 'You’re landing late on the changes. Get the next shape ready before the bar ends.',
        },
        why: {
          title: 'Why order matters',
          paragraphs: [
            'Each chord sets up the next. The 5 chord wants to resolve to the 1, so ending a line on 5 leaves you waiting, and going on to 1 feels like arriving.',
          ],
        },
      },
      {
        kind: 'explain',
        id: 'one-more',
        body: `Keep going, skipping one more note, and you get a **7th chord**: four notes instead of three. On ${key}, that’s ${notes[0]}, ${notes[2]}, ${notes[4]} and ${notes[6]}.`,
        show: { step: 'seventh-1-arp-pa' },
      },
      {
        kind: 'play',
        id: 'sevenths',
        body: 'Same routine, one note more: going up, then held together.',
        rungs: rungsFor(/^seventh-\d/, chordLabel),
        right: 'All seven 7th chords. That’s a much richer palette.',
        why: {
          title: 'What the extra note does',
          paragraphs: [
            'The 7th makes a chord fuller, and gives it a more specific colour. It’s most of the sound of jazz, soul and a lot of R&B.',
            'Chord 5 gets the 5 dom7, the one chord in the key with real pull, because it contains that half step leading home and a tense interval besides.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'seventh-progressions',
        body: 'Now the same idea with four-note chords.',
        rungs: rungsFor(/^seventh-progression/, progressionLabel),
        right: 'Those chords are fuller, and they want to move even more.',
        why: {
          title: 'Why 7ths move so well',
          paragraphs: [
            'With four notes, neighbouring chords often share notes, or move by a single step. Your hand barely has to travel, and the harmony sounds smoother for it.',
          ],
        },
      },
    ],
    takeaway: {
      kind: 'takeaway',
      id: 'takeaway',
      body: `That’s every chord in ${key} major, in triads and in 7ths.`,
      points: [
        'A **triad** takes every other note of the scale, three times. A **7th chord** does it four times.',
        'Chords 1, 4 and 5 are major, 2, 3 and 6 are minor, and 7 is diminished.',
        'They’re numbered, so what you learn here works in every key.',
      ],
      inSession: `Choose any three chords from ${key} major, and loop them. Finish on chord 5, then on chord 1, and listen to how differently each one ends.`,
      limits:
        'Songs borrow chords from outside the key all the time. This is the home set, not the whole map.',
      next: `Now try the same lesson in another key.`,
    },
    practice: [
      {
        kind: 'choose',
        id: 'check-quality',
        body: 'No hints from here.',
        question: 'In any major key, which chord is diminished?',
        correct: 'seven',
        right: 'Chord 7. It’s narrow at the bottom and narrow on top.',
        choices: [
          {
            id: 'two',
            text: 'Chord 2',
            feedback:
              'Chord 2 is minor. Try the one with the top note of the scale.',
          },
          {
            id: 'five',
            text: 'Chord 5',
            feedback: 'Chord 5 is major, and it pulls strongly home.',
          },
          { id: 'seven', text: 'Chord 7' },
        ],
        why: {
          title: 'The odd one out',
          paragraphs: [
            'Only chord 7 has two narrow gaps. That tightness is why it sounds so unsettled, and why it rarely stands alone.',
          ],
        },
      },
      {
        kind: 'choose',
        id: 'check-five',
        body: `The 5 chord in ${key} starts on ${e}.`,
        question: 'Which notes make it?',
        correct: 'right',
        right: `${e}, ${g} and ${notes[1]}. That ${g} is what pulls home to ${key}.`,
        choices: [
          { id: 'right', text: `${e}, ${g}, ${notes[1]}` },
          {
            id: 'one',
            text: `${notes[0]}, ${c}, ${e}`,
            feedback: 'That’s chord 1, the home chord.',
          },
          {
            id: 'neighbours',
            text: `${e}, ${notes[5]}, ${g}`,
            feedback: 'Those are neighbours. A chord skips a note each time.',
          },
        ],
        why: {
          title: 'Why the 5 chord pulls',
          paragraphs: [
            `It contains ${g}, the note a half step under ${key}. Half steps want to close, so this chord wants to go home.`,
          ],
        },
      },
      {
        kind: 'play',
        id: 'check-memory',
        fromMemory: true,
        body: 'From memory: the same progression you heard at the start, one chord to a bar.',
        rungs: [{ step: 'triad-progression-1-pa', label: 'In time' }],
        right: `From memory. ${key} major’s chords are yours.`,
        why: {
          title: 'Why from memory',
          paragraphs: [
            'Once you’re not reading, you can hear where the chords are going, and that’s what lets you play them in a song.',
          ],
        },
      },
    ],
  };
  return [melody, chords];
}

// ── On guitar ──────────────────────────────────────────────────────────────

export interface GuitarChordNames {
  /** A step's chord as shown: "C", "D min". */
  of: (step: string) => string;
}

export function ionianGuitarChapters(
  ctx: IonianKey,
  names: GuitarChordNames,
): readonly GuidedChapter[] {
  const { key, notes } = ctx;
  const [, , c, , e, , g] = notes;
  const arpeggios = (section: string, first: number, count: number): Rung[] =>
    Array.from({ length: count }, (_, i) => {
      const own = `${section}.${first + i * 2}`;
      const inTime = `${section}.${first + i * 2 + 1}`;
      return pair(own, inTime, names.of(own));
    }).flat();

  const melody: GuidedChapter = {
    id: 'A',
    name: 'Melody',
    hook: {
      kind: 'hook',
      id: 'hook',
      hear: 'A1.6',
      title: 'Seven notes make a key.',
      body: `Hear it. That’s **${key} Ionian**, the major scale: ${notes.join(', ')}. Nearly everything in ${key} major is drawn from these seven.`,
    },
    screens: [
      {
        kind: 'play',
        id: 'up',
        body: 'Play the scale from its lowest note to its highest, using the position shown. First the notes wait for you, then you keep time.',
        rungs: pair('A1.1', 'A1.2'),
        right: `That’s ${key} major, in one position on the neck.`,
        why: scaleWhy(key),
      },
      {
        kind: 'explain',
        id: 'positions',
        body: `These same seven notes run all the way up the neck. Each of these **positions** is one place to play them, and the spacing never changes: whole, whole, half, whole, whole, whole, half.`,
        show: { overview: 'overview' },
      },
      findTheNotes({ ...ctx, face: 'names' }),
      WHICH_INTERVALS,
      {
        kind: 'play',
        id: 'down',
        body: 'Now from the top down. Your picking and your fingers don’t mirror themselves, so it’s worth practising on its own.',
        rungs: pair('A1.3', 'A1.4'),
        right: 'Coming down clean. That’s its own skill.',
        why: {
          title: 'Why practise it downwards',
          paragraphs: [
            'Going up, you add fingers. Coming down, you lift them off, and the note underneath has to be ready. Different muscles, different habit.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'both',
        body: 'Up to the top and back down again, without a break.',
        rungs: pair('A1.5', 'A1.6'),
        right:
          'Up and back without stopping: the whole position, under your hand.',
        why: {
          title: 'Why the turnaround is the hard part',
          paragraphs: [
            'At the top, your hand changes direction without a gap in the beat. Practising it here means it won’t catch you out in a melody.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'phrase',
        body: 'Scales are the raw material. Here’s a three-note phrase from them, then two of them joined together.',
        rungs: [
          ...pair('A2.1', 'A2.2', 'Short'),
          ...pair('A2.3', 'A2.4', 'Longer'),
        ],
        right: 'Same seven notes, and now they’re saying something.',
        why: {
          title: 'What a contour is',
          paragraphs: [
            'A contour is the shape a melody makes: up, down, leaping or stepping. The ear remembers the shape long before it remembers the notes.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'articulation',
        body: 'Same phrase, different touch: **staccato** is short and detached, **legato** is long and connected, then a mix of the two.',
        rungs: [
          { step: 'A3.1', label: 'Staccato' },
          { step: 'A3.2', label: 'Legato' },
          { step: 'A3.3', label: 'Mixed' },
          { step: 'A3.4', label: 'Mixed, longer' },
        ],
        right: 'Same notes, different characters. That’s touch.',
        faults: {
          long: 'Those are ringing too long. Lift the finger or mute the string to stop each note.',
          short:
            'Those are stopping too soon. Keep the finger down until the next note.',
        },
        why: articulationWhy,
      },
      {
        kind: 'play',
        id: 'pentatonic',
        body: 'Take two notes out and you have the **major pentatonic**: five notes, with no half steps. It’s the shape behind countless solos.',
        rungs: [
          ...pair('A4.1', 'A4.2', 'Up'),
          ...pair('A4.3', 'A4.4', 'Down'),
          ...pair('A4.5', 'A4.6', 'Both'),
        ],
        right: 'Five notes, and hardly any way to clash.',
        why: {
          title: 'Why five notes work so well',
          paragraphs: [
            `The two notes it leaves out, ${notes[3]} and ${g}, are the ones a half step from a neighbour. Those are the notes that can rub against a chord.`,
            'Without them, you can play almost anything over the key’s usual chords, which makes it the easiest place to start improvising.',
          ],
        },
      },
    ],
    takeaway: {
      kind: 'takeaway',
      id: 'takeaway',
      body: `That’s ${key} major on the neck: the notes, the spacing, and two scales to play with.`,
      points: [
        `**${key} Ionian** is ${notes.join(', ')}.`,
        'On the neck, a half step is one fret, and a whole step is two.',
        'The major pentatonic leaves those half steps out.',
      ],
      inSession: `Over a ${key} chord, improvise in this one position using only the pentatonic. Then add ${notes[3]} and ${g} back in, and listen for what they do.`,
      limits:
        'One position isn’t the whole neck. The other positions are the same notes, and they’re worth learning next.',
      next: `Next, the chords hiding inside ${key} major.`,
    },
    practice: [
      ...scaleChecks(ctx),
      {
        kind: 'play',
        id: 'check-memory',
        fromMemory: true,
        body: `From memory: ${key} Ionian, up and back down, in time, in the position you’ve been using.`,
        rungs: [{ step: 'A1.6', label: 'In time' }],
        right: `From memory and in time. ${key} major is yours.`,
        why: {
          title: 'Why from memory',
          paragraphs: [
            'Once a position is in your hands you can look away from the neck, and listen to what you’re playing instead.',
          ],
        },
      } satisfies PlayScreen,
    ] as unknown as readonly [CheckedScreen, CheckedScreen, CheckedScreen],
  };

  const chords: GuidedChapter = {
    id: 'B',
    name: 'Chords',
    hook: {
      kind: 'hook',
      id: 'hook',
      hear: 'B2.4',
      title: 'One scale, seven chords.',
      body: `Hear it. Every chord there uses only notes from ${key} major. You’re about to learn each shape, then change between them.`,
    },
    screens: [
      {
        kind: 'play',
        id: 'first-four',
        body: 'Fret each shape, then pick its strings one at a time from low to high. That’s how you hear whether every note is ringing.',
        rungs: arpeggios('B1', 1, 4),
        right: 'Four shapes, and every note in them ringing.',
        faults: {
          wrong:
            'A string isn’t ringing as it should. Check that no finger is touching the next string.',
        },
        why: chordsWhy(key, notes),
      },
      {
        kind: 'play',
        id: 'strum-four',
        body: 'Now strum them, letting each chord ring before you move. Then in time: whole notes, half notes, then quarter notes.',
        rungs: [
          { step: 'B2.1', label: 'At your own pace' },
          { step: 'B2.2', label: 'Whole notes', credits: ['B2.1'] },
          { step: 'B2.3', label: 'Half notes' },
          { step: 'B2.4', label: 'Quarter notes' },
        ],
        right:
          'Each one faster, and the changes still land. That’s how speed is built.',
        faults: {
          late: 'You’re late on the changes. Lift off just before the beat, so that the new shape lands on it.',
        },
        why: {
          title: 'Why start slow',
          paragraphs: [
            'A change is a small move your hand has to learn. Whole notes leave plenty of time for it, and each step down gives you a little less.',
          ],
        },
      },
      {
        kind: 'choose',
        id: 'spell-it',
        body: `Chord 1 in ${key} starts on ${key}. Chord 4 starts on ${notes[3]}.`,
        question: 'Which notes make chord 4?',
        correct: 'right',
        right: `${notes[3]}, ${notes[5]} and ${notes[0]}. Take one, skip one, take one, skip one, take one.`,
        choices: [
          { id: 'right', text: `${notes[3]}, ${notes[5]}, ${notes[0]}` },
          {
            id: 'neighbours',
            text: `${notes[3]}, ${notes[4]}, ${notes[5]}`,
            feedback: 'Those are neighbours. A chord skips a note each time.',
          },
          {
            id: 'five',
            text: `${notes[4]}, ${notes[6]}, ${notes[1]}`,
            feedback: 'That’s chord 5, built from the next note up.',
          },
        ],
        why: {
          title: 'Why shapes repeat notes',
          paragraphs: [
            'A guitar chord often has five or six strings ringing, but still only three different notes. The extra strings double them in other octaves, which is why a strummed chord sounds so full.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'length',
        body: 'You can control how long a chord lasts, too. **Staccato**: mute right after you strum. **Legato**: let it ring into the next.',
        rungs: [
          { step: 'B3.1', label: 'Staccato' },
          { step: 'B3.2', label: 'Legato' },
          { step: 'B3.3', label: 'Mixed' },
        ],
        right: 'Same chords, and a completely different feel.',
        faults: {
          long: 'Those are ringing too long. Relax your fretting hand right after the strum to stop them.',
          short:
            'Those are cutting off. Keep the fingers down until the very next chord.',
        },
        why: articulationWhy,
      },
      {
        kind: 'play',
        id: 'progressions',
        body: 'Same four chords in a new order, and the rhythm gets busier each time. The last one changes rhythm from chord to chord.',
        rungs: [
          { step: 'B4.1', label: 'At your own pace' },
          { step: 'B4.2', label: 'Half notes', credits: ['B4.1'] },
          { step: 'B4.3', label: 'Quarter notes' },
          { step: 'B4.4', label: 'Eighth notes' },
          { step: 'B4.5', label: 'Changing rhythms' },
        ],
        right: 'New order, faster changes, and your hand kept up.',
        faults: {
          late: 'You’re arriving late. Practise just the change that’s slowing you down, back and forth.',
        },
        why: {
          title: 'Why a new order helps',
          paragraphs: [
            'Going 1, 2, 3, 4 lets your hand follow a pattern. A different order makes it think about each shape, and that’s much closer to playing a real song.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'next-two',
        body: 'Two more shapes to learn, the same way: pick the strings one at a time, first at your own pace, then in time.',
        rungs: arpeggios('B5', 1, 2),
        right: 'That’s six of the seven chords in the key.',
        why: {
          title: 'Why 7 waits',
          paragraphs: [
            'The seventh chord of a major key is diminished. It’s rarely played as a plain triad, so this lesson meets it as a 7th chord instead.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'strum-six',
        body: 'All six in a row: at your own pace, then whole notes, half notes and quarter notes.',
        rungs: [
          { step: 'B6.1', label: 'At your own pace' },
          { step: 'B6.2', label: 'Whole notes', credits: ['B6.1'] },
          { step: 'B6.3', label: 'Half notes' },
          { step: 'B6.4', label: 'Quarter notes' },
        ],
        right: 'Six chords, no stopping. Songs are made from less.',
        why: {
          title: 'What you can play now',
          paragraphs: [
            'With chords 1 to 6 you can play the great majority of pop, rock and folk songs in this key.',
          ],
        },
      },
      {
        kind: 'explain',
        id: 'one-more',
        body: `Keep stacking, and you get a **7th chord**: four different notes instead of three. On ${key}, that’s ${notes[0]}, ${notes[2]}, ${notes[4]} and ${notes[6]}.`,
        show: { step: 'B7.1' },
      },
      {
        kind: 'play',
        id: 'sevenths',
        body: 'Seven new shapes, all learned the same way: the strings one at a time, at your own pace and then in time.',
        rungs: arpeggios('B7', 1, 7),
        right: 'All seven 7th chords. That’s a much richer palette.',
        why: {
          title: 'What the extra note does',
          paragraphs: [
            'The 7th makes a chord fuller and gives it a more specific colour. It’s most of the sound of jazz, soul and a lot of R&B.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'strum-sevenths',
        body: 'Now strum them all in a row, and back to the first: at your own pace, then whole notes, half notes and quarter notes.',
        rungs: [
          { step: 'B8.1', label: 'At your own pace' },
          { step: 'B8.2', label: 'Whole notes', credits: ['B8.1'] },
          { step: 'B8.3', label: 'Half notes' },
          { step: 'B8.4', label: 'Quarter notes' },
        ],
        right: 'Eight chords in a row. Your hand knows the key now.',
        why: {
          title: 'Why go back to the first chord',
          paragraphs: [
            'Ending on chord 1 finishes the journey: the 7 chord leans hard towards home, and you get to feel it arrive.',
          ],
        },
      },
    ],
    takeaway: {
      kind: 'takeaway',
      id: 'takeaway',
      body: `That’s the chords of ${key} major, as triads and as 7ths.`,
      points: [
        'A chord takes every other note of the scale.',
        'Chords 1, 4 and 5 are major, 2, 3 and 6 are minor, and 7 is diminished.',
        'Slow whole notes first is how fast changes get built.',
      ],
      inSession: `Pick any two chords from ${key} major that slow you down. Change between them for a minute, as slowly as it takes to keep every note clean.`,
      limits:
        'These shapes are one way to play each chord. There are many more up the neck, and they’re worth finding.',
      next: 'Next, all of it with a band behind you.',
    },
    practice: [
      {
        kind: 'choose',
        id: 'check-quality',
        body: 'No hints from here.',
        question: 'In any major key, which chord is diminished?',
        correct: 'seven',
        right: 'Chord 7. It’s narrow at the bottom and narrow on top.',
        choices: [
          {
            id: 'two',
            text: 'Chord 2',
            feedback:
              'Chord 2 is minor. Try the one on the last note of the scale.',
          },
          {
            id: 'five',
            text: 'Chord 5',
            feedback: 'Chord 5 is major, and it pulls strongly home.',
          },
          { id: 'seven', text: 'Chord 7' },
        ],
        why: {
          title: 'The odd one out',
          paragraphs: [
            'Only chord 7 has two narrow gaps. That tightness is why it sounds so unsettled, and why it rarely stands alone.',
          ],
        },
      },
      {
        kind: 'choose',
        id: 'check-five',
        body: `The 5 chord in ${key} starts on ${e}.`,
        question: 'Which notes make it?',
        correct: 'right',
        right: `${e}, ${g} and ${notes[1]}. That ${g} is what pulls home to ${key}.`,
        choices: [
          { id: 'right', text: `${e}, ${g}, ${notes[1]}` },
          {
            id: 'one',
            text: `${notes[0]}, ${c}, ${e}`,
            feedback: 'That’s chord 1, the home chord.',
          },
          {
            id: 'neighbours',
            text: `${e}, ${notes[5]}, ${g}`,
            feedback: 'Those are neighbours. A chord skips a note each time.',
          },
        ],
        why: {
          title: 'Why the 5 chord pulls',
          paragraphs: [
            `It contains ${g}, the note a half step under ${key}. Half steps want to close, so this chord wants to go home.`,
          ],
        },
      },
      {
        kind: 'play',
        id: 'check-memory',
        fromMemory: true,
        body: 'From memory: the first four chords, in quarter notes, in time. No shapes on the screen this time.',
        rungs: [{ step: 'B2.4', label: 'In time' }],
        right: 'From memory. Those shapes are yours.',
        why: {
          title: 'Why from memory',
          paragraphs: [
            'When your eyes are free, you can watch the singer, the band or the audience, instead of your fretting hand.',
          ],
        },
      },
    ],
  };

  const playAlong: GuidedChapter = {
    id: 'D',
    name: 'Play-Along',
    hook: {
      kind: 'hook',
      id: 'hook',
      hear: 'D2.2',
      title: 'It all sounds different with a band.',
      body: 'Hear it. A track won’t wait for you, and that’s the point. Everything here is the same material, now in real time.',
    },
    screens: [
      {
        kind: 'play',
        id: 'melody',
        body: 'Your melody first, along with the track: the short phrase, then the long one.',
        rungs: [
          { step: 'D1.1', label: 'Short' },
          { step: 'D1.2', label: 'Longer' },
        ],
        right: 'Right in the pocket with the track.',
        faults: {
          early:
            'You’re getting ahead of the track. Listen to the drums, and let them come to you.',
          late: 'You’re behind the track. Listen to the drums, and start each note with them.',
        },
        why: {
          title: 'Why a track is different from a click',
          paragraphs: [
            'A click only tells you where the beat is. A band gives you something to lock with, and something to listen to.',
            'You’ll often find you play better in time with a band than with a click.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'chords',
        body: 'Now strum along: two chords, then four.',
        rungs: [
          { step: 'D2.1', label: 'Two chords' },
          { step: 'D2.2', label: 'Four chords' },
        ],
        right: 'Locked in with the track, on all four.',
        faults: {
          late: 'You’re late on the changes. Get the next shape ready before the bar ends.',
        },
        why: {
          title: 'Why keep strumming if you miss',
          paragraphs: [
            'A band doesn’t stop when somebody misses a chord. Keep your strumming hand moving, and get back in on the next change. Nobody will notice, and that’s the real skill.',
          ],
        },
      },
      {
        kind: 'choose',
        id: 'map-reading',
        body: 'Next come **Music Maps**: one line of rhythm, with the chords above it. Each has a repeat sign at the end.',
        question: 'What does a rest mean, when you’re strumming?',
        correct: 'mute',
        right: 'Silence. Mute the strings so that the chord stops ringing.',
        choices: [
          {
            id: 'ring',
            text: 'Let the chord ring through it',
            feedback:
              'A ringing chord isn’t silent. The rest asks you to stop the sound.',
          },
          {
            id: 'change',
            text: 'Change to the next chord',
            feedback:
              'You may change during it, but what a rest asks for is silence.',
          },
          { id: 'mute', text: 'Mute the strings' },
        ],
        why: {
          title: 'Why silence counts',
          paragraphs: [
            'Rests are part of the rhythm. Stopping a chord cleanly is what makes a groove sound tight, and leaving it ringing blurs it all together.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'maps',
        body: 'Five maps, each one longer. Play each in the rhythm shown, and twice through for the repeat sign.',
        rungs: [
          { step: 'D3.1', label: 'One bar' },
          { step: 'D3.2', label: 'Two bars' },
          { step: 'D3.3', label: 'Two more' },
          { step: 'D3.4', label: 'Four bars' },
          { step: 'D3.5', label: 'Four more' },
        ],
        right:
          'That’s reading music in real time. Most songs are this, written out.',
        faults: {
          long: 'The rests aren’t silent yet. Mute the strings to stop each chord.',
        },
        why: {
          title: 'What you’re really learning',
          paragraphs: [
            'A song chart is just a Music Map that’s longer. Once you can read one, you can sit in on a song you’ve never played before.',
          ],
        },
      },
    ],
    takeaway: {
      kind: 'takeaway',
      id: 'takeaway',
      body: `That’s ${key} major: its notes, its chords, and playing them with a band.`,
      points: [
        'A track gives you something to lock in with.',
        'Keep your strumming hand moving, even when you miss.',
        'Rests are silence, so mute the strings.',
      ],
      inSession: `Find a song in ${key} major, and play along with the recording. Start with just chord 1 on the first beat of each bar, then build up.`,
      limits:
        'Real songs have changes this lesson doesn’t cover. When a chord isn’t one of these, it’s usually borrowed from outside the key.',
      next: 'Now try the same lesson in another key.',
    },
    practice: [
      {
        kind: 'choose',
        id: 'check-rest',
        body: 'No hints from here.',
        question: 'A chord map has a repeat sign at its end. What do you do?',
        correct: 'twice',
        right: 'Play it twice through.',
        choices: [
          { id: 'twice', text: 'Play it twice through' },
          {
            id: 'stop',
            text: 'Stop and start the next one',
            feedback:
              'A repeat sign sends you back to the start before you move on.',
          },
          {
            id: 'slower',
            text: 'Play it again, slower',
            feedback:
              'The tempo stays the same. It just sends you back to the start.',
          },
        ],
        why: {
          title: 'Repeat signs',
          paragraphs: [
            'Charts use them to save space. Repeating four bars is one of the most common things in music.',
          ],
        },
      },
      {
        kind: 'choose',
        id: 'check-miss',
        body: 'You miss a chord change while playing with a band.',
        question: 'What should you do?',
        correct: 'keep',
        right:
          'Keep your strumming hand moving, and rejoin on the next change.',
        choices: [
          {
            id: 'stop',
            text: 'Stop until you find it',
            feedback:
              'The band keeps going, and stopping is what everyone will hear.',
          },
          { id: 'keep', text: 'Keep moving, and rejoin on the next change' },
          {
            id: 'restart',
            text: 'Go back to the first chord',
            feedback:
              'That puts you somewhere other than the band. Go forward, not back.',
          },
        ],
        why: {
          title: 'Recovering',
          paragraphs: [
            'The rhythm of your right hand carries more than the exact chord does. Keep it going, and most listeners won’t notice the slip.',
          ],
        },
      },
      {
        kind: 'play',
        id: 'check-memory',
        fromMemory: true,
        body: 'From memory: the two chords, strummed along with the track.',
        rungs: [{ step: 'D2.1', label: 'Two chords' }],
        right: 'From memory, with a band behind you.',
        why: {
          title: 'Why from memory',
          paragraphs: [
            'This is what playing with people is like: nothing on the screen, and you’re listening to them instead.',
          ],
        },
      },
    ],
  };

  return [melody, chords, playAlong];
}
