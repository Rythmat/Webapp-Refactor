import type { StemId } from '../../mix/stems';
import { doScreenFor, type LessonScript } from '../types';

// ── Hear the Kit ───────────────────────────────────────────────────────────
// Frequency, through the question of why one kick thumps in a club and clicks on a
// phone. The ranges here are measured from these very stems:
//   kick   40–150 Hz body, a click at 2.5–6 kHz about 24 dB down
//   snare  150–300 Hz body
//   hats   4 kHz and up, little under 150 Hz
//   bass   80–200 Hz, so it shares 80–150 Hz with the kick

export interface KitScene {
  /** What's soloed. Nothing, and it's the whole groove. */
  solo: StemId | null;
  /** The middle of a listening window two octaves wide. */
  bandHz: number | null;
  /** A high-pass on what's soloed. At its floor, it's off. */
  hpHz: number;
  phone: boolean;
}

/** Below this the high-pass does nothing. */
export const HP_OFF = 20;

const doScreen = doScreenFor<KitScene>();

/** Grades a window against where something really is. */
const inside =
  <High extends string, Low extends string>(
    low: number,
    high: number,
    above: High,
    below: Low,
  ) =>
  (scene: KitScene) => {
    const hz = scene.bandHz ?? 0;
    if (hz > high) return { ok: false as const, mistake: above };
    if (hz < low) return { ok: false as const, mistake: below };
    return { ok: true as const };
  };

