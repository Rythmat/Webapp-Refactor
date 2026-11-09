import type { StemId } from '../../mix/stems';
import { doScreenFor, type LessonScript } from '../types';

// ── Gain Staging ───────────────────────────────────────────────────────────
// The level at the microphone, the one knob you can't fix later. The mic's own
// parts are on the stage for what the signal is, and a preamp and converter for
// what happens to it. How much each source puts out is a model, and the page says
// so: real mics and players vary a good deal.

export type TakeStem = Extract<StemId, 'snare' | 'kick' | 'bass'>;

export interface GainScene {
  stem: TakeStem;
  /** The preamp, in decibels. */
  gain: number;
  /** After the converter, for playing it back. */
  fader: number;
  /** Playback set to one loudness, so that the ear isn't swayed by level. */
  matched: boolean;
}

/** What each source reaches the converter at with the preamp at 0, in dBFS. */
export const MODEL_PEAK: Readonly<Record<TakeStem, number>> = {
  snare: -40,
  kick: -38,
  bass: -24,
};

export const TARGET_LOW = -18;
export const TARGET_HIGH = -10;

export const peakOf = (scene: Pick<GainScene, 'stem' | 'gain'>) =>
  MODEL_PEAK[scene.stem] + scene.gain;

type Level = 'far' | 'near' | 'hot' | 'clipped';

const levelVerdict = (scene: GainScene) => {
  const peak = peakOf(scene);
  if (peak > 0) return { ok: false as const, mistake: 'clipped' as const };
  if (peak > TARGET_HIGH)
    return { ok: false as const, mistake: 'hot' as const };
  if (peak < -24) return { ok: false as const, mistake: 'far' as const };
  if (peak < TARGET_LOW)
    return { ok: false as const, mistake: 'near' as const };
  return { ok: true as const };
};

const doScreen = doScreenFor<GainScene>();

const NAMES: Readonly<Record<string, string>> = {
  grille: 'The grille',
  grilleBand: 'The grille’s band',
  windscreen: 'The windscreen',
  capsule: 'The capsule’s housing',
  diaphragm: 'The diaphragm',
  voiceCoil: 'The voice coil',
  magnet: 'The magnet',
  shockMount: 'The shock mount',
  handle: 'The handle',
  switch: 'The switch',
  xlrPins: 'The XLR pins',
  xlrConnector: 'The XLR connector',
  cable: 'The cable',
};

const named = (term: string) => NAMES[term] ?? 'That part';

