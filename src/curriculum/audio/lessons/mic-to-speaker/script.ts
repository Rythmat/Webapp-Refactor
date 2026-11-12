import type { StemId } from '../../mix/stems';
import { doScreenFor, type LessonScript } from '../types';

// ── From Mic to Speaker ────────────────────────────────────────────────────
// One snare hit at a live show, followed through the gear: the mic, a desk
// channel's gain knob and fader, the power amp, the PA speaker, and then the
// same desk feeding a recording. The levels are a model, and the page says so:
// they're typical round figures, and real gear varies.

export type PathStem = Extract<StemId, 'snare' | 'bass'>;

export interface PathScene {
  stem: PathStem;
  /** The desk channel's gain knob: its preamp, in decibels. */
  gain: number;
  /** The channel fader, on the shared fader scale. */
  fader: number;
  /** The power amp's level knob, in decibels: 0 is all the way up. */
  amp: number;
  /** Playback set to one loudness, so that the ear isn't swayed by level. */
  matched: boolean;
}

export const GAIN_MAX = 70;
/** The amp's knob all the way down: off. */
export const AMP_OFF = -40;
/** The amp's own fixed gain, before its knob, on this page's scale. */
export const AMP_GAIN_DB = 24;

/** Where line level sits on the desk's meter, in decibels below its clip. */
export const LINE_ON_METER = -12;
export const LINE_VOLTS = 1.23;
/** This amp at full power, peak, into an 8 Ω speaker. */
export const AMP_MAX_VOLTS = 63;
export const SPEAKER_OHMS = 8;

/** Each source's peak with no gain, on the desk's meter. */
export const SOURCE_PEAK: Readonly<Record<PathStem, number>> = {
  // About 2 mV: 20 × log₁₀(0.002 ÷ 1.23) is about −56 dB under line level.
  snare: LINE_ON_METER + 20 * Math.log10(0.002 / LINE_VOLTS),
  // A bass DI, about 100 mV.
  bass: LINE_ON_METER + 20 * Math.log10(0.1 / LINE_VOLTS),
};

export const DESK_TARGET = [-18, -6] as const;
export const AMP_TARGET = [-6, -1] as const;

/** The channel's peak after its gain, in decibels below its clip. */
export const deskPeak = (s: Pick<PathScene, 'stem' | 'gain'>) =>
  SOURCE_PEAK[s.stem] + s.gain;

/** What leaves the channel, after its fader. */
export const deskOut = (s: Pick<PathScene, 'stem' | 'gain' | 'fader'>) =>
  deskPeak(s) + s.fader;

/** The power amp's peak, in decibels below the most it can give. */
export const ampPeak = (s: PathScene) =>
  s.amp <= AMP_OFF ? -Infinity : deskOut(s) + AMP_GAIN_DB + s.amp;

/** The desk's meter in volts, with line level where it sits on a real one. */
export const deskVolts = (meterDb: number) =>
  LINE_VOLTS * 10 ** ((meterDb - LINE_ON_METER) / 20);

export const ampVolts = (peakDb: number) =>
  AMP_MAX_VOLTS * 10 ** (Math.min(0, peakDb) / 20);

export const ampWatts = (peakDb: number) =>
  ampVolts(peakDb) ** 2 / SPEAKER_OHMS;

type DeskLevel = 'far' | 'near' | 'hot' | 'clipped';

const deskVerdict = (scene: PathScene) => {
  const peak = deskPeak(scene);
  if (peak > 0) return { ok: false as const, mistake: 'clipped' as const };
  if (peak > DESK_TARGET[1])
    return { ok: false as const, mistake: 'hot' as const };
  if (peak < -30) return { ok: false as const, mistake: 'far' as const };
  if (peak < DESK_TARGET[0])
    return { ok: false as const, mistake: 'near' as const };
  return { ok: true as const };
};

const inDeskTarget = (scene: PathScene) => deskVerdict(scene).ok;

const doScreen = doScreenFor<PathScene>();