export const KIT_SCRIPT: LessonScript<KitScene> = {
  id: 'hear-the-kit',
  needs: ['kick', 'snare', 'hats', 'bass'],
  initial: { solo: null, bandHz: null, hpHz: HP_OFF, phone: false },
  hook: {
    kind: 'hook',
    id: 'hook',
    view: 'mix',
    title: 'A kick thumps in a club and clicks on a phone.',
    body: 'Same recording, on two very different speakers. What changed? Press play and watch the picture: this is the groove, spread out from low to high.',
  },
  screens: [
    doScreen<'snare' | 'hats' | 'bass'>({
      id: 'solo-thump',
      view: 'pick',
      body: 'One of these four is making that thump. **Solo** the one you think it is.',
      right:
        'That’s the kick. Everything else just went quiet, so what’s left is all kick.',
      feedback: {
        snare:
          'That’s the snare, the crack on beats 2 and 4. The thump is lower, and falls elsewhere in the bar.',
        hats: 'Those are the hats, the fast ticking on top. Try something lower.',
        bass: 'Close: the bass is low too, but it holds notes. The thump comes and goes with the beat.',
      },
      evaluate: (scene) => {
        if (scene.solo === 'kick') return { ok: true };
        return {
          ok: false,
          mistake: (scene.solo ?? 'bass') as 'snare' | 'hats' | 'bass',
        };
      },
      answer: { solo: 'kick' },
      probes: [
        { scene: { solo: 'snare' }, expect: 'snare' },
        { scene: { solo: 'hats' }, expect: 'hats' },
        { scene: { solo: 'bass' }, expect: 'bass' },
        { scene: { solo: 'kick' }, expect: 'ok' },
      ],
      why: {
        title: 'What solo is for',
        paragraphs: [
          'Solo silences every other channel without moving a fader, so it changes what you hear and nothing else.',
          'Use it to find a problem, then take it off to fix it. A kick that sounds perfect alone can vanish in the mix.',
        ],
      },
    }),
    {
      kind: 'explain',
      id: 'what-hz-is',
      view: 'pick',
      body: '**Frequency** is how fast something vibrates, in **Hz**: times per second. This picture runs from 20 Hz at the left, the lowest we hear, to 20,000 Hz at the right. Height is how much is there.',
    },
    {
      kind: 'choose',
      id: 'where-kick',
      view: 'pick',
      body: 'Here’s the kick alone. The shaded shape is the whole recording, averaged. The line is right now.',
      question: 'Where is most of this kick’s energy?',
      correct: 'low',
      right: 'Under about 150 Hz: that’s the big hump on the left.',
      choices: [
        { id: 'low', text: 'Below about 150 Hz' },
        {
          id: 'mid',
          text: 'Around 1,000 Hz',
          feedback:
            'Look at the middle of the picture: it’s far below the hump on the left.',
        },
        {
          id: 'even',
          text: 'Spread evenly from low to high',
          feedback:
            'It’d be flat if so. This one leans hard to the left, the low end.',
        },
      ],
      why: {
        title: 'Why the picture is spaced like that',
        paragraphs: [
          'Each equal step along it is the same musical distance: 100 to 200 Hz takes as much room as 1,000 to 2,000, because both are an octave.',
          'That’s how your ears judge pitch, and it’s why EQs and analyzers are drawn this way.',
        ],
      },
    },
    doScreen<'above' | 'below'>({
      id: 'find-thump',
      view: 'band',
      scene: { solo: 'kick', bandHz: 1000 },
      body: 'You’re now hearing the kick through a window, two octaves wide. Slide it until you hear **only the thump**.',
      caption:
        'Laptop speakers can barely play this. If it goes quiet, watch the picture, or use headphones.',
      right:
        'That’s it, the body of the drum. A big speaker moves a lot of air down here.',
      feedback: {
        above:
          'There’s almost nothing of the kick here. The hump is further left.',
        below:
          'That’s lower than the thump: you’re into rumble you’d feel more than hear. Come up a little.',
      },
      evaluate: inside(50, 140, 'above', 'below'),
      answer: { bandHz: 80 },
      probes: [
        { scene: { bandHz: 1000 }, expect: 'above' },
        { scene: { bandHz: 30 }, expect: 'below' },
        { scene: { bandHz: 80 }, expect: 'ok' },
      ],
      why: {
        title: 'Where the thump comes from',
        paragraphs: [
          'A kick’s big head rings at a low pitch, and a sampled or tuned kick might sit anywhere from about 40 to 100 Hz.',
          'This kick has energy all the way up to about 150 Hz. Listening through a window like this is called **sweeping**, and it’s how engineers find a sound’s parts.',
        ],
      },
    }),
    doScreen<'above' | 'between' | 'below'>({
      id: 'find-click',
      view: 'band',
      scene: { solo: 'kick', bandHz: 80 },
      body: 'Each hit also starts with a sharp **click**, from the beater. It’s much quieter than the thump. Slide the window up until you find it.',
      right:
        'There it is, about 24 dB under the thump. That small part is all a phone can really play.',
      feedback: {
        above: 'Too high: that’s only air. The click is a little lower.',
        between: 'Not much here. The click is higher: keep sliding right.',
        below: 'That’s still the thump. Go much higher.',
      },
      evaluate: (scene) => {
        const hz = scene.bandHz ?? 0;
        if (hz > 7000) return { ok: false, mistake: 'above' };
        if (hz < 300) return { ok: false, mistake: 'below' };
        if (hz < 2200) return { ok: false, mistake: 'between' };
        return { ok: true };
      },
      answer: { bandHz: 4000 },
      probes: [
        { scene: { bandHz: 12000 }, expect: 'above' },
        { scene: { bandHz: 800 }, expect: 'between' },
        { scene: { bandHz: 100 }, expect: 'below' },
        { scene: { bandHz: 4000 }, expect: 'ok' },
      ],
      why: {
        title: 'A quiet part that matters',
        paragraphs: [
          'The click is what lets a kick cut through a busy mix and on small speakers. Producers often boost a little around here to bring it out.',
          'How much depends on the song. Metal kicks have a lot of it, and a soft soul kick may have almost none.',
        ],
      },
    }),
    doScreen<'above' | 'below'>({
      id: 'find-snare',
      view: 'band',
      scene: { solo: 'snare', bandHz: 3000 },
      body: 'Now the snare, soloed. Every snare has a **body**, the part that makes it sound fat rather than thin. Find it.',
      right:
        'That’s the snare’s body, about 150 to 300 Hz, well above the kick’s.',
      feedback: {
        above: 'That’s the crack and rattle. The body is further left.',
        below:
          'That’s under the snare, where there’s almost nothing of it. Come up.',
      },
      evaluate: inside(120, 400, 'above', 'below'),
      answer: { bandHz: 220 },
      probes: [
        { scene: { bandHz: 3000 }, expect: 'above' },
        { scene: { bandHz: 60 }, expect: 'below' },
        { scene: { bandHz: 220 }, expect: 'ok' },
      ],
      why: {
        title: 'Same kit, different places',
        paragraphs: [
          'Kick and snare mostly sit in different places, which is why they don’t fight. That’s no accident: drums are tuned and chosen that way.',
          'If a snare sounds thin, this is often the area to look at. If it’s boxy, you might go a little above.',
        ],
      },
    }),
    doScreen<'low' | 'high'>({
      id: 'high-pass',
      view: 'highpass',
      scene: { solo: 'hats', bandHz: null, hpHz: HP_OFF },
      body: 'A **high-pass** filter removes everything below a frequency. Raise this one on the hats until it’s cut off what they don’t need, but stop before they thin out.',
      right:
        'They sound almost the same, and now they aren’t adding anything down where the kick and bass work.',
      feedback: {
        low: 'That’s hardly touched anything yet. Keep bringing it up.',
        high: 'Now you’re cutting into the hats themselves. Hear them thin out? Bring it back down.',
      },
      evaluate: (scene) => {
        if (scene.hpHz < 150) return { ok: false, mistake: 'low' };
        if (scene.hpHz > 1200) return { ok: false, mistake: 'high' };
        return { ok: true };
      },
      answer: { hpHz: 400 },
      probes: [
        { scene: { hpHz: 60 }, expect: 'low' },
        { scene: { hpHz: 4000 }, expect: 'high' },
        { scene: { hpHz: 400 }, expect: 'ok' },
      ],
      why: {
        title: 'What’s down there, on a real session',
        paragraphs: [
          'These hats are clean samples. A hat mic on a real kit picks up the kick and snare too, and the high-pass removes much of that spill.',
          'Don’t do this to everything on principle. Listen, because lots of small cuts can leave a mix thin, and every filter shifts phase a little.',
        ],
      },
    }),
    {
      kind: 'choose',
      id: 'crowding',
      view: 'overlap',
      scene: { solo: null, hpHz: HP_OFF, bandHz: null },
      body: 'Here are the kick and the bass, drawn on the same picture.',
      question: 'Where are they crowding each other?',
      correct: 'low',
      right:
        'Around 80 to 150 Hz, where both are strong. This is the classic low-end problem in a mix.',
      choices: [
        { id: 'low', text: 'Around 80 to 150 Hz' },
        {
          id: 'mid',
          text: 'Around 1,000 Hz',
          feedback:
            'Neither has much there. Look where both shapes are tall at once.',
        },
        {
          id: 'high',
          text: 'Above 5,000 Hz',
          feedback:
            'That’s where the kick’s click is, but the bass has almost nothing there.',
        },
      ],
      why: {
        title: 'What people do about it',
        paragraphs: [
          'One of them gets the lowest spot: a deep kick and a slightly higher bass, or the other way round. Dipping one where the other peaks helps too.',
          'Another way is timing: **sidechaining** ducks the bass for an instant at each kick. You’ll meet that with compressors.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'on-a-phone',
      view: 'phone',
      scene: { solo: 'kick', bandHz: null, hpHz: HP_OFF, phone: false },
      body: 'Back to the question you started with. Switch **Phone speaker** on and off, listening to the kick.',
      caption:
        'A simple model: a filter at about 300 Hz. Real phones vary, and some do better.',
      question: 'What changed on the phone?',
      correct: 'speaker',
      right:
        'The phone can’t play the thump, so the click is all that’s left. The recording never changed.',
      choices: [
        {
          id: 'speaker',
          text: 'It can’t play the low end, so the click is left',
        },
        {
          id: 'adds',
          text: 'It adds a click to the sound',
          feedback:
            'Nothing’s added: the click was there all along, about 24 dB under the thump.',
        },
        {
          id: 'file',
          text: 'Phones play a different version of the file',
          feedback:
            'It’s the same file both times here, and you just heard the difference.',
        },
      ],
      why: {
        title: 'Why small speakers can’t do it',
        paragraphs: [
          'A long low wave needs a lot of air moved. That takes a big cone, and a phone’s speaker is about the size of a fingernail.',
          'That’s why producers add click or harmonics to a bass or kick: your brain partly rebuilds the missing low note from them, even on a small speaker.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    view: 'mix',
    scene: { solo: null, bandHz: null, hpHz: HP_OFF, phone: false },
    body: 'So nothing about the recording changed. A kick is a thump and a click, far apart, and each speaker plays what it can.',
    points: [
      'Hz is how fast it vibrates, and each doubling is an octave.',
      'Kick, snare, bass and hats each have their own places, and sometimes they overlap.',
      'A high-pass removes what’s below a frequency. Use it when you hear a reason to.',
    ],
    inSession:
      'Don’t judge a kick’s low end on laptop speakers. Check it on headphones or monitors, then check the click on your phone.',
    limits:
      'These numbers fit this kit. Another kick can sit lower or click higher, so treat all of them as places to start listening.',
    next: 'Next: how much of each, in decibels.',
  },
  practice: [
    doScreen<'above' | 'below'>({
      id: 'practice-bass',
      view: 'band',
      scene: { solo: 'bass', bandHz: 1500 },
      body: 'The bass is soloed. Find where it’s strongest.',
      right: 'About 80 to 200 Hz on this bass.',
      feedback: {
        above: 'Not much of it up here. It’s further left.',
        below: 'Under most of its energy. Come up.',
      },
      evaluate: inside(55, 240, 'above', 'below'),
      answer: { bandHz: 130 },
      probes: [
        { scene: { bandHz: 1500 }, expect: 'above' },
        { scene: { bandHz: 30 }, expect: 'below' },
        { scene: { bandHz: 130 }, expect: 'ok' },
      ],
      why: {
        title: 'Notes and their harmonics',
        paragraphs: [
          'This bass plays A, F, C and G, whose lowest notes sit around 45 to 65 Hz, with walking notes and strong harmonics above. That’s why its peak reaches about 130 Hz.',
        ],
      },
    }),
    {
      kind: 'ab',
      id: 'practice-highpass',
      view: 'ab',
      scene: { solo: 'kick', bandHz: null, phone: false },
      body: 'One of these kicks has a high-pass at 300 Hz.',
      question: 'Which one?',
      a: { hpHz: 300 },
      b: { hpHz: HP_OFF },
      correct: 'a',
      choiceA: 'this one has the high-pass',
      choiceB: 'this one has the high-pass',
      right:
        'No hump on the left, and no thump. It’s also a lot quieter, since most of the kick’s energy has gone.',
      wrong:
        'Listen again, and watch the left side of the picture. Which one’s lost its hump?',
      why: {
        title: 'Why it got quieter too',
        paragraphs: [
          'Most of this kick’s energy is under 150 Hz. Removing it takes most of the level with it, so when comparing EQ moves, match the levels before you decide which is better.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'practice-dull',
      view: 'mix',
      scene: { solo: 'hats', bandHz: null, hpHz: HP_OFF },
      body: 'Say a client tells you these hats sound dull.',
      question: 'Where would you try a small boost?',
      correct: 'air',
      right:
        'Up around 8 to 12 kHz, the top of what they have. A little goes a long way.',
      choices: [
        { id: 'air', text: 'Around 8,000 to 12,000 Hz' },
        {
          id: 'body',
          text: 'Around 200 Hz',
          feedback:
            'That’s the snare’s body. Hats have hardly anything there to boost.',
        },
        {
          id: 'kick',
          text: 'Around 60 Hz',
          feedback:
            'That’s kick territory, and hats have nothing there. Dull means the top’s missing.',
        },
      ],
      why: {
        title: 'Brightness lives up top',
        paragraphs: [
          'Words like “dull”, “bright” and “airy” usually point to the top few octaves. Clients seldom say numbers, so part of the job is translating.',
        ],
      },
    },
  ],
};
