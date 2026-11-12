import { squeezeAt, wavesAcross } from '../../lab/physics/particles';
import { doScreenFor, type LessonScript } from '../types';

// ── Physics of Sound ───────────────────────────────────────────────────────
// What sound is, through the question of why moving a mic changes it: a wave takes
// time to arrive, so one hit reaches two mics at different moments, and a wave is
// pressure, so it can push two mics in opposite ways.

export interface AirScene {
  /** The room mic is up. */
  room: boolean;
  /** How far the room mic is from the kit. */
  metres: number;
  /** How far its track has been moved: negative is earlier. */
  nudgeMs: number;
  /** A student's mark in the air, 0 to 1 across it. */
  mark: number | null;
  /** The polarity button is set so that both mics agree. */
  polarityFixed: boolean;
}

const SPEED_OF_SOUND = 343;

/** How long sound takes to cross a distance in air. */
export const lateMs = (metres: number) => (metres / SPEED_OF_SOUND) * 1000;

/** Where the room mic's hit lands against the close mic's. */
export const offsetMs = (scene: Pick<AirScene, 'metres' | 'nudgeMs'>) =>
  lateMs(scene.metres) + scene.nudgeMs;

/** The frozen moments, one for the lesson and one for its skill check. */
export const MARK_MOMENTS = {
  'air-mark': { hz: 440, phase: 0.2 },
  'air-mark-2': { hz: 660, phase: 0.55 },
} as const;

/** How close counts as lined up. */
const ALIGNED_MS = 0.5;

const doScreen = doScreenFor<AirScene>();

const markVerdict =
  ({ hz, phase }: { hz: number; phase: number }) =>
  (scene: AirScene) => {
    const found = squeezeAt(scene.mark ?? 0, phase, wavesAcross(hz));
    if (scene.mark == null || found === 'between') {
      return { ok: false as const, mistake: 'between' as const };
    }
    if (found === 'rarefaction') {
      return { ok: false as const, mistake: 'rarefaction' as const };
    }
    return { ok: true as const };
  };

/** A place in the air at some fraction of a wave past a compression. */
const placeIn = (
  { hz, phase }: { hz: number; phase: number },
  wavesPast: number,
) => {
  const waves = wavesAcross(hz);
  return (phase + 1 + wavesPast) / waves;
};

const alignVerdict = (scene: AirScene) => {
  const offset = offsetMs(scene);
  if (offset > ALIGNED_MS)
    return { ok: false as const, mistake: 'late' as const };
  if (offset < -ALIGNED_MS) {
    return { ok: false as const, mistake: 'early' as const };
  }
  return { ok: true as const };
};