/** The parts of the chain, and of a desk channel, that can be pointed at. */
export const CHAIN_NAMES: Readonly<Record<string, string>> = {
  mic: 'The microphone',
  desk: 'The mixing desk',
  amp: 'The power amp',
  speaker: 'The PA speaker',
  interface: 'The interface',
  laptop: 'The laptop',
  xlr: 'The mic cable',
  line: 'The line cable',
  speakerCable: 'The speaker cable',
  usb: 'The USB cable',
  gain: 'The gain knob',
  eq: 'The EQ',
  pan: 'The pan knob',
  mute: 'The mute button',
  fader: 'The fader',
  meter: 'The meter',
  preampTubes: 'The preamp tubes',
  powerTubes: 'The power tubes',
  outputTransformer: 'The output transformer',
  speakerFrame: 'The speaker’s frame',
  magnet: 'The magnet',
  voiceCoil: 'The voice coil',
};

export const nameOf = (term: string) => CHAIN_NAMES[term] ?? 'That part';

const CABLE_WRONG: Readonly<Record<string, string>> = {
  xlr: 'That XLR carries the mic’s millivolts, balanced to keep hum out over a long run.',
  line: 'That one carries line level, about a volt, from the desk to the amp.',
  usb: 'USB carries numbers, not a voltage you could hear.',
};

const OLD_TOPICS: Readonly<Record<string, string>> = {
  preamps: 'set-gain',
  digital: 'record',
  amps: 'amp-explain',
  loudspeakers: 'find-cone',
  cables: 'find-cable',
};

/** Where an old lab topic's link now opens. */
export const screenForTopic = (topic: string | null) =>
  topic ? (OLD_TOPICS[topic] ?? null) : null;