export const GAIN_SCRIPT: LessonScript<GainScene> = {
  id: 'gain-staging',
  needs: ['snare', 'kick', 'bass'],
  initial: { stem: 'snare', gain: 0, fader: 0, matched: false },
  hook: {
    kind: 'hook',
    id: 'hook',
    quiet: true,
    view: 'mic',
    title: 'A red light can ruin a great take for good.',
    body: 'Before a single fader moves, one knob decides how the recording goes. To see why, start with what comes out of the mic.',
  },
  screens: [
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-diaphragm',
      quiet: true,
      view: 'mic',
      body: 'Sound passes through the grille and foam. Tap the part it then sets moving: the thin dome that starts turning air into electricity.',
      target: 'diaphragm',
      right: 'The diaphragm. It’s light enough to copy the air’s movement.',
      wrong: (term) =>
        `${named(term)} doesn’t move with the air. Look for a thin dome at the front of the capsule.`,
      why: {
        title: 'The first thing to move',
        paragraphs: [
          'Sound reaches a microphone as tiny changes in air pressure. The diaphragm is pushed and pulled by them, thousands of times a second.',
          'Everything after this depends on how closely it follows the air, which is one reason different mics sound different.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'show',
      id: 'coil',
      quiet: true,
      view: 'mic',
      term: 'voiceCoil',
      body: 'The dome drags this coil of wire through a magnet’s field, which makes a voltage: the sound as a **signal**. It’s tiny, often only a couple of **millivolts**.',
    },
    {
      kind: 'choose',
      id: 'why-preamp',
      quiet: true,
      view: 'mic-coil',
      body: 'So here’s your signal, on its way to the interface.',
      question: 'Why can’t it go straight into the converter?',
      correct: 'small',
      right:
        'It’s far too small: converters want about a volt, hundreds of times more.',
      choices: [
        { id: 'small', text: 'It’s far too small' },
        {
          id: 'phantom',
          text: 'It needs phantom power first',
          feedback:
            'This kind of mic makes its own voltage. Phantom power is for condensers, and doesn’t make the signal bigger.',
        },
        {
          id: 'cable',
          text: 'The cable adds too much noise',
          feedback:
            'Balanced XLR cables keep noise low. The problem is the size of the signal.',
        },
      ],
      why: {
        title: 'About 56 dB',
        paragraphs: [
          'Studio line level is about 1.23 V, and 2 mV up to 1.23 V is 20 × log₁₀(1.23 ÷ 0.002), which is close to 56 dB.',
          'Quiet sources and low-output mics may need more, and loud ones less. That’s why every preamp has a knob.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'what-gain-is',
      view: 'chain',
      scene: { stem: 'snare', gain: 0 },
      body: 'That’s a **preamp**, and how much it raises the signal is its **gain**. Then a converter turns it into numbers, and it hits the same ceiling as before: 0 dBFS. Above that, nothing’s recorded.',
    },
    doScreen<Level>({
      id: 'set-gain',
      view: 'chain',
      scene: { stem: 'snare', gain: 0 },
      body: 'Press play and have the drummer hit hard. Set the gain so the snare’s peaks land between **−18 and −10 dBFS**.',
      caption:
        'A model: this mic and snare peak at −40 dBFS with no gain. Your speakers stay quieter than the meter says as you go past the target.',
      right:
        'Good level, with room for a harder hit. Your balance can all be done later.',
      feedback: {
        far: 'Far under the target. Keep bringing the gain up.',
        near: 'Close, and it would honestly work. Try for a little more.',
        hot: 'Hot, but not over. A harder hit in the take could clip, so back off a bit.',
        clipped:
          'Over 0 dBFS. See the red tops? They’re cut flat, and this take is damaged.',
      },
      evaluate: levelVerdict,
      answer: { gain: 26 },
      probes: [
        { scene: { gain: 5 }, expect: 'far' },
        { scene: { gain: 19 }, expect: 'near' },
        { scene: { gain: 35 }, expect: 'hot' },
        { scene: { gain: 50 }, expect: 'clipped' },
        { scene: { gain: 26 }, expect: 'ok' },
      ],
      why: {
        title: 'Why not as hot as possible?',
        paragraphs: [
          'Old 16-bit recorders rewarded running close to the top. At 24 bits, there’s so much range that a little lower costs almost nothing.',
          'What it buys you is safety. A singer’s loudest line or a drummer’s biggest fill can come in many decibels over the soundcheck.',
          '−18 dBFS is also near where much analog gear and many plugins expect to run.',
        ],
      },
    }),
    {
      kind: 'ab',
      id: 'fader-cant-fix',
      view: 'blind',
      scene: { stem: 'snare', gain: 26, fader: 0, matched: true },
      body: 'Two takes of one snare, played back at the same loudness. One was clipped going in, and was turned down afterwards.',
      question: 'Which one clipped?',
      a: { gain: 52 },
      b: { gain: 26 },
      correct: 'a',
      choiceA: 'this one clipped',
      choiceB: 'this one clipped',
      right:
        'Turning it down afterwards just gives you a quieter crunch. The flat tops stay flat.',
      wrong:
        'Listen for a fuzzy, crushed edge on each hit. One has lost the top of every peak.',
      why: {
        title: 'Why a fader can’t fix it',
        paragraphs: [
          'A fader multiplies the numbers that were recorded. Where a peak was cut off, the original height was never stored, so nothing can bring it back.',
          'Repair plugins can guess at the missing part, and sometimes they’re useful, but a retake is nearly always better.',
        ],
      },
    },
    {
      kind: 'ab',
      id: 'low-is-fine',
      view: 'blind',
      scene: { stem: 'snare', gain: 28, fader: 0, matched: false },
      body: 'Now the other mistake. One take peaked at −12 dBFS. The other was way down at −30, and was raised 18 dB with a fader.',
      question: 'Which one was recorded low?',
      a: { gain: 10, fader: 18 },
      b: { gain: 28, fader: 0 },
      correct: 'same',
      sameLabel: 'I can’t tell them apart',
      choiceA: 'this one was low',
      choiceB: 'this one was low',
      caption: 'This model has no noise, so these two are exactly the same.',
      right:
        'Exactly right: too low is usually fixable, and too hot isn’t. When unsure, record lower.',
      wrong:
        'These two are identical here. Raising a clean recording changes nothing but its level.',
      why: {
        title: 'What’s the catch?',
        paragraphs: [
          'A real preamp and room add hiss, and raising a low recording raises that too. At −30 dBFS with a decent interface, it’s rarely a problem.',
          'Go much lower, around −50 dBFS, and you’ll start to hear it. So low is safer than hot, but it isn’t free.',
        ],
      },
    },
    doScreen<Level>({
      id: 'bass-di',
      view: 'chain',
      scene: { stem: 'bass', gain: 26, fader: 0, matched: false },
      body: 'Next, a bass plugged straight in, called a **DI**. It’s a much stronger signal, and the gain is still where the snare left it. Reset it.',
      caption: 'A model: this bass peaks at −24 dBFS with no gain.',
      right:
        'Only about 10 dB this time, where the snare took 26. Every source gets its own setting.',
      feedback: {
        far: 'Much too low now. Bring it up.',
        near: 'Close, and it would work. Try for a little more.',
        hot: 'Not over, but a hard pluck could clip. Back it off a bit.',
        clipped:
          'Still over 0 dBFS. The peaks are being cut flat, so keep turning it down.',
      },
      evaluate: levelVerdict,
      answer: { gain: 10 },
      probes: [
        // The slider stops at 0, where this bass is already near the target.
        { scene: { gain: -2 }, expect: 'far' },
        { scene: { gain: 0 }, expect: 'near' },
        { scene: { gain: 20 }, expect: 'hot' },
        { scene: { gain: 26 }, expect: 'clipped' },
        { scene: { gain: 10 }, expect: 'ok' },
      ],
      why: {
        title: 'Why every source differs',
        paragraphs: [
          'A DI output is usually far stronger than a dynamic mic. Active basses are hotter again, which is why many interfaces have a pad.',
          'So check gain every time you swap a source, a mic or a player. Never trust the setting left by the last one.',
        ],
      },
    }),
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-windscreen',
      quiet: true,
      view: 'mic',
      scene: { stem: 'snare', gain: 26, fader: 0 },
      body: 'One more way a good level gets wrecked. A singer’s P sends a blast of air at the mic, and that can thump and clip. Tap the part made to soften it.',
      target: 'windscreen',
      right: 'The foam windscreen. For close vocals, add a pop filter as well.',
      wrong: (term) =>
        `${named(term)} doesn’t soften air. Look for the foam, just inside the grille.`,
      why: {
        title: 'Air, not sound',
        paragraphs: [
          'A P or a B is a real gust of air, and it moves the diaphragm much further than the voice does. That can jump well past your soundcheck level.',
          'Foam, a pop filter, and moving the mic a little off to the side all help. Once the thump is recorded, it’s hard to remove.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    view: 'take',
    scene: { stem: 'snare', gain: 26, fader: 0, matched: false },
    body: 'So the red light you can’t undo is the converter’s ceiling. A low take can be raised later. A clipped one can’t be repaired.',
    points: [
      'A mic puts out millivolts, and a preamp brings them up by about 50 dB or so.',
      'Aim for peaks around −18 to −10 dBFS on the way in.',
      'Clipped stays clipped, and every source needs its own gain.',
    ],
    inSession:
      'Have the player hit their hardest, set the gain there, then watch the meter. If it goes red in a take, turn it down and record again.',
    limits:
      '−18 to −10 is common guidance, not a law, and loud styles often record hotter. The levels here are a model, so real mics and players will differ.',
    next: 'Then take the mic apart from the course page.',
  },
  practice: [
    doScreen<Level>({
      id: 'practice-kick',
      view: 'chain',
      scene: { stem: 'kick', gain: 0, fader: 0, matched: false },
      body: 'New source: a kick. Set its gain for the same target.',
      right: 'In the target, with room for a harder hit.',
      feedback: {
        far: 'Far under the target. More gain.',
        near: 'Close. A little more.',
        hot: 'Hot. A hard hit could clip.',
        clipped: 'Over 0 dBFS, and cut flat.',
      },
      evaluate: levelVerdict,
      answer: { gain: 24 },
      probes: [
        { scene: { gain: 5 }, expect: 'far' },
        { scene: { gain: 17 }, expect: 'near' },
        { scene: { gain: 34 }, expect: 'hot' },
        { scene: { gain: 45 }, expect: 'clipped' },
        { scene: { gain: 24 }, expect: 'ok' },
      ],
      why: {
        title: 'The same target',
        paragraphs: [
          'A kick drum can put out a lot more than this with some mics. The target stays the same, and only the knob’s position changes.',
        ],
      },
    }),
    {
      kind: 'choose',
      id: 'practice-soundcheck',
      view: 'chain',
      scene: { stem: 'snare', gain: 38, fader: 0, matched: false },
      body: 'At soundcheck, this snare peaks at −2 dBFS.',
      question: 'What do you do before recording?',
      correct: 'gain',
      right: 'Turn down the gain. It’s the only control before the converter.',
      choices: [
        { id: 'gain', text: 'Turn down the preamp gain' },
        {
          id: 'fader',
          text: 'Pull down the channel fader',
          feedback:
            'The fader comes after the converter. The recording would clip just the same.',
        },
        {
          id: 'leave',
          text: 'Leave it: −2 isn’t over 0',
          feedback:
            'Players nearly always hit harder in the real take than at soundcheck.',
        },
      ],
      why: {
        title: 'Before and after the converter',
        paragraphs: [
          'Anything before the converter changes what’s recorded. Anything after, like your faders and plugins, only changes how you hear it.',
        ],
      },
    },
    {
      kind: 'ab',
      id: 'practice-bass-clip',
      view: 'blind',
      scene: { stem: 'bass', gain: 10, fader: 0, matched: true },
      body: 'Two bass takes, at the same loudness.',
      question: 'Which one clipped going in?',
      a: { gain: 40 },
      b: { gain: 10 },
      correct: 'a',
      choiceA: 'this one clipped',
      choiceB: 'this one clipped',
      right:
        'Hear that buzz around each note? Those are harmonics the bass never played.',
      wrong:
        'Listen for a buzzy edge on each note, with the low end sounding squarer.',
      why: {
        title: 'Clipping makes new harmonics',
        paragraphs: [
          'Flat tops are a different wave shape, and that shape adds harmonics that weren’t in the bass. Guitarists do this on purpose with a fuzz pedal.',
          'Deliberately is fine. By accident in a converter, it’s harsh, and you can’t turn it off later.',
        ],
      },
    },
  ],
};
