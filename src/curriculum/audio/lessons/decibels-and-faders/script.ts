import { MIX_PEAK_DB, type StemId } from '../../mix/stems';
import { doScreenFor, type LessonScript } from '../types';

// ── Decibels and Faders ────────────────────────────────────────────────────
// Why 0 sits near the top of a fader, what −6 dB really does, what dBFS counts
// from, and how to get headroom without touching a balance.

export interface DeskScene {
  faders: Readonly<Record<StemId, number>>;
  master: number;
  /** A second copy of the snare, playing in step. */
  doubled: boolean;
}

const doScreen = doScreenFor<DeskScene>();

const UNITY: DeskScene['faders'] = { kick: 0, snare: 0, hats: 0, bass: 0 };

const faders = (patch: Partial<DeskScene['faders']>): DeskScene['faders'] => ({
  ...UNITY,
  ...patch,
});

const masterPeak = (scene: DeskScene) => MIX_PEAK_DB + scene.master;

export const DECIBELS_SCRIPT: LessonScript<DeskScene> = {
  id: 'decibels-and-faders',
  needs: ['kick', 'snare', 'hats', 'bass'],
  initial: { faders: UNITY, master: 0, doubled: false },
  hook: {
    kind: 'hook',
    id: 'hook',
    view: 'all',
    title: 'Why is 0 near the top of a fader?',
    body: 'Every fader and meter you’ll ever use runs in negative numbers. Press play: this is a groove on four faders, kick, snare, hats and bass, all sitting at 0.',
  },
  screens: [
    doScreen({
      id: 'half',
      view: 'snare',
      // Whatever they did to the faders on the way in.
      scene: { faders: UNITY, master: 0 },
      body: 'Watch the snare’s wave. Pull its fader down until the wave is **half as tall** as the outline.',
      right: 'That’s half the height. Look at the number on the fader.',
      feedback: {
        tooHigh:
          'Still over half. The wave is taller than the middle of the outline, so keep pulling down.',
        tooLow: 'That’s under half now. Bring it back up a little.',
      },
      evaluate: (scene) => {
        const db = scene.faders.snare;
        if (db > -5) return { ok: false, mistake: 'tooHigh' };
        if (db < -7) return { ok: false, mistake: 'tooLow' };
        return { ok: true };
      },
      answer: { faders: faders({ snare: -6 }) },
      probes: [
        { scene: { faders: faders({ snare: -3 }) }, expect: 'tooHigh' },
        { scene: { faders: faders({ snare: -10 }) }, expect: 'tooLow' },
        { scene: { faders: faders({ snare: -6 }) }, expect: 'ok' },
      ],
      why: {
        title: 'Half the height is −6 dB',
        paragraphs: [
          'Level in decibels is 20 × log₁₀(new ÷ old). Half is 20 × log₁₀(0.5), which comes to −6.02 dB.',
          'That’s true at any starting level, on any fader, in any DAW. Half the height always reads about −6.',
        ],
      },
    }),
    {
      kind: 'explain',
      id: 'what-a-decibel-is',
      view: 'snare',
      body: 'You just found it: **−6 dB** means half the height. A **decibel** is a ratio, not an amount. On a fader, 0 dB means no change, which is why it’s near the top.',
    },
    {
      kind: 'choose',
      id: 'quarter',
      view: 'snare-wave',
      body: 'Your snare is at −6 dB, half its height.',
      question: 'Pull it down another 6 dB, to −12. How tall is the wave now?',
      correct: 'quarter',
      right: 'A quarter: half of a half. Every 6 dB halves it again.',
      choices: [
        { id: 'quarter', text: 'A quarter of its original height' },
        {
          id: 'third',
          text: 'A third of its original height',
          feedback:
            'Decibels multiply rather than count off in equal slices. Each −6 dB halves whatever’s there.',
        },
        {
          id: 'zero',
          text: 'Nothing left: it’s silent',
          feedback:
            'Halving never reaches zero. That’s why a fader’s bottom is marked with ∞ rather than a number.',
        },
      ],
      why: {
        title: 'Decibels add where gains multiply',
        paragraphs: [
          '−6 dB is × 0.5. Do it twice and you add the decibels, −12 dB, and multiply the gains, × 0.25.',
          'This is why engineers use decibels at all. A long signal chain becomes simple adding, however many stages it has.',
        ],
      },
    },
    {
      kind: 'explain',
      id: 'dbfs',
      view: 'kick',
      scene: { faders: UNITY },
      body: 'Meters use another scale: **dBFS**, which counts down from Full Scale. **0 dBFS** is the digital ceiling, the most a file can hold, so readings are negative. This kick peaks at −6 dBFS.',
    },
    doScreen({
      id: 'kick-to-12',
      view: 'kick',
      body: 'This kick peaks at −6 dBFS with its fader at 0. Make it peak at **−12 dBFS**. Watch the meter.',
      right: 'It peaks at −12: −6 from the file, plus −6 from the fader.',
      feedback: {
        tooHigh:
          'The kick’s peak is still above −12. It needs 6 dB less than it started with.',
        tooLow: 'That’s under −12. You only need to take 6 dB off the kick.',
      },
      evaluate: (scene) => {
        const peak = -6 + scene.faders.kick;
        if (peak > -11) return { ok: false, mistake: 'tooHigh' };
        if (peak < -13) return { ok: false, mistake: 'tooLow' };
        return { ok: true };
      },
      answer: { faders: faders({ kick: -6 }) },
      probes: [
        { scene: { faders: faders({ kick: -2 }) }, expect: 'tooHigh' },
        { scene: { faders: faders({ kick: -12 }) }, expect: 'tooLow' },
        { scene: { faders: faders({ kick: -6 }) }, expect: 'ok' },
      ],
      why: {
        title: 'Why levels just add',
        paragraphs: [
          'Peak level in dBFS plus fader in dB gives the new peak: −6 + −6 = −12 dBFS.',
          'That’s how you work out a chain in your head. A −18 dBFS vocal through +3 dB of EQ and a −6 dB fader peaks near −21 dBFS.',
        ],
      },
    }),
    doScreen({
      id: 'clip-it',
      view: 'master',
      scene: { faders: UNITY, master: 0 },
      body: 'All four are back at 0. Now push the **master** fader up until the red clip light comes on, and listen to what happens.',
      right: 'Hear that crunch? The tops of the waves are being cut off flat.',
      feedback: {
        notYet:
          'Not over yet. The meter hasn’t passed 0 dBFS, so push the master further.',
      },
      evaluate: (scene) =>
        masterPeak(scene) > 0 ? { ok: true } : { ok: false, mistake: 'notYet' },
      answer: { master: 6 },
      probes: [
        { scene: { master: 1 }, expect: 'notYet' },
        { scene: { master: 6 }, expect: 'ok' },
      ],
      caption:
        'Your speakers stay well under what the meter shows: this lesson turns itself down, so that clipping is heard without getting painfully loud.',
      why: {
        title: 'Why digital clipping is so harsh',
        paragraphs: [
          'A file can’t hold anything above 0 dBFS. Whatever goes over is simply cut off, leaving flat tops, and those flat edges add new harmonics that were never in the music.',
          'Once that’s in a bounced file, no fader can take it back out. Turning it down later only gives you a quieter version of the same crunch.',
        ],
      },
    }),
    doScreen({
      id: 'headroom',
      view: 'master',
      scene: { master: 6 },
      body: 'The mix is clipping. Get the master’s peak to between **−9 and −5 dBFS**. That gap below 0 is called **headroom**.',
      right:
        'Clean, with room to spare, and the balance between the four hasn’t changed.',
      feedback: {
        hot: 'Still too close to the ceiling. A little more off the master.',
        low: 'Safe, but more room than you need. Bring it up a bit.',
      },
      evaluate: (scene) => {
        const peak = masterPeak(scene);
        if (peak > -5) return { ok: false, mistake: 'hot' };
        if (peak < -9) return { ok: false, mistake: 'low' };
        return { ok: true };
      },
      answer: { master: -4 },
      probes: [
        { scene: { master: 0 }, expect: 'hot' },
        { scene: { master: -10 }, expect: 'low' },
        { scene: { master: -4 }, expect: 'ok' },
      ],
      why: {
        title: 'Why leave headroom?',
        paragraphs: [
          'Plugins, peaks between samples and later processing all need somewhere to go. Mastering engineers often ask for around 3 to 6 dB of it.',
          'Pulling the master moves everything together, so your balance stays exactly as you set it. Dragging a channel down changes the mix.',
        ],
      },
    }),
    {
      kind: 'choose',
      id: 'doubled',
      view: 'doubled',
      scene: { master: -4, doubled: false },
      body: 'Producers often double a part. Switch the second snare on and off, and watch the snare’s meter.',
      question: 'Two identical snares, in step. How much higher is the peak?',
      correct: 'six',
      right: 'Exactly +6 dB: identical waves add up to twice the height.',
      choices: [
        { id: 'six', text: '+6 dB' },
        {
          id: 'three',
          text: '+3 dB',
          feedback:
            'That’s the rule for two different sounds, which only add in power. Identical waves line up exactly.',
        },
        {
          id: 'double',
          text: 'Twice the number on the meter',
          feedback:
            'Decibels add rather than multiply: −6 dBFS doesn’t become −12. Twice the height is 6 dB more.',
        },
      ],
      why: {
        title: 'In step, or just similar',
        paragraphs: [
          'Identical, in-step waves add height: × 2, or +6 dB.',
          'Unrelated sounds add power instead, for about +3 dB. Two different takes of the same part sit somewhere near that, which is one reason doubled vocals sound wider instead of just louder.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'room',
      view: 'wave',
      scene: { doubled: false },
      body: 'One more scale to keep apart. Your meter reads −12 dBFS.',
      question: 'How loud is that in the room?',
      correct: 'cant-tell',
      right:
        'You can’t tell. The monitor knob sits between the meter and the room.',
      choices: [
        { id: 'cant-tell', text: 'You can’t tell from the meter' },
        {
          id: 'quiet',
          text: 'Quiet, since it’s a negative number',
          feedback:
            'Negative only means “below the digital ceiling”. Through a big PA, −12 dBFS could be dangerously loud.',
        },
        {
          id: 'twelve',
          text: '12 decibels, about as quiet as breathing',
          feedback:
            'That’s **dB SPL**, a different scale, measured from the quietest sound people can hear.',
        },
      ],
      why: {
        title: 'dBFS and dB SPL',
        paragraphs: [
          '**dBFS** counts down from the digital ceiling. **dB SPL** counts up from about the quietest sound people can hear. Your volume knob, amp and speakers connect the two.',
          'Your ears go by dB SPL. A common guideline limits 85 dBA to about eight hours a day, so it’s worth keeping your monitor knob low.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    view: 'wave',
    scene: { faders: UNITY, master: -4 },
    body: 'So 0 sits near the top because 0 dB means “no change”, and meters count down from a ceiling you never want to hit.',
    points: [
      '−6 dB is half the height, and each further −6 halves it again.',
      '0 dBFS is the digital ceiling. Over it, peaks are cut flat for good.',
      'Meters tell you about the file, not how loud the room is.',
    ],
    inSession:
      'Balance with your channel faders, then leave about 6 dB between your mix bus peak and 0 dBFS as a starting point. If it’s hot, pull the master, not one channel.',
    limits:
      '−6 dB is exact for height, not for how loud it seems: sounding half as loud takes closer to 10 dB, and depends on the sound.',
    next: 'Next: the level before all this, at the microphone.',
  },
  practice: [
    doScreen({
      id: 'practice-hats',
      view: 'hats',
      scene: { faders: UNITY, master: 0 },
      body: 'These hats peak at −18 dBFS. Set them to peak at −24 dBFS.',
      right: '−18 + −6 = −24.',
      feedback: {
        tooHigh: 'Still above −24. You need 6 dB off the hats.',
        tooLow: 'Under −24. You only need 6 dB off.',
      },
      evaluate: (scene) => {
        const peak = -18 + scene.faders.hats;
        if (peak > -23) return { ok: false, mistake: 'tooHigh' };
        if (peak < -25) return { ok: false, mistake: 'tooLow' };
        return { ok: true };
      },
      answer: { faders: faders({ hats: -6 }) },
      probes: [
        { scene: { faders: faders({ hats: 0 }) }, expect: 'tooHigh' },
        { scene: { faders: faders({ hats: -12 }) }, expect: 'tooLow' },
        { scene: { faders: faders({ hats: -6 }) }, expect: 'ok' },
      ],
      why: {
        title: 'Peak plus fader',
        paragraphs: [
          'A peak level plus a fader setting gives the new peak, in decibels.',
        ],
      },
    }),
    {
      kind: 'choose',
      id: 'practice-twelve',
      view: 'all',
      body: 'You turn a part up by 12 dB.',
      question: 'How much taller does its wave get?',
      correct: 'four',
      right: '+6 dB doubles, and +6 again doubles again.',
      choices: [
        { id: 'four', text: 'Four times as tall' },
        {
          id: 'twelve',
          text: 'Twelve times as tall',
          feedback:
            'Decibels aren’t a multiplier. Every +6 dB doubles it, so +12 dB is two doublings.',
        },
        {
          id: 'two',
          text: 'Twice as tall',
          feedback:
            'That’s +6 dB. This is twice as much of a change, and those multiply.',
        },
      ],
      why: {
        title: 'Doublings',
        paragraphs: ['+6 dB is × 2. +12 dB is × 2 × 2, which is × 4.'],
      },
    },
    {
      kind: 'ab',
      id: 'practice-louder',
      view: 'all',
      scene: { master: -6 },
      body: 'These two are the same mix, one a little louder.',
      question: 'Which one is louder?',
      a: { master: -6 },
      b: { master: -9 },
      correct: 'a',
      choiceA: 'this one is louder',
      choiceB: 'this one is louder',
      right:
        'That’s 3 dB. It’s easy to hear, while 1 dB is near the limit of what most people notice.',
      wrong:
        'Try them again, back and forth, and listen to the kick and snare. The difference is 3 dB.',
      why: {
        title: 'What a few decibels sound like',
        paragraphs: [
          'Around 1 dB is near the smallest change most people notice, 3 dB is clear, and 6 dB is obvious.',
          'Louder also tends to sound better, so compare two versions of a mix at the same level. It’s the most useful habit in mixing.',
        ],
      },
    },
  ],
};