export const PATH_SCRIPT: LessonScript<PathScene> = {
  id: 'mic-to-speaker',
  needs: ['snare', 'bass'],
  initial: { stem: 'snare', gain: 56, fader: -6, amp: -10, matched: false },
  hook: {
    kind: 'hook',
    id: 'hook',
    view: 'chain',
    title: 'Two thousandths of a volt fills a whole room.',
    body: 'Press play. That’s one mic on a snare at a gig, coming out of the PA. Follow the signal through every box it passes.',
  },
  screens: [
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-desk',
      quiet: true,
      view: 'chain',
      body: 'The mic turns the hit into a tiny voltage, about 2 millivolts. Tap the first box that makes it bigger.',
      target: 'desk',
      right:
        'The mixing desk. Every channel starts with a preamp that lifts the mic up.',
      wrong: (term) =>
        term === 'amp'
          ? 'The power amp comes later. It expects about a volt, hundreds of times more than a mic makes.'
          : `${nameOf(term)} doesn’t raise the mic. Follow the mic cable to where it plugs in.`,
      why: {
        title: 'Why a mic needs help',
        paragraphs: [
          'A dynamic mic’s coil moves only a tiny distance in a magnet’s field, so it makes millivolts.',
          'Everything after it, from the desk’s EQ to the power amp, is built for about a volt, called line level. Getting there takes about 56 dB of gain.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'gain-explain',
      view: 'desk',
      scene: { stem: 'snare', gain: 0, fader: 0, amp: -16 },
      body: 'Here’s that channel on the desk. The knob at the top is its **preamp**: its gain lifts the mic towards **line level**. Press play: at no gain, you’ll barely hear the snare.',
    },
    doScreen<DeskLevel>({
      id: 'set-gain',
      view: 'desk',
      scene: { stem: 'snare', gain: 0, fader: 0, amp: -16 },
      body: 'Turn the gain up until the snare’s hits light the channel’s meter in the marked band, from **−18 to −6**.',
      caption:
        'A model: this mic makes about 2 mV on a hard hit. Real mics and drummers vary.',
      right:
        'About 56 dB of gain: two millivolts is now about a volt, with room for a harder hit.',
      feedback: {
        far: 'Far too low still. Keep turning the gain up.',
        near: 'Close. A little more gain.',
        hot: 'Hot, and a harder hit would clip. Back it off a little.',
        clipped:
          'The CLIP light is on: the preamp has run out of room and is flattening every hit.',
      },
      evaluate: deskVerdict,
      answer: { gain: 56 },
      probes: [
        { scene: { gain: 20 }, expect: 'far' },
        { scene: { gain: 45 }, expect: 'near' },
        { scene: { gain: 66 }, expect: 'hot' },
        { scene: { gain: 70 }, expect: 'clipped' },
        { scene: { gain: 56 }, expect: 'ok' },
      ],
      why: {
        title: 'What the meter’s band means',
        paragraphs: [
          'A desk’s channel meter counts down from the point where its preamp clips. Line level sits about 12 dB under it, so there’s room for a hit harder than the soundcheck.',
          'Too low, and the desk’s own hiss is a bigger share of the sound. Too high, and the preamp flattens the peaks.',
        ],
      },
    }),
    {
      kind: 'explain',
      id: 'fader-explain',
      view: 'desk',
      scene: { stem: 'snare', gain: 56, fader: 0, amp: -16 },
      body: 'At the bottom is the **fader**. The gain sets how strong the signal is inside the desk. The fader sets how much of it goes out to the PA.',
    },
    doScreen<'gain' | 'little' | 'much' | 'off'>({
      id: 'set-fader',
      view: 'desk',
      scene: { stem: 'snare', gain: 56, fader: 0, amp: -16 },
      body: 'The band says the snare’s too loud in the room. Pull its fader down by **4 to 12 dB**, and leave the gain where it is.',
      right:
        'Quieter in the room, and the meter beside the gain hasn’t moved: the channel’s still at a healthy level.',
      feedback: {
        gain: 'That moved the gain, and the channel’s level with it. Put the gain back in the band and use the fader.',
        little: 'Barely changed. Pull the fader down further.',
        much: 'Now it’s lost in the mix. Bring the fader back up a little.',
        off: 'A fader at the bottom is off: the snare’s gone from the PA.',
      },
      evaluate: (scene) => {
        if (!inDeskTarget(scene)) return { ok: false, mistake: 'gain' };
        if (scene.fader <= -48) return { ok: false, mistake: 'off' };
        if (scene.fader > -4) return { ok: false, mistake: 'little' };
        if (scene.fader < -12) return { ok: false, mistake: 'much' };
        return { ok: true };
      },
      answer: { fader: -6 },
      probes: [
        { scene: { gain: 40 }, expect: 'gain' },
        { scene: { fader: -2 }, expect: 'little' },
        { scene: { fader: -20 }, expect: 'much' },
        { scene: { fader: -48 }, expect: 'off' },
        { scene: { fader: -6 }, expect: 'ok' },
      ],
      why: {
        title: 'Two knobs, two jobs',
        paragraphs: [
          'The gain is set once, at soundcheck, for the source: hot enough to stay clear of hiss, with room above it.',
          'The faders are for balance, and they move all night. Using the gain to balance would push a quiet channel into hiss or a loud one into clipping.',
        ],
      },
    }),
    {
      kind: 'choose',
      id: 'clip-light',
      view: 'desk',
      scene: { stem: 'snare', gain: 70, fader: -6, amp: -16 },
      body: 'Press play. The drummer’s switched to a heavier stick, and now the channel’s CLIP light flashes on every hit.',
      question: 'What do you move?',
      correct: 'gain',
      right:
        'The gain. The clipping happens in the preamp, before the fader ever sees it.',
      choices: [
        { id: 'gain', text: 'Turn the gain down' },
        {
          id: 'fader',
          text: 'Pull the fader down',
          feedback:
            'The fader comes after the preamp. It would just make the clipped snare quieter.',
        },
        {
          id: 'amp',
          text: 'Turn the power amp down',
          feedback:
            'The amp only gets what the desk sends, and the clipping is already in it.',
        },
      ],
      why: {
        title: 'Fix it where it happens',
        paragraphs: [
          'Clipping is a stage being asked for more than it can give. Turning down anything after that stage only turns down the damage.',
          'So read the lights from the start of the chain: the first one that’s red is the knob to move.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-amp',
      quiet: true,
      view: 'chain',
      scene: { stem: 'snare', gain: 56, fader: -6, amp: -16 },
      body: 'About a volt leaves the desk. That’s far too weak to push a big speaker cone. Tap the box that makes it strong enough.',
      target: 'amp',
      right: 'The power amp: the last big jump on the way to the speaker.',
      wrong: (term) =>
        term === 'speaker'
          ? 'The speaker needs the push, but it can’t make it. Look one box before it.'
          : `${nameOf(term)} doesn’t drive the speaker. Follow the cable that leaves the desk for the PA.`,
      why: {
        title: 'Voltage and current',
        paragraphs: [
          'A desk’s output can make about a volt, but only a trickle of current. A speaker needs tens of volts and amps of current to move its cone and the air in front of it.',
          'That combination is power, in watts, and making it is the power amp’s whole job.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'amp-explain',
      view: 'amp',
      scene: { stem: 'snare', gain: 56, fader: -6, amp: -30 },
      body: 'A **power amp** takes the desk’s volt and makes tens of volts, with the current to push a cone: **speaker level**. Its knob sets how much of the desk it lets through.',
    },
    doScreen<'quiet' | 'edge' | 'clipping'>({
      id: 'set-amp',
      view: 'amp',
      scene: { stem: 'snare', gain: 56, fader: -6, amp: -30 },
      body: 'The room needs it louder. Turn the amp up until its lights reach the marked band, with the CLIP light staying dark.',
      caption:
        'A model of a 500-watt amp. Your speakers stay quieter than the amp’s lights as you go past the band.',
      right:
        'Loud enough for the room, with headroom left for the drummer’s biggest hit.',
      feedback: {
        quiet: 'Still too quiet for the room. Keep turning the amp up.',
        edge: 'Right at the edge: the next loud hit will clip the amp. Back off a little.',
        clipping:
          'The amp’s CLIP light is on: it’s out of voltage and flattening the hits.',
      },
      evaluate: (scene) => {
        const peak = ampPeak(scene);
        if (peak > 0) return { ok: false, mistake: 'clipping' };
        if (peak > AMP_TARGET[1]) return { ok: false, mistake: 'edge' };
        if (peak < AMP_TARGET[0]) return { ok: false, mistake: 'quiet' };
        return { ok: true };
      },
      answer: { amp: -10 },
      probes: [
        { scene: { amp: -20 }, expect: 'quiet' },
        { scene: { amp: -6.5 }, expect: 'edge' },
        { scene: { amp: 0 }, expect: 'clipping' },
        { scene: { amp: -10 }, expect: 'ok' },
      ],
      why: {
        title: 'Where to set an amp',
        paragraphs: [
          'Most live engineers set amps once and then mix on the desk. The amp’s knob is turned up until the desk at its normal level fills the room.',
          'Running an amp into its CLIP light is hard on tweeters: a clipped wave carries extra high harmonics, and the tweeter takes them all.',
        ],
      },
    }),
    {
      kind: 'ab',
      id: 'amp-clip',
      view: 'amp',
      scene: { stem: 'snare', gain: 56, fader: -6, amp: -10, matched: true },
      body: 'Two snares through the PA, played back at the same loudness. In one, the amp was pushed into its CLIP light.',
      question: 'Which one has the amp clipping?',
      a: { fader: 0, amp: 0 },
      b: { fader: -6, amp: -10 },
      correct: 'a',
      choiceA: 'this one is clipping',
      choiceB: 'this one is clipping',
      right:
        'Hear the crunch on each hit? The amp ran out of voltage and cut the peaks flat.',
      wrong:
        'Listen to the crack of each hit. One has a fuzzy, crushed edge that the other doesn’t.',
      why: {
        title: 'Every stage has a ceiling',
        paragraphs: [
          'The preamp, the converter and the power amp can each clip. They all sound much the same: flat tops and new, harsh harmonics.',
          'An amp’s ceiling is set by its power supply. Asking for more voltage than the supply holds just gets you the supply.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'twice-watts',
      quiet: true,
      view: 'amp',
      scene: { stem: 'snare', gain: 56, fader: -6, amp: -10, matched: false },
      body: 'The venue swaps this 500-watt amp for a 1000-watt one, twice the power.',
      question: 'How much louder can the PA get?',
      correct: 'little',
      right:
        'Only about 3 dB: a small step. It takes about ten times the power to sound twice as loud.',
      choices: [
        {
          id: 'twice',
          text: 'Twice as loud',
          feedback:
            'Twice the power is only 3 dB more. Twice as loud takes about ten times the power.',
        },
        { id: 'little', text: 'A little louder, about 3 dB' },
        {
          id: 'same',
          text: 'No louder at all',
          feedback:
            'It can get louder, just not by much: about 3 dB at its very top.',
        },
      ],
      why: {
        title: 'Power in decibels',
        paragraphs: [
          'Power in decibels is 10 × log₁₀ of the ratio, so twice the watts is 10 × log₁₀(2), about 3 dB.',
          'The ear hears about 10 dB as twice as loud, and that’s ten times the power. So more efficient speakers usually help more than a bigger amp.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-cone',
      quiet: true,
      view: 'combo',
      body: 'A guitar combo amp packs the whole chain into one box: a preamp, a power amp and a speaker. Tap the part that finally pushes the air.',
      target: 'cone',
      right:
        'The cone. The voice coil pulls it back and forth, and it pushes the air: electricity back into sound.',
      wrong: (term) =>
        term === 'voiceCoil' || term === 'magnet'
          ? `${nameOf(term)} drives the speaker, but it’s hidden behind it. Look for the big paper surface facing the room.`
          : `${nameOf(term)} doesn’t move the air. Look for the big paper surface facing the room.`,
      why: {
        title: 'A microphone backwards',
        paragraphs: [
          'A speaker is built like a dynamic mic run in reverse: current through a coil in a magnet’s field moves the coil, and the cone with it.',
          'A PA speaker usually has two drivers. A crossover sends the lows to a big cone and the highs to a small tweeter, because no one driver does both well.',
        ],
      },
    },
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'find-cable',
      quiet: true,
      view: 'cables',
      body: 'Different cables carry each level. Tap the one carrying speaker level, tens of volts with real current behind it.',
      target: 'speakerCable',
      right:
        'The speaker cable: thick wire, because it carries amps of current, not the trickle of the others.',
      wrong: (term) =>
        CABLE_WRONG[term] ??
        `${nameOf(term)} isn’t a cable. Tap one of the lines between the boxes.`,
      why: {
        title: 'Which cable goes where',
        paragraphs: [
          'Mic and line cables are usually balanced: two signal wires, one upside down, so the hum they both pick up cancels at the far end.',
          'Speaker cables aren’t balanced and don’t need to be: the signal’s so strong that hum is lost in it. They need thick copper instead.',
          'Never use an instrument cable to connect an amp to a speaker. Its thin wire isn’t built for that current.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'record',
      view: 'record',
      scene: { stem: 'snare', gain: 56, fader: -6, amp: -10, matched: false },
      body: 'To record the show, the desk also sends line level to an **interface**. Its **converter** measures the voltage 48,000 times a second and stores each measurement as a number.',
    },
    {
      kind: 'choose',
      id: 'daw-fader',
      view: 'record',
      body: 'Back home, the recorded snare is too loud against the rest of your mix.',
      question: 'What do you move?',
      correct: 'daw',
      right:
        'The fader in your recording software. The take is already numbers: now you only choose how loud to play them.',
      choices: [
        { id: 'daw', text: 'The fader in the recording software' },
        {
          id: 'gain',
          text: 'The desk’s gain knob',
          feedback:
            'That changes what you record next time. This take is already recorded.',
        },
        {
          id: 'amp',
          text: 'The power amp',
          feedback:
            'The amp only drives the PA in the room. The recording never goes through it.',
        },
      ],
      why: {
        title: 'Before and after the converter',
        paragraphs: [
          'Anything before the converter, like the gain, changes what’s recorded. Anything after it, like your software’s faders and plugins, only changes how it’s played back, and can be changed again.',
          'At 48,000 samples a second, a converter can hold pitches up to 24 kHz, a little above the highest we hear.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    view: 'chain',
    scene: { stem: 'snare', gain: 56, fader: -6, amp: -10, matched: false },
    body: 'So a snare hit goes from millivolts to a volt to tens of volts, and back into air. Each box has its own knob, and its own ceiling.',
    points: [
      'The gain lifts the mic to line level. Set it once, for the source.',
      'The fader sets how much of each channel reaches the mix.',
      'The power amp makes speaker level. Its CLIP light means back off the amp.',
    ],
    inSession:
      'Gain first, with the fader at 0, on the loudest hits. Then the faders for the balance. Then the amp, until the room is loud enough.',
    limits:
      'Levels here are a model. Many desks are digital, with the converter right after the gain, and many PA speakers have their amp built in.',
    next: 'Next, Gain Staging takes the gain knob into a recording.',
  },
  practice: [
    doScreen<DeskLevel>({
      id: 'practice-bass',
      view: 'desk',
      scene: { stem: 'bass', gain: 56, fader: 0, amp: -16, matched: false },
      body: 'The bass player plugs a DI into this channel, and the gain is still where the snare left it. Set it for the same band.',
      caption: 'A model: this bass DI makes about 100 mV.',
      right: 'Only about 22 dB this time. A DI is far stronger than a mic.',
      feedback: {
        far: 'Too low now. More gain.',
        near: 'Close. A little more.',
        hot: 'Hot. A hard pluck could clip.',
        clipped: 'Clipping. Keep turning the gain down.',
      },
      evaluate: deskVerdict,
      answer: { gain: 22 },
      probes: [
        { scene: { gain: 0 }, expect: 'far' },
        { scene: { gain: 13 }, expect: 'near' },
        { scene: { gain: 30 }, expect: 'hot' },
        { scene: { gain: 40 }, expect: 'clipped' },
        { scene: { gain: 22 }, expect: 'ok' },
      ],
      why: {
        title: 'Every source needs its own gain',
        paragraphs: [
          'A DI box hands the desk about a tenth of a volt, fifty times more than a dynamic mic. Never trust a gain setting left by the last source.',
        ],
      },
    }),
    {
      kind: 'anatomy',
      mode: 'identify',
      id: 'practice-fix-clip',
      view: 'desk',
      scene: { stem: 'snare', gain: 70, fader: -6, amp: -16, matched: false },
      body: 'This channel’s CLIP light flashes on every hit. Tap the control that fixes it.',
      target: 'gain',
      right: 'The gain: it’s the stage that’s clipping.',
      wrong: (term) =>
        term === 'fader'
          ? 'The fader comes after the preamp. The channel would still clip.'
          : `${nameOf(term)} comes after the clipping. Look at the top of the channel.`,
      why: {
        title: 'The first red light',
        paragraphs: [
          'Clipping is fixed at the stage that’s clipping. Here that’s the preamp, at the top of the channel.',
        ],
      },
    },
    {
      kind: 'ab',
      id: 'practice-amp-clip',
      view: 'amp',
      scene: { stem: 'bass', gain: 22, fader: 0, amp: -16, matched: true },
      body: 'Two basses through the PA, at the same loudness.',
      question: 'Which one has the amp clipping?',
      a: { amp: 0 },
      b: { amp: -16 },
      correct: 'a',
      choiceA: 'this one is clipping',
      choiceB: 'this one is clipping',
      right:
        'That buzz round every note is the amp cutting the peaks flat. The bass never played those harmonics.',
      wrong: 'Listen for a buzzy edge on each note, and a squarer low end.',
      why: {
        title: 'Clipping adds harmonics',
        paragraphs: [
          'Flat tops are a different wave shape, and that shape adds harmonics the bass never played. On a PA, they land on the tweeters.',
        ],
      },
    },
  ],
};