export const PHYSICS_SCRIPT: LessonScript<AirScene> = {
  id: 'physics-of-sound',
  needs: ['kick', 'snare', 'hats'],
  initial: {
    room: false,
    metres: 1,
    nudgeMs: 0,
    mark: null,
    polarityFixed: false,
  },
  hook: {
    kind: 'hook',
    id: 'hook',
    view: 'room',
    title: 'Why does moving a mic change the sound?',
    body: 'Press play, then switch on the room mic. It’s the same kit, picked up one metre further back, and the drums change more than a little extra level would explain.',
    caption:
      'A model: the room mic here is the same dry sound, later and quieter, with no room.',
  },
  screens: [
    {
      kind: 'choose',
      id: 'pulse',
      view: 'pulse',
      quiet: true,
      scene: { room: true },
      body: 'So what actually travels from the kit to that mic? Send a pulse across this air, and watch the coloured particle against its tick.',
      question: 'What happens to the coloured particle?',
      correct: 'back',
      right:
        'It nudges its neighbour and goes back. The push crossed, and the air stayed put.',
      choices: [
        { id: 'back', text: 'It moves a little, then returns to where it was' },
        {
          id: 'travels',
          text: 'It’s carried along to the far side',
          feedback:
            'Send another and watch its tick. It ends up exactly where it started, while the pulse carries on.',
        },
        {
          id: 'still',
          text: 'It doesn’t move at all',
          feedback:
            'Send another and watch closely: it does shift as the pulse goes by, or the push couldn’t get past it.',
        },
      ],
      why: {
        title: 'A speaker doesn’t blow wind',
        paragraphs: [
          'Each particle pushes the next and comes back. That chain of pushes reaches your ears at hundreds of metres a second, with no breeze to go with it.',
          'The air itself barely moves. At ordinary levels, a particle travels much less than the width of a hair.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'a-wave',
      view: 'pulse',
      quiet: true,
      body: 'That’s a **wave**: energy passing through something, which is called its **medium**. Nothing travels from the kit to the mic except the push.',
    },
    {
      kind: 'choose',
      id: 'race',
      view: 'race',
      quiet: true,
      body: 'The medium sets the speed. Send one pulse down all four lanes, drawn to scale.',
      question: 'Which carries it fastest?',
      correct: 'steel',
      right:
        'Steel, about 15 times faster than air. Stiffer material passes the push along more quickly.',
      choices: [
        { id: 'steel', text: 'Steel' },
        {
          id: 'water',
          text: 'Water',
          feedback:
            'Water beats air by a long way, but look at the steel lane.',
        },
        {
          id: 'air',
          text: 'Air',
          feedback: 'Air is the slowest of the three that carry it at all.',
        },
        {
          id: 'vacuum',
          text: 'Vacuum',
          feedback:
            'Watch that lane: nothing crosses. With no particles, there’s nothing to pass the push along.',
        },
      ],
      why: {
        title: 'Why this matters near a mic',
        paragraphs: [
          'A foot on the floor reaches a mic through its stand before any sound arrives through the air, and stands pass bumps very well. That’s what a **shock mount** is for.',
          'And with no medium there’s nothing to carry the push, which is why space is silent.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'how-fast',
      view: 'lanes',
      scene: { room: true, metres: 1, nudgeMs: 0 },
      body: 'In air, sound travels about 343 metres a second. That’s slow enough to matter: roughly **3 ms a metre**. Here’s one snare hit on two tracks, and the room mic’s lands late.',
    },
    doScreen<'close' | 'far'>({
      id: 'distance',
      view: 'distance',
      scene: { room: true, metres: 1, nudgeMs: 0 },
      body: 'Slide the room mic back until the hit reaches it **10 ms** after the close mic. Press play, and listen as it moves.',
      right:
        'About 3.4 metres. That’s why the sound changes: the same hit arrives twice.',
      feedback: {
        close:
          'Not far enough: it’s landing less than 9 ms late. Move the mic further back.',
        far: 'Too far: it’s landing more than 11 ms late. Bring the mic closer.',
      },
      evaluate: (scene) => {
        const late = lateMs(scene.metres);
        if (late < 9) return { ok: false, mistake: 'close' };
        if (late > 11) return { ok: false, mistake: 'far' };
        return { ok: true };
      },
      answer: { metres: 3.4 },
      probes: [
        { scene: { metres: 1 }, expect: 'close' },
        { scene: { metres: 8 }, expect: 'far' },
        { scene: { metres: 3.4 }, expect: 'ok' },
      ],
      why: {
        title: 'Why it sounds thin before it sounds late',
        paragraphs: [
          'Time is distance ÷ speed: 3.4 ÷ 343 is 0.0099 seconds, or about 10 ms.',
          'Under roughly 30 ms, you don’t hear two hits. The two copies add at some frequencies and cancel at others, which sounds thin or hollow. Further back, it starts to become a flam.',
          'You’ll hear much more of this in How Waves Combine.',
        ],
      },
    }),
    doScreen<'late' | 'early'>({
      id: 'align',
      view: 'align',
      scene: { room: true, metres: 3.4, nudgeMs: 0 },
      body: 'That lateness can be fixed. Zoom in and nudge the room track earlier until its hit lines up with the close mic. This is called **time alignment**.',
      right: 'Lined up, and the hit gets its weight back.',
      feedback: {
        late: 'Still late: its hit starts after the close mic’s. Keep nudging it earlier.',
        early: 'Too far: it now starts before the close mic. Ease it back.',
      },
      evaluate: alignVerdict,
      answer: { nudgeMs: -9.9 },
      probes: [
        { scene: { nudgeMs: -3 }, expect: 'late' },
        { scene: { nudgeMs: -15 }, expect: 'early' },
        { scene: { nudgeMs: -9.9 }, expect: 'ok' },
      ],
      why: {
        title: 'When to nudge, and when not to',
        paragraphs: [
          'A room mic hears the whole kit from one spot, so lining it up on the snare only fixes the snare exactly.',
          'Many engineers leave room mics late on purpose, since that delay is part of what makes a room sound big. Nudge when two mics on one source sound thin, not out of habit.',
        ],
      },
    }),
    doScreen<'rarefaction' | 'between'>({
      id: 'find-compression',
      view: 'air-mark',
      quiet: true,
      scene: { mark: null },
      body: 'Now the wave itself. A speaker pushing on air makes the particles bunch and spread as the wave travels. This moment is frozen: mark a spot where they’re bunched tightest.',
      right: 'That’s where the air is squeezed, and its pressure is highest.',
      feedback: {
        rarefaction:
          'They’re spread apart here, the opposite of bunched. Look for the crowded band.',
        between: 'Close. Move to where they’re bunched tightest.',
      },
      evaluate: markVerdict(MARK_MOMENTS['air-mark']),
      answer: { mark: placeIn(MARK_MOMENTS['air-mark'], 0) },
      probes: [
        {
          scene: { mark: placeIn(MARK_MOMENTS['air-mark'], 0.5) },
          expect: 'rarefaction',
        },
        {
          scene: { mark: placeIn(MARK_MOMENTS['air-mark'], 0.25) },
          expect: 'between',
        },
        {
          scene: { mark: placeIn(MARK_MOMENTS['air-mark'], 0) },
          expect: 'ok',
        },
      ],
      why: {
        title: 'What your ears and a mic feel',
        paragraphs: [
          'An eardrum and a mic’s diaphragm both respond to air pressure. As these bands pass, they’re pushed in and let out, over and over.',
          'That’s all a sound is by the time it arrives: pressure rising and falling.',
        ],
      },
    }),
    {
      kind: 'explain',
      id: 'pressure',
      view: 'air',
      quiet: true,
      body: '**Compression** is bunched air at high pressure. **Rarefaction** is spread-out air at low pressure. The curve under them is a graph of that pressure, not the shape of anything in the air.',
    },
    {
      kind: 'choose',
      id: 'read-the-wave',
      view: 'air',
      quiet: true,
      body: 'That same graph is what your DAW draws, with time running along it instead of distance.',
      question: 'So what does the top of a waveform show?',
      correct: 'pressure',
      right:
        'Above the line is high pressure, below it is low. A waveform is the pressure at the mic over time.',
      choices: [
        { id: 'pressure', text: 'High pressure at the mic' },
        {
          id: 'pitch',
          text: 'A higher note',
          feedback:
            'Pitch is how close together the peaks are, not how high one goes.',
        },
        {
          id: 'air',
          text: 'Air moving up, like a ripple on water',
          feedback:
            'Sound travels along the way it’s going, with no up or down in it. Up on the graph only means more pressure.',
        },
      ],
      why: {
        title: 'Not a picture of the air',
        paragraphs: [
          'A sound wave in air has no height. Drawings of it plot pressure upward because that’s easy to read.',
          'On a recording, a mic turned that pressure into voltage and a converter into numbers, so the shape you see still follows the air.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'two-sides',
      view: 'snare',
      quiet: true,
      body: 'Now put two mics on one snare. A hit drives the top head down: away from the mic above, toward the mic below. One gets a rarefaction while the other gets a compression.',
    },
    {
      kind: 'ab',
      id: 'polarity',
      view: 'polarity',
      scene: { metres: 1, nudgeMs: 0 },
      body: 'So those two mics fight. Desks and DAWs have a **polarity** button, often marked Ø, that turns one signal upside down. Here’s the snare both ways.',
      caption:
        'A model: the bottom mic here is this same snare, darker and a little quieter.',
      question: 'Which has the button set right?',
      a: { polarityFixed: true },
      b: { polarityFixed: false },
      correct: 'a',
      choiceA: 'this one has it right',
      choiceB: 'this one has it right',
      right:
        'That’s the fuller one. Both mics now push the same way, so the snare’s body adds up.',
      wrong:
        'Listen for the body of the snare. One setting has lost it, and sounds thin and papery.',
      why: {
        title: 'Polarity, not phase',
        paragraphs: [
          'The button flips a signal upside down, with no change in timing, even though many desks label it phase.',
          'Try it on any two mics on one source, and keep whichever sounds fuller. Real mics differ, so bad polarity sounds thin rather than silent.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    view: 'lanes',
    scene: { room: true, metres: 3.4, nudgeMs: -9.9, polarityFixed: true },
    body: 'So moving a mic changes the sound because sound takes time to arrive, and because a wave is pressure, which can push two mics in opposite ways.',
    points: [
      'A wave moves energy through a medium, not the medium itself.',
      'In air, sound takes about 3 ms a metre.',
      'Compression is high pressure, rarefaction is low, and a waveform draws both.',
    ],
    inSession:
      'If two mics on one source sound thin, check polarity first. Then zoom in and nudge, at about 3 ms a metre. Keep whichever sounds fuller.',
    limits:
      'The speed shifts a little with temperature, and nudging fixes timing for one source at a time. Room mics are often best left late, so let your ears decide.',
    next: 'Next: Hear the Kit.',
  },
  practice: [
    doScreen<'rarefaction' | 'between'>({
      id: 'practice-mark',
      view: 'air-mark-2',
      quiet: true,
      scene: { mark: null },
      body: 'A new moment, at a higher pitch. Mark a compression.',
      right: 'Bunched tightest, so the pressure is highest.',
      feedback: {
        rarefaction: 'That’s a rarefaction: spread apart, with low pressure.',
        between: 'Close. Move to where they’re bunched tightest.',
      },
      evaluate: markVerdict(MARK_MOMENTS['air-mark-2']),
      answer: { mark: placeIn(MARK_MOMENTS['air-mark-2'], 0) },
      probes: [
        {
          scene: { mark: placeIn(MARK_MOMENTS['air-mark-2'], 0.5) },
          expect: 'rarefaction',
        },
        {
          scene: { mark: placeIn(MARK_MOMENTS['air-mark-2'], 0.25) },
          expect: 'between',
        },
        {
          scene: { mark: placeIn(MARK_MOMENTS['air-mark-2'], 0) },
          expect: 'ok',
        },
      ],
      why: {
        title: 'Closer together at higher pitches',
        paragraphs: [
          'A higher note has shorter waves, so there are more compressions in the same stretch of air. Each one still means the same thing.',
        ],
      },
    }),
    {
      kind: 'choose',
      id: 'practice-late',
      view: 'none',
      quiet: true,
      body: 'A room mic sits 6 metres from the kit.',
      question: 'About how late does the sound reach it?',
      correct: 'eighteen',
      right: 'Six metres at about 3 ms each.',
      choices: [
        {
          id: 'two',
          text: 'About 2 ms',
          feedback:
            'That’s less than a metre away. Allow about 3 ms for each metre.',
        },
        { id: 'eighteen', text: 'About 18 ms' },
        {
          id: 'sixty',
          text: 'About 60 ms',
          feedback:
            'That’s about 20 metres away. Allow about 3 ms for each metre.',
        },
      ],
      why: {
        title: 'A sum to do in your head',
        paragraphs: [
          'Exactly, it’s 6 ÷ 343, or 17.5 ms. Three milliseconds a metre is close enough to know what you’re looking for when you zoom in.',
        ],
      },
    },
    doScreen<'late' | 'early'>({
      id: 'practice-align',
      view: 'align',
      scene: { room: true, metres: 2, nudgeMs: 0, polarityFixed: true },
      body: 'This room mic is 2 metres back. Line its track up with the close mic.',
      right: 'Lined up.',
      feedback: {
        late: 'Still late. Nudge it earlier.',
        early: 'Too far: it’s now ahead. Ease it back.',
      },
      evaluate: alignVerdict,
      answer: { nudgeMs: -5.8 },
      probes: [
        { scene: { nudgeMs: -2 }, expect: 'late' },
        { scene: { nudgeMs: -9 }, expect: 'early' },
        { scene: { nudgeMs: -5.8 }, expect: 'ok' },
      ],
      why: {
        title: 'Same sum, shorter nudge',
        paragraphs: ['Two metres at about 3 ms each is about 6 ms.'],
      },
    }),
  ],
};
