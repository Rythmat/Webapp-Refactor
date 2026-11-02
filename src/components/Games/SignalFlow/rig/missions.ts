import { initialControls, STAGE_BOX_INPUTS } from './gearDefs';
import type { CheckContext, Mission } from './missionReducer';
import type {
  Cable,
  CableKind,
  ControlValue,
  GearInstance,
  GearKind,
  PortRef,
  RigEnv,
  RigState,
} from './rigTypes';
import { chainFrom, reaches, sinkHum, sinkLevel } from './traceSignal';

// ── The missions ───────────────────────────────────────────────────────────
// Five rigs, built up one job at a time: build it, listen through it, set it
// up by ear, then find out what happens when it breaks.

interface GearSpec {
  kind: GearKind;
  /** On the shelf, to be chosen. */
  shelf?: boolean;
  channels?: number;
  name?: string;
  controls?: Readonly<Record<string, ControlValue>>;
}

const ref = (text: string): PortRef => {
  const [gear, port] = text.split('/');
  return { gear, port };
};

const wire = (id: string, kind: CableKind, a: string, b: string): Cable => ({
  id,
  kind,
  a: ref(a),
  b: ref(b),
});

function rigOf(
  gear: Readonly<Record<string, GearSpec>>,
  cables: readonly Cable[] = [],
  env: RigEnv = {},
): () => RigState {
  return () => ({
    gear: Object.fromEntries(
      Object.entries(gear).map(([id, spec]): [string, GearInstance] => [
        id,
        {
          id,
          kind: spec.kind,
          name: spec.name,
          channels: spec.channels,
          placed: !spec.shelf,
          controls: initialControls(spec, spec.controls),
        },
      ]),
    ),
    cables,
    env,
  });
}

const allPlaced =
  (ids: readonly string[]) =>
  ({ rig }: CheckContext) =>
    ids.every((id) => rig.gear[id]?.placed);

/** Is this jack joined to that one, whichever way the cable went in? */
const joined = (rig: RigState, a: string, b: string) => {
  const p = ref(a);
  const q = ref(b);
  const same = (x: PortRef, y: PortRef) =>
    x.gear === y.gear && x.port === y.port;
  return rig.cables.some(
    (c) => (same(c.a, p) && same(c.b, q)) || (same(c.a, q) && same(c.b, p)),
  );
};

const control = (rig: RigState, gear: string, id: string) =>
  rig.gear[gear]?.controls[id];

const between = (value: number, low: number, high: number) =>
  value >= low && value <= high;

// ── Chapter 1: Voice to Speaker ────────────────────────────────────────────

const VOICE_LAYOUT = {
  mic: { x: 18, y: 42 },
  speaker: { x: 92, y: 60 },
  guitar: { x: 60, y: 80 },
  headphones: { x: 60, y: 70 },
};

const voiceFirst: Mission = {
  id: 'voice-build',
  chapter: 1,
  activity: 'build',
  title: 'Get the Singer Heard',
  brief:
    'A singer, a room, and nothing set up. Bring out what the job needs and connect it.',
  rig: rigOf({
    mic: { kind: 'dynamicMic', shelf: true },
    speaker: {
      kind: 'speaker',
      shelf: true,
      controls: { inputMode: 'mic' },
    },
    guitar: { kind: 'guitar', shelf: true },
    headphones: { kind: 'headphones', shelf: true },
  }),
  layout: VOICE_LAYOUT,
  rack: ['xlr', 'ts', 'speakon'],
  steps: [
    {
      prompt: 'Take what this job needs off the shelf.',
      choose: { needed: ['mic', 'speaker'] },
      check: allPlaced(['mic', 'speaker']),
      hint: 'A voice needs something to catch it, and something to make it loud again.',
    },
    {
      prompt:
        'Pick a cable from the rack, then plug it in at the mic and at the speaker.',
      check: ({ trace }) => reaches(trace, 'speaker', 'vox'),
      hint: 'A mic has three pins, and the cable with three pins is XLR.',
      learned:
        'A microphone’s signal is tiny. An XLR cable carries it, balanced, to something that can make it bigger.',
    },
  ],
  why: 'Air moved the mic’s diaphragm, the diaphragm made a small voltage, and the cable carried it to the speaker’s amplifier. Sound, then electricity, then sound again. Every rig you’ll ever patch is a longer version of this.',
};

const VOICE_DIAL_RIG = rigOf(
  {
    mic: { kind: 'dynamicMic' },
    speaker: { kind: 'speaker', controls: { inputMode: 'line' } },
  },
  [wire('mic-cable', 'xlr', 'mic/out', 'speaker/in')],
  { noiseFloorDb: -50 },
);

const voiceDial: Mission = {
  id: 'voice-dial',
  chapter: 1,
  activity: 'dial',
  title: 'Mic or Line?',
  brief:
    'It’s all plugged in, and something is wrong. The trouble is how the speaker is listening.',
  rig: VOICE_DIAL_RIG,
  layout: VOICE_LAYOUT,
  rack: [],
  steps: [
    {
      prompt:
        'The singer is barely there. The speaker’s input expects a much stronger signal. Tell it what’s really plugged in.',
      controls: [{ gear: 'speaker', ids: ['inputMode'] }],
      check: ({ rig }) => control(rig, 'speaker', 'inputMode') === 'mic',
      hint: 'A mic makes a mic-level signal. Line level is far stronger.',
      learned:
        'Mic level is about a thousand times weaker than line level. Plug a mic into a line input and you’ll get almost nothing.',
    },
    {
      prompt:
        'Now it’s loud enough, but hear that hiss? The gain is too low and the volume is making up for it. Turn the gain up, the volume down, and stop when it’s clean. Too far, and it will distort.',
      setup: { controls: { speaker: { gain: -14, volume: 14 } } },
      controls: [{ gear: 'speaker', ids: ['gain', 'volume'] }],
      confirm: 'It sounds clean',
      check: ({ rig, trace }) => {
        const gain = Number(control(rig, 'speaker', 'gain'));
        return (
          between(gain, -6, 5) &&
          trace.clipped.length === 0 &&
          between(sinkLevel(trace, 'speaker'), -22, -11)
        );
      },
      nudge: ({ rig, trace }) => {
        if (trace.clipped.length > 0) {
          return 'That crunch is the gain stage clipping: too much signal for it to hold. Turn the gain down.';
        }
        if (Number(control(rig, 'speaker', 'gain')) < -6) {
          return 'The hiss is still there. It comes after the gain, so the volume knob is boosting it. More gain, less volume.';
        }
        return sinkLevel(trace, 'speaker') > -11
          ? 'Clean, but too loud. Bring the volume down.'
          : 'Clean, but too quiet. Bring the volume up.';
      },
      hint: 'Try the gain near 0 and the volume near 0.',
      learned:
        'That is gain staging: get a strong, clean signal at the first stage, and everything after it has less noise to amplify.',
    },
  ],
  why: 'Every stage adds a little noise of its own. Gain set early lifts the voice above that noise. Volume set late lifts the voice and the noise together, so it can’t get you back what the gain gave away.',
};

const voiceProbe: Mission = {
  id: 'voice-probe',
  chapter: 1,
  activity: 'probe',
  title: 'Listen Along the Wire',
  brief:
    'A small mixer has joined the rig. Put your headphones on any cable to hear exactly what’s on it.',
  rig: rigOf(
    {
      mic: { kind: 'dynamicMic' },
      mixer: { kind: 'mixer', channels: 4 },
      speaker: { kind: 'speaker' },
    },
    [
      wire('mic-cable', 'xlr', 'mic/out', 'mixer/ch1'),
      wire('main-cable', 'xlr', 'mixer/main', 'speaker/in'),
    ],
  ),
  layout: {
    mic: { x: 14, y: 40 },
    mixer: { x: 52, y: 58 },
    speaker: { x: 106, y: 62 },
  },
  rack: [],
  steps: [
    {
      prompt:
        'Tap each cable in turn. What you hear is the signal at that exact point.',
      check: ({ probed }) =>
        probed.has('mic-cable') && probed.has('main-cable'),
      hint: 'There are two cables here. Tap the line itself.',
    },
    {
      prompt:
        'One of those cables carries a much stronger signal. Select it and say so.',
      confirm: 'This one is stronger',
      check: ({ probe }) => probe === 'main-cable',
      nudge: ({ probe }) =>
        probe
          ? 'Listen again, and watch the meter. That one is the weaker of the two.'
          : 'Tap a cable first, so you’re listening to it.',
      hint: 'The mixer’s gain stage sits between them.',
      learned:
        'The mic cable is at mic level. The channel’s gain lifts it to line level, which is what the mixer sends on.',
    },
  ],
  why: 'Probing is how engineers find anything. Start at the source and walk down the chain: the last place you can hear it good is right before the problem.',
};

const voiceFix: Mission = {
  id: 'voice-fix',
  chapter: 1,
  activity: 'fix',
  title: 'Power Up',
  brief:
    'Nothing has power yet. Plug it in, then switch it on, in the order that doesn’t punch the speaker.',
  rig: rigOf(
    {
      mic: { kind: 'dynamicMic' },
      mixer: { kind: 'mixer', channels: 4 },
      speaker: { kind: 'speaker' },
      strip: { kind: 'powerStrip' },
    },
    [
      wire('mic-cable', 'xlr', 'mic/out', 'mixer/ch1'),
      wire('main-cable', 'xlr', 'mixer/main', 'speaker/in'),
    ],
    { managedPower: true },
  ),
  layout: {
    mic: { x: 14, y: 40 },
    mixer: { x: 52, y: 58 },
    speaker: { x: 106, y: 62 },
    strip: { x: 66, y: 96 },
  },
  rack: ['iec'],
  steps: [
    {
      prompt:
        'Run a mains cord from the power strip to the mixer, and another to the speaker.',
      check: ({ rig }) =>
        rig.cables.filter((c) => c.kind === 'iec').length >= 2 &&
        ['mixer', 'speaker'].every((gear) =>
          rig.cables.some(
            (c) => c.kind === 'iec' && (c.a.gear === gear || c.b.gear === gear),
          ),
        ),
      hint: 'The IEC cord takes the socket on each piece of gear. Signal doesn’t travel on it, only power.',
    },
    {
      prompt:
        'Switch them both on. Do it in the wrong order, and you’ll hear why there’s a right one.',
      controls: [
        { gear: 'mixer', ids: ['power'] },
        { gear: 'speaker', ids: ['power'] },
      ],
      check: ({ rig, thumped }) =>
        !thumped &&
        control(rig, 'mixer', 'power') === 'on' &&
        control(rig, 'speaker', 'power') === 'on',
      hint: 'Anything feeding a speaker has to be running before the speaker is.',
      learned:
        'Speakers on last, speakers off first. A mixer waking up sends a jolt down its outputs, and a live speaker plays it.',
    },
  ],
  why: 'That thump is real energy hitting the speaker’s cone, and enough of them will damage it. Turn on from the source to the speaker. Turn off from the speaker to the source.',
};

// ── Chapter 2: Guitar to Amp ───────────────────────────────────────────────

const GUITAR_LAYOUT = {
  guitar: { x: 8, y: 50 },
  compressor: { x: 44, y: 64 },
  overdrive: { x: 66, y: 64 },
  delay: { x: 88, y: 64 },
  amp: { x: 124, y: 62 },
  mic: { x: 60, y: 30 },
};

const GUITAR_ORDER = ['guitar', 'compressor', 'overdrive', 'delay', 'amp'];

const guitarBuild: Mission = {
  id: 'guitar-build',
  chapter: 2,
  activity: 'build',
  title: 'Into the Amp',
  brief:
    'A guitar, three pedals and a combo amp. Signal runs from the guitar, through each pedal, to the amp.',
  rig: rigOf({
    guitar: { kind: 'guitar', shelf: true },
    compressor: { kind: 'compressor', shelf: true },
    overdrive: { kind: 'overdrive', shelf: true },
    delay: { kind: 'delay', shelf: true },
    amp: { kind: 'amp', shelf: true },
    mic: { kind: 'dynamicMic', shelf: true },
  }),
  layout: GUITAR_LAYOUT,
  rack: ['ts', 'xlr'],
  steps: [
    {
      prompt: 'Lay out the board. Leave what a guitar rig doesn’t use.',
      choose: { needed: GUITAR_ORDER },
      check: allPlaced(GUITAR_ORDER),
      hint: 'There is no singer in this rig.',
    },
    {
      prompt:
        'Patch the guitar through the compressor, the overdrive and the delay, into the amp. On each pedal, in and out are different jacks.',
      check: ({ rig, trace }) => {
        const chain = chainFrom(rig, 'guitar');
        return (
          reaches(trace, 'amp', 'guitar') &&
          ['compressor', 'overdrive', 'delay'].every((p) => chain.includes(p))
        );
      },
      hint: 'Always the output of one thing to the input of the next.',
      learned:
        'A guitar’s signal is weak and high-impedance, so instrument cables and pedals are built for it. Keep the runs short.',
    },
  ],
  why: 'Pedals are stages, like everything else. Each takes the signal in, does one job and passes it on, and an amp is just the last and biggest stage.',
};

const GUITAR_CHAIN = [
  wire('to-comp', 'ts', 'guitar/out', 'compressor/in'),
  wire('to-drive', 'ts', 'compressor/out', 'overdrive/in'),
  wire('to-delay', 'ts', 'overdrive/out', 'delay/in'),
  wire('to-amp', 'ts', 'delay/out', 'amp/in'),
];
const GUITAR_GEAR = {
  guitar: { kind: 'guitar' },
  compressor: { kind: 'compressor' },
  overdrive: { kind: 'overdrive' },
  delay: { kind: 'delay' },
  amp: { kind: 'amp' },
} as const;

const guitarProbe: Mission = {
  id: 'guitar-probe',
  chapter: 2,
  activity: 'probe',
  title: 'What Each Pedal Adds',
  brief:
    'Put your headphones on each cable. You’ll hear the sound being built, one stage at a time.',
  rig: rigOf(GUITAR_GEAR, GUITAR_CHAIN),
  layout: GUITAR_LAYOUT,
  rack: [],
  steps: [
    {
      prompt: 'Find the first cable with grit on it, and say so.',
      confirm: 'The grit starts here',
      check: ({ probe }) => probe === 'to-delay',
      nudge: ({ probe }) =>
        probe === 'to-amp'
          ? 'There’s grit here, but it started earlier. Walk back up the chain.'
          : probe
            ? 'That one’s still clean. Keep walking down the chain.'
            : 'Tap a cable first, so you’re listening to it.',
      hint: 'Grit comes from the overdrive, so it’s on whatever leaves that pedal.',
    },
    {
      prompt: 'Now find the first cable with echoes on it.',
      confirm: 'The echoes start here',
      check: ({ probe }) => probe === 'to-amp',
      nudge: ({ probe }) =>
        probe
          ? 'No echoes here yet. Listen for the riff repeating.'
          : 'Tap a cable first, so you’re listening to it.',
      hint: 'Only one cable comes after the delay.',
      learned:
        'Notice how raw the cable from the guitar sounds. Most of a guitar’s tone happens after the pickups.',
    },
  ],
  why: 'None of these cables sound like the finished guitar, not even the last. The amp’s preamp and speaker still have their say, and that’s why a guitar plugged straight into a mixer sounds so thin.',
};

/** Every pedal in the chain, and the chain reaching the amp. */
const chainWhole = ({ rig, trace }: CheckContext) =>
  reaches(trace, 'amp', 'guitar') && pedalOrder(rig).every((at) => at >= 0);

const pedalOrder = (rig: RigState) => {
  const chain = chainFrom(rig, 'guitar');
  return ['compressor', 'overdrive', 'delay'].map((p) => chain.indexOf(p));
};

const guitarOrder: Mission = {
  id: 'guitar-order',
  chapter: 2,
  activity: 'order',
  title: 'Order Matters',
  brief:
    'The same three pedals in the wrong order. Same gear, and a very different sound.',
  rig: rigOf(GUITAR_GEAR, [
    wire('to-first', 'ts', 'guitar/out', 'delay/in'),
    wire('to-second', 'ts', 'delay/out', 'overdrive/in'),
    wire('to-third', 'ts', 'overdrive/out', 'compressor/in'),
    wire('to-amp', 'ts', 'compressor/out', 'amp/in'),
  ]),
  layout: GUITAR_LAYOUT,
  rack: [],
  steps: [
    {
      prompt:
        'The echoes are going through the dirt, so they smear into a mess. Tap the delay, then the overdrive, to swap them, and hear each echo come clean.',
      swappable: ['compressor', 'overdrive', 'delay'],
      check: (context) => {
        const [, drive, delay] = pedalOrder(context.rig);
        return chainWhole(context) && drive < delay;
      },
      hint: 'Tap one pedal, then the other: they trade places in the chain.',
      learned:
        'Delay after drive: each repeat is a clean copy of a dirty note. Delay before drive: the repeats pile up and distort together.',
    },
    {
      prompt:
        'Now the compressor. It’s squashing a signal that’s already distorted, and pumping the noise up with it. Move it to where it can do some good.',
      swappable: ['compressor', 'overdrive', 'delay'],
      confirm: 'That’s the order',
      check: (context) => {
        const [comp, drive, delay] = pedalOrder(context.rig);
        return chainWhole(context) && comp < drive && drive < delay;
      },
      nudge: (context) => {
        if (!chainWhole(context)) {
          return 'The chain’s broken. Every pedal has to be in it, all the way to the amp.';
        }
        const [comp, drive, delay] = pedalOrder(context.rig);
        return comp > drive
          ? 'The compressor should see the guitar’s dynamics before the overdrive flattens them.'
          : drive > delay
            ? 'The echoes are back in the dirt. Keep the delay after the overdrive.'
            : 'Listen once more.';
      },
      hint: 'A compressor evens out your playing, so it wants to be nearest the guitar.',
      learned:
        'Dynamics first, then dirt, then time. It’s a starting point, and breaking it on purpose is half the fun.',
    },
  ],
  why: 'A signal chain isn’t a list, it’s a sequence. Each stage processes everything that came before it, so the order is part of the sound.',
};

const guitarFix: Mission = {
  id: 'guitar-fix',
  chapter: 2,
  activity: 'fix',
  title: 'Dead Air',
  brief:
    'Someone patched this in a hurry. The guitar is playing and the amp is on, but nothing is coming out.',
  rig: rigOf(
    {
      guitar: { kind: 'guitar' },
      overdrive: { kind: 'overdrive' },
      delay: { kind: 'delay' },
      amp: { kind: 'amp' },
    },
    [
      wire('bad-one', 'ts', 'guitar/out', 'overdrive/out'),
      wire('bad-two', 'ts', 'overdrive/in', 'delay/in'),
      wire('to-amp', 'ts', 'delay/out', 'amp/in'),
    ],
  ),
  layout: {
    guitar: { x: 8, y: 50 },
    overdrive: { x: 56, y: 64 },
    delay: { x: 82, y: 64 },
    amp: { x: 120, y: 62 },
  },
  rack: ['ts'],
  steps: [
    {
      prompt:
        'Find where the signal stops. Tap the cables to listen. Pull any plug with a tap, then repatch it.',
      check: ({ trace }) => reaches(trace, 'amp', 'guitar'),
      hint: 'Look at the overdrive’s jacks: which is the input and which is the output? Hover over them to read their names.',
      learned:
        'A pedal only works one way. Output into output is silence, and it’s the most common mistake on any pedalboard.',
    },
    {
      prompt:
        'There’s sound now, but the echoes have gone. Nothing is unplugged this time.',
      setup: { controls: { delay: { engaged: 'off' } } },
      controls: [{ gear: 'delay', ids: ['engaged'] }],
      check: ({ rig }) => control(rig, 'delay', 'engaged') === 'on',
      hint: 'Is the delay actually switched on?',
      learned:
        'A bypassed pedal passes the signal straight through, so a chain can work perfectly and still be missing a stage.',
    },
  ],
  why: 'Silence and a missing effect are different problems. If you hear nothing, walk the chain with your ears. If something’s missing, check every switch before you touch a cable.',
};

// ── Chapter 3: Home Studio ─────────────────────────────────────────────────

const STUDIO_LAYOUT = {
  mic: { x: 8, y: 58 },
  keyboard: { x: 24, y: 96 },
  iface: { x: 58, y: 54 },
  laptop: { x: 98, y: 58 },
  monitor: { x: 140, y: 58 },
  phones: { x: 78, y: 92 },
  amp: { x: 72, y: 96, scale: 0.5 },
};

const STUDIO_GEAR = {
  mic: { kind: 'condenserMic' },
  keyboard: { kind: 'midiKeyboard' },
  iface: { kind: 'interface', controls: { phantom: 'on' } },
  laptop: { kind: 'laptop' },
  monitor: { kind: 'monitor' },
  phones: { kind: 'headphones' },
} as const;

const STUDIO_CABLES = [
  wire('mic-cable', 'xlr', 'mic/out', 'iface/in1'),
  wire('key-cable', 'usb', 'keyboard/out', 'laptop/usb1'),
  wire('iface-cable', 'usb', 'iface/usb', 'laptop/usb2'),
  wire('mon-cable', 'trs', 'iface/mon', 'monitor/in'),
  wire('phones-cable', 'trs', 'iface/phones', 'phones/in'),
];

const studioBuild: Mission = {
  id: 'studio-build',
  chapter: 3,
  activity: 'build',
  title: 'Two Roads In',
  brief:
    'A vocal and a software piano, recorded on one laptop. They reach it by completely different roads.',
  rig: rigOf(
    {
      mic: { kind: 'condenserMic', shelf: true },
      keyboard: { kind: 'midiKeyboard', shelf: true },
      iface: { kind: 'interface', shelf: true, controls: { phantom: 'on' } },
      laptop: { kind: 'laptop', shelf: true },
      monitor: { kind: 'monitor', shelf: true },
      phones: { kind: 'headphones', shelf: true },
      amp: { kind: 'amp', shelf: true },
    },
    [],
  ),
  layout: STUDIO_LAYOUT,
  rack: ['xlr', 'usb', 'trs', 'midi'],
  steps: [
    {
      prompt: 'Set up the desk. One thing here doesn’t belong in this room.',
      choose: {
        needed: ['mic', 'keyboard', 'iface', 'laptop', 'monitor', 'phones'],
      },
      check: allPlaced([
        'mic',
        'keyboard',
        'iface',
        'laptop',
        'monitor',
        'phones',
      ]),
      hint: 'A computer’s speakers come by way of an interface, so nothing here needs a guitar amp.',
    },
    {
      prompt:
        'Get the mic and the keyboard into the laptop, then its sound out to the monitor and the headphones.',
      check: ({ trace }) =>
        reaches(trace, 'monitor', 'vox') &&
        reaches(trace, 'monitor', 'keys') &&
        reaches(trace, 'phones', 'vox'),
      hint: 'The mic goes to the interface, and the interface and the keyboard each go to the laptop by USB. The interface’s monitor output feeds the speaker.',
      learned:
        'The interface is the door: analog from the room in, digital to the laptop, and analog back out to your ears.',
    },
  ],
  why: 'The mic’s road carries sound, turned into numbers by the interface. The keyboard’s road carries no sound at all. Both arrive at the same software, and both leave through the same door.',
};

const studioProbe: Mission = {
  id: 'studio-probe',
  chapter: 3,
  activity: 'probe',
  title: 'The Silent Cable',
  brief: 'A MIDI keyboard makes no sound. So what’s going down its cable?',
  rig: rigOf(STUDIO_GEAR, STUDIO_CABLES),
  layout: STUDIO_LAYOUT,
  rack: [],
  steps: [
    {
      prompt:
        'Put your headphones on the keyboard’s cable. Listen, and watch what moves along it.',
      check: ({ probed }) => probed.has('key-cable'),
      hint: 'It’s the cable running from the keyboard to the laptop.',
      learned:
        'Silence, and a stream of dots. Those are notes: which key, how hard, and when. There’s no sound in there at all.',
    },
    {
      prompt:
        'So where does the keyboard’s sound first exist as sound on a cable? Find it.',
      confirm: 'The sound starts here',
      check: ({ probe }) => probe === 'iface-cable',
      nudge: ({ probe }) =>
        probe === 'key-cable'
          ? 'That’s still only notes.'
          : probe === 'mic-cable'
            ? 'That’s the singer, and it never goes near the keyboard.'
            : probe
              ? 'You can hear it there, but it existed one cable earlier.'
              : 'Tap a cable first, so you’re listening to it.',
      hint: 'The laptop plays the notes. What carries the laptop’s sound away?',
      learned:
        'The laptop’s instrument turned the notes into sound, which left by USB to the interface.',
    },
  ],
  why: 'MIDI is sheet music, not a recording. Swap the instrument in the laptop, and the same cable’s same notes play a piano, a synth or a drum kit.',
};

const studioDial: Mission = {
  id: 'studio-dial',
  chapter: 3,
  activity: 'dial',
  title: 'Feel the Buffer',
  brief:
    'Your computer works in small batches of samples. Set the batch size, and feel the difference under your fingers.',
  handKeys: true,
  rig: rigOf(
    {
      keyboard: { kind: 'midiKeyboard' },
      iface: { kind: 'interface' },
      laptop: { kind: 'laptop', controls: { buffer: '2048' } },
      phones: { kind: 'headphones' },
    },
    [
      wire('key-cable', 'usb', 'keyboard/out', 'laptop/usb1'),
      wire('iface-cable', 'usb', 'iface/usb', 'laptop/usb2'),
      wire('phones-cable', 'trs', 'iface/phones', 'phones/in'),
    ],
  ),
  layout: STUDIO_LAYOUT,
  rack: [],
  steps: [
    {
      prompt:
        'Play the keys below. There’s a real gap before you hear each note. Shrink the buffer until playing feels tight, and stop before it starts to crackle.',
      keys: true,
      controls: [{ gear: 'laptop', ids: ['buffer'] }],
      confirm: 'Tight, and no crackle',
      check: ({ rig, trace }) =>
        reaches(trace, 'phones', 'keys') &&
        ['128', '256'].includes(String(control(rig, 'laptop', 'buffer'))),
      nudge: ({ rig, trace }) => {
        if (!reaches(trace, 'phones', 'keys')) {
          return 'The keys aren’t reaching the headphones. Check the cables.';
        }
        const buffer = Number(control(rig, 'laptop', 'buffer'));
        return buffer < 128
          ? 'Hear the crackle? The computer can’t finish each batch in time. Go up a step.'
          : 'There’s still a lag you can feel. Go smaller.';
      },
      hint: 'Try 256, then 128.',
      learned:
        'At 2048 samples, you were hearing each note about 90 milliseconds late. At 128, it’s about 9, which your hands can’t feel.',
    },
  ],
  why: 'A small buffer feels great and works the computer hard. A big one is safe and slow. So track with it small, and when you mix and nobody’s playing live, turn it up.',
};

const studioFix: Mission = {
  id: 'studio-fix',
  chapter: 3,
  activity: 'fix',
  title: 'No Vocal',
  brief:
    'The session is open, the singer is singing, and there’s no vocal. Every cable is in.',
  rig: rigOf(
    {
      ...STUDIO_GEAR,
      iface: { kind: 'interface', controls: { phantom: 'off' } },
    },
    STUDIO_CABLES,
  ),
  layout: STUDIO_LAYOUT,
  rack: [],
  steps: [
    {
      prompt:
        'This is a condenser mic, and it’s silent even on its own cable. What does a condenser need that a dynamic mic doesn’t?',
      controls: [{ gear: 'iface', ids: ['phantom'] }],
      check: ({ trace }) => reaches(trace, 'monitor', 'vox'),
      hint: 'Press the 48V button on the interface.',
      learned:
        'Phantom power runs 48 volts up the same XLR cable that brings the signal down. Turn it on with the volume low, because it pops.',
    },
    {
      prompt:
        'The vocal’s back, but it sounds tiny and the monitor has stopped. It’s playing through the wrong speakers.',
      setup: { controls: { laptop: { output: 'laptop' } } },
      controls: [{ gear: 'laptop', ids: ['output'] }],
      check: ({ rig }) => control(rig, 'laptop', 'output') === 'interface',
      hint: 'In the laptop’s settings, send the sound out through the interface.',
      learned:
        'Computers love switching back to their own speakers. When a monitor goes silent, check the sound output before you check a cable.',
    },
  ],
  why: 'The cables can all be perfect while the fault is a setting. A working engineer checks power, then routing, then cables.',
};

// ── Chapter 4: Live Stage ──────────────────────────────────────────────────

const STAGE_LAYOUT = {
  mic: { x: 10, y: 30 },
  guitar: { x: 0, y: 66 },
  di: { x: 50, y: 56 },
  mixer: { x: 98, y: 66 },
  speaker: { x: 152, y: 56 },
  wedge: { x: 42, y: 110 },
};

const stageBuild: Mission = {
  id: 'stage-build',
  chapter: 4,
  activity: 'build',
  title: 'The Stage Plot',
  brief:
    'A singer and a guitarist on stage, a mixer at the back of the room. That’s a long way for a cable.',
  rig: rigOf(
    {
      mic: { kind: 'dynamicMic', shelf: true },
      guitar: { kind: 'guitar', shelf: true },
      di: { kind: 'di', shelf: true },
      mixer: {
        kind: 'mixer',
        channels: 4,
        shelf: true,
        controls: { gain2: 20, aux1: -6, aux2: -12 },
      },
      speaker: { kind: 'speaker', shelf: true },
      wedge: { kind: 'wedge', shelf: true },
    },
    [],
    { farGear: ['mixer'] },
  ),
  layout: STAGE_LAYOUT,
  rack: ['xlr', 'ts', 'speakon'],
  steps: [
    {
      prompt:
        'Bring out the mic, the guitar and everything between them and the crowd.',
      choose: { needed: ['mic', 'guitar', 'di', 'mixer', 'speaker', 'wedge'] },
      check: allPlaced(['mic', 'guitar', 'di', 'mixer', 'speaker', 'wedge']),
      hint: 'Everything on this shelf has a job.',
    },
    {
      prompt:
        'Connect it: both instruments into the mixer, its main output to the speaker, and its aux to the wedge. Keep the hum out.',
      check: ({ trace }) =>
        reaches(trace, 'speaker', 'vox') &&
        reaches(trace, 'speaker', 'guitar') &&
        reaches(trace, 'wedge', 'vox') &&
        sinkHum(trace, 'speaker') === -Infinity,
      hint: 'A guitar lead can’t make the long run to the mixer. The DI turns it into something an XLR cable can carry.',
      learned:
        'The main output feeds the crowd, and the aux feeds the stage: two different mixes from one desk.',
    },
  ],
  why: 'That is the backbone of every live show: sources on stage, a balanced run to the desk, and separate mixes back out for the crowd and the performers.',
};

/** The singer and the guitar, both reaching the crowd. */
const stageHeard = (trace: CheckContext['trace']) =>
  reaches(trace, 'speaker', 'vox') && reaches(trace, 'speaker', 'guitar');

const stageGear = {
  mic: { kind: 'dynamicMic' },
  guitar: { kind: 'guitar' },
  di: { kind: 'di' },
  mixer: { kind: 'mixer', channels: 4, controls: { aux1: -6, aux2: -12 } },
  speaker: { kind: 'speaker' },
  wedge: { kind: 'wedge' },
} as const;

const stageCables = [
  wire('mic-cable', 'xlr', 'mic/out', 'mixer/ch1'),
  wire('guitar-cable', 'ts', 'guitar/out', 'di/in'),
  wire('di-cable', 'xlr', 'di/out', 'mixer/ch2'),
  wire('main-cable', 'xlr', 'mixer/main', 'speaker/in'),
  wire('aux-cable', 'xlr', 'mixer/aux', 'wedge/in'),
];

const stageBalance: Mission = {
  id: 'stage-balance',
  chapter: 4,
  activity: 'dial',
  title: 'Why Balanced?',
  brief:
    'The guitar’s running straight to the desk down 100 feet of instrument cable. Listen to what it has picked up.',
  rig: rigOf(
    {
      ...stageGear,
      mixer: {
        kind: 'mixer',
        channels: 4,
        controls: { gain2: 8, aux1: -6, aux2: -12 },
      },
    },
    [
      wire('mic-cable', 'xlr', 'mic/out', 'mixer/ch1'),
      wire('long-lead', 'ts', 'guitar/out', 'mixer/ch2'),
      wire('main-cable', 'xlr', 'mixer/main', 'speaker/in'),
      wire('aux-cable', 'xlr', 'mixer/aux', 'wedge/in'),
    ],
    { farGear: ['mixer'] },
  ),
  layout: STAGE_LAYOUT,
  rack: ['ts', 'xlr'],
  steps: [
    {
      prompt:
        'That hum is the mains, and the highs are gone too. Pull the long lead. Put the guitar into the DI, and run XLR from the DI to channel 2.',
      check: ({ rig, trace }) =>
        joined(rig, 'guitar/out', 'di/in') &&
        reaches(trace, 'speaker', 'guitar') &&
        sinkHum(trace, 'speaker') === -Infinity,
      hint: 'Tap the plug at channel 2 to pull it, then the plug at the guitar.',
      learned:
        'A balanced line sends the signal twice, once upside down. Hum lands on both wires the same way, so flipping one and adding them cancels the hum and keeps the music. You’re hearing that happen.',
    },
    {
      prompt:
        'The hum’s gone, but a DI lowers the signal to mic level. Bring channel 2’s gain up to meet the vocal.',
      controls: [{ gear: 'mixer', ids: ['gain2'] }],
      confirm: 'The guitar’s back',
      check: ({ rig, trace }) =>
        stageHeard(trace) &&
        between(Number(control(rig, 'mixer', 'gain2')), 15, 26) &&
        trace.clipped.length === 0,
      nudge: ({ rig, trace }) =>
        !stageHeard(trace)
          ? 'The singer and the guitar both have to reach the speaker. Check the cables.'
          : trace.clipped.length
            ? 'Too hot. That’s clipping.'
            : Number(control(rig, 'mixer', 'gain2')) < 15
              ? 'Still quieter than the vocal. More gain.'
              : 'Back it off a little.',
      hint: 'Around 20 dB, the same as the mic’s channel.',
      learned:
        'A DI gives you two things: a balanced signal that survives distance, and a level the mixer’s mic input expects.',
    },
  ],
  why: 'Long runs are where unbalanced signals die. Anything going further than a few meters goes balanced, and that’s what XLR, TRS and DI boxes are for.',
};

const stageWedge: Mission = {
  id: 'stage-wedge',
  chapter: 4,
  activity: 'dial',
  title: 'Hear Yourself',
  brief:
    'The crowd can hear the singer, but the singer can’t hear themselves. Walk up on stage and fix that.',
  rig: rigOf(
    {
      ...stageGear,
      mixer: {
        kind: 'mixer',
        channels: 4,
        controls: { gain2: 20, aux1: -40, aux2: -40 },
      },
    },
    stageCables,
    { listen: 'foh' },
  ),
  layout: STAGE_LAYOUT,
  rack: [],
  steps: [
    {
      prompt:
        'Walk to the stage, then bring channel 1’s aux up, so the vocal comes out of the wedge.',
      walkable: true,
      controls: [{ gear: 'mixer', ids: ['aux1', 'auxMaster'] }],
      confirm: 'I can hear myself',
      check: ({ rig, trace }) =>
        stageHeard(trace) &&
        rig.env.listen === 'stage' &&
        reaches(trace, 'wedge', 'vox', -26),
      nudge: ({ rig, trace }) =>
        !stageHeard(trace)
          ? 'The crowd has lost someone. Check the cables.'
          : rig.env.listen !== 'stage'
            ? 'You’re still at the desk. Walk to the stage first, and listen from there.'
            : 'The wedge is still too quiet. Bring the aux up.',
      hint: 'Aux 1 near −6 dB.',
    },
    {
      prompt:
        'Now the engineer pulls the vocal fader down for a quiet song, and the singer’s wedge drops with it. Switch the aux send so the fader can’t touch the wedge.',
      setup: { controls: { mixer: { fader1: -30 } } },
      walkable: true,
      controls: [{ gear: 'mixer', ids: ['auxMode', 'fader1'] }],
      check: ({ rig, trace }) =>
        stageHeard(trace) &&
        control(rig, 'mixer', 'auxMode') === 'pre' &&
        reaches(trace, 'wedge', 'vox', -26),
      hint: 'A pre-fader send taps the channel before its fader.',
      learned:
        'Post-fader follows the desk’s mix, which is right for effects. Pre-fader ignores it, which is right for a performer’s monitor.',
    },
  ],
  why: 'One input, two mixes. The fader belongs to the crowd, and the aux belongs to the stage. A pre-fader aux keeps them independent.',
};

const stageFix: Mission = {
  id: 'stage-fix',
  chapter: 4,
  activity: 'fix',
  title: 'Ground Loop',
  brief:
    'Everything’s balanced and everything’s right, and there’s still a hum. The stage and the desk are on different power circuits.',
  rig: rigOf(
    {
      ...stageGear,
      mixer: { kind: 'mixer', channels: 4, controls: { aux1: -6 } },
    },
    stageCables,
    { groundLoop: true },
  ),
  layout: STAGE_LAYOUT,
  rack: [],
  steps: [
    {
      prompt:
        'Walk the chain with your headphones. Find the first cable with hum on it, and you’ve found where to fix it.',
      controls: [{ gear: 'di', ids: ['lift'] }],
      check: ({ trace }) =>
        stageHeard(trace) && sinkHum(trace, 'speaker') === -Infinity,
      hint: 'The hum starts on the cable leaving the DI. DI boxes have a switch for exactly this.',
      learned:
        'The lift switch breaks the ground connection between the stage and the desk, so the loop’s hum current has nowhere to flow.',
    },
  ],
  why: 'Two pieces of gear grounded in two places make a loop, and a loop picks up the mains. Never lift the safety ground on a power cord. Lift it on the signal side, with the switch made for it.',
};

// ── Chapter 5: Full Band ───────────────────────────────────────────────────

const INPUTS = [
  'kit/kick',
  'kit/snare',
  'kit/hat',
  'kit/tom',
  'kit/overhead',
  'bassDi/out',
  'guitarDi/out',
  'mic/out',
];
const INPUT_NAMES = [
  'Kick',
  'Snare',
  'Hi-hat',
  'Tom',
  'Overhead',
  'Bass',
  'Guitar',
  'Vocal',
];

const BAND_LAYOUT = {
  kit: { x: 30, y: 44 },
  bass: { x: 8, y: 104, scale: 0.5 },
  guitar: { x: 44, y: 106, scale: 0.55 },
  bassDi: { x: 78, y: 92, scale: 2.4 },
  guitarDi: { x: 100, y: 96, scale: 2.4 },
  mic: { x: 84, y: 22 },
  box: { x: 112, y: 58 },
  mixer: { x: 166, y: 72 },
  speaker: { x: 210, y: 58 },
  wedge: { x: 170, y: 112 },
};

const bandGains: Record<string, number> = {};
for (let ch = 1; ch <= STAGE_BOX_INPUTS; ch++) bandGains[`gain${ch}`] = 20;

const BAND_GEAR = {
  kit: { kind: 'drumKit' },
  bass: { kind: 'bass' },
  guitar: { kind: 'guitar' },
  bassDi: { kind: 'di', name: 'Bass DI' },
  guitarDi: { kind: 'di', name: 'Guitar DI' },
  mic: { kind: 'dynamicMic' },
  box: { kind: 'stageBox' },
  mixer: {
    kind: 'mixer',
    channels: 8,
    controls: {
      ...bandGains,
      fader1: -6,
      fader2: -6,
      fader3: -10,
      fader4: -8,
      fader5: -12,
      fader6: -6,
      fader7: -6,
      fader8: -2,
      master: -6,
      aux8: -6,
    },
  },
  speaker: { kind: 'speaker' },
  wedge: { kind: 'wedge' },
} as const;

const BAND_LEADS = [
  wire('bass-lead', 'ts', 'bass/out', 'bassDi/in'),
  wire('guitar-lead', 'ts', 'guitar/out', 'guitarDi/in'),
  wire('aux-cable', 'xlr', 'mixer/aux', 'wedge/in'),
];

const inputLines = INPUTS.map((source, i) =>
  wire(`input-${i + 1}`, 'xlr', source, `box/in${i + 1}`),
);
const multicore = wire('snake', 'multicore', 'box/multi', 'mixer/multi');
const mainCable = wire('main-cable', 'xlr', 'mixer/main', 'speaker/in');

/** Everyone on the input list, reaching the speaker. */
const wholeBand = (trace: CheckContext['trace']) =>
  ['kick', 'snare', 'hat', 'tom', 'overhead', 'bass', 'guitar', 'vox'].every(
    (sound) => reaches(trace, 'speaker', sound),
  );

const inputsPatched = (rig: RigState) =>
  INPUTS.every((source, i) => joined(rig, source, `box/in${i + 1}`));

const bandBuild: Mission = {
  id: 'band-build',
  chapter: 5,
  activity: 'build',
  title: 'Patch the Stage',
  brief:
    'Eight channels, one snake. The input list says what goes where, and everyone in the building depends on it being right.',
  rig: rigOf(BAND_GEAR, BAND_LEADS),
  layout: BAND_LAYOUT,
  inputList: INPUT_NAMES,
  rack: ['xlr', 'multicore', 'ts'],
  steps: [
    {
      prompt:
        'Follow the input list. Patch each drum mic, the DIs and the vocal into the stage box, each on its numbered input.',
      check: ({ rig }) => inputsPatched(rig),
      hint: 'Input 1 is the kick’s mic, 2 is the snare’s, and so on down the list.',
      learned:
        'An input list is a contract. Channel 1 is the kick on every show, so the engineer’s hands know where everything is.',
    },
    {
      prompt:
        'Now the snake to the desk, and the desk’s main output to the speaker.',
      check: ({ trace }) => wholeBand(trace),
      hint: 'The multicore goes from the stage box to the mixer. The XLR goes from the mixer’s main output to the speaker.',
      learned:
        'One thick cable replaces eight long ones. That’s the whole point of a stage box.',
    },
  ],
  why: 'Eight separate signals are now on one cable, kept apart and balanced, ready to be mixed. There’s a whole band in that one line.',
};

const bandCheck: Mission = {
  id: 'band-check',
  chapter: 5,
  activity: 'probe',
  title: 'Line Check',
  brief:
    'Before the doors open, you check every line. Two of these drums are in the wrong channels, and only your ears can tell you which.',
  rig: rigOf(BAND_GEAR, [
    ...BAND_LEADS,
    wire('input-1', 'xlr', 'kit/kick', 'box/in1'),
    wire('input-2', 'xlr', 'kit/hat', 'box/in2'),
    wire('input-3', 'xlr', 'kit/snare', 'box/in3'),
    ...inputLines.slice(3),
    multicore,
    mainCable,
  ]),
  layout: BAND_LAYOUT,
  inputList: INPUT_NAMES,
  rack: ['xlr'],
  steps: [
    {
      prompt:
        'Solo each channel in turn and check it against the input list. Find the two that are swapped, then re-patch them at the stage box.',
      controls: [{ gear: 'mixer', ids: ['solo'] }],
      check: ({ rig }) => inputsPatched(rig),
      hint: 'Channel 2 should be the snare. Does it sound like one?',
      learned:
        'Solo lets you check one line without changing the mix. A line check takes minutes, and it saves your show.',
    },
  ],
  why: 'Swapped lines don’t fail, they just lie: every fader moves the wrong instrument. So engineers check with their ears against the list, every time.',
};

const bandMix: Mission = {
  id: 'band-mix',
  chapter: 5,
  activity: 'dial',
  title: 'Mix the Band',
  brief:
    'Every line’s right, and the balance is wrong. The hi-hat’s on top and the singer’s buried. Fix it with the faders.',
  rig: rigOf(
    {
      ...BAND_GEAR,
      mixer: {
        kind: 'mixer',
        channels: 8,
        controls: {
          ...bandGains,
          fader1: -18,
          fader2: -14,
          fader3: 2,
          fader4: -16,
          fader5: -18,
          fader6: -20,
          fader7: -8,
          fader8: -24,
          master: -8,
          aux8: -6,
        },
      },
    },
    [...BAND_LEADS, ...inputLines, multicore, mainCable],
  ),
  layout: BAND_LAYOUT,
  inputList: INPUT_NAMES,
  rack: [],
  steps: [
    {
      prompt:
        'Build it from the bottom: kick and bass first, then the rest of the kit, then guitar, then bring the vocal up on top. Keep the hi-hat well down.',
      controls: [
        {
          gear: 'mixer',
          ids: [
            'fader1',
            'fader2',
            'fader3',
            'fader4',
            'fader5',
            'fader6',
            'fader7',
            'fader8',
            'master',
          ],
        },
      ],
      confirm: 'That’s the mix',
      check: ({ trace }) => mixProblem(trace) === null,
      nudge: ({ trace }) => mixProblem(trace) ?? 'Listen once more.',
      hint: 'Vocal around −2, kick and bass around −6, hi-hat around −14.',
      learned:
        'A mix is a hierarchy. Something has to be on top, and the singer is usually it.',
    },
  ],
  why: 'All the faders were doing was choosing what you notice first. The band didn’t change, and a good balance is still what makes it sound like one.',
};

function mixProblem(trace: CheckContext['trace']): string | null {
  const main = trace.sinks.find((sink) => sink.gear === 'speaker');
  if (!main) return 'Nothing’s reaching the speaker.';
  if (!wholeBand(trace)) {
    return 'Someone’s missing from the mix. Every channel has to be in it.';
  }
  const level = (sound: string) =>
    Object.entries(main.levels).find(([name]) =>
      name.endsWith(`:${sound}`),
    )?.[1] ?? -Infinity;
  const vox = level('vox');
  if (trace.clipped.length)
    return 'Something’s clipping. Pull everything down a little.';
  if (level('hat') > level('snare') - 2) {
    return 'The hi-hat’s still on top of the snare. Bring it down.';
  }
  if (level('hat') > level('kick') - 3) {
    return 'The hi-hat’s louder than the kick. Bring it down.';
  }
  for (const [sound, name] of [
    ['kick', 'kick'],
    ['bass', 'bass'],
    ['guitar', 'guitar'],
    ['snare', 'snare'],
  ] as const) {
    if (vox < level(sound) + 1) {
      return `The vocal’s buried under the ${name}. Lift the vocal, or pull the ${name} down.`;
    }
  }
  if (level('kick') < vox - 10) return 'The kick has disappeared. Bring it up.';
  if (level('bass') < vox - 10) return 'The bass has disappeared. Bring it up.';
  if (!between(main.levelDb, -26, -8)) {
    return main.levelDb < -26
      ? 'A good balance, but too quiet. Raise the main fader.'
      : 'A good balance, but too loud. Lower the main fader.';
  }
  return null;
}

const bandFix: Mission = {
  id: 'band-fix',
  chapter: 5,
  activity: 'fix',
  title: 'Soundcheck',
  brief:
    'Doors in ten minutes. Three things are about to go wrong, one after another. Find each with your ears.',
  rig: rigOf(
    {
      ...BAND_GEAR,
      mixer: {
        kind: 'mixer',
        channels: 8,
        controls: {
          ...bandGains,
          fader1: -6,
          fader2: -6,
          fader3: -14,
          fader4: -8,
          fader5: -12,
          fader6: -6,
          fader7: -6,
          fader8: -2,
          master: -6,
          aux8: -6,
        },
      },
    },
    [...BAND_LEADS, ...inputLines, multicore, mainCable],
  ),
  layout: BAND_LAYOUT,
  inputList: INPUT_NAMES,
  rack: ['xlr'],
  steps: [
    {
      prompt: 'First: the singer has vanished. Everyone else is fine.',
      setup: { remove: ['input-8'] },
      check: ({ trace }) => reaches(trace, 'speaker', 'vox'),
      hint: 'Check that input 8 on the stage box has a cable in it. Someone tripped on it.',
      learned: 'A cable pulled out at one end. Start with the simple things.',
    },
    {
      prompt:
        'Now the whole band has gone. Only the kick is left. Every cable’s in. Look at the desk.',
      setup: { controls: { mixer: { solo: '1' } } },
      controls: [{ gear: 'mixer', ids: ['solo'] }],
      check: ({ rig }) => control(rig, 'mixer', 'solo') === '0',
      hint: 'Someone left a solo on.',
      learned:
        'A forgotten solo sounds like a catastrophe, and takes a second to fix.',
    },
    {
      prompt:
        'Last one. The vocal’s crunching on every loud note, and it isn’t the singer. Find the stage that’s overloading.',
      setup: { controls: { mixer: { gain8: 38 } } },
      controls: [{ gear: 'mixer', ids: ['gain8'] }],
      check: ({ trace }) => wholeBand(trace) && trace.clipped.length === 0,
      hint: 'Channel 8’s gain is far too high. Clipping at the input can’t be fixed anywhere later.',
      learned:
        'Distortion at the gain stage goes into every mix downstream, the wedge included. Fix it at the input, and nowhere else.',
    },
  ],
  why: 'Three faults, and you found each by listening and walking the chain, not by guessing. Signal flow is the map every engineer carries, and now you have it too.',
};

export interface Chapter {
  id: number;
  title: string;
  blurb: string;
  accentKey: string;
  missions: readonly Mission[];
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 1,
    title: 'Voice to Speaker',
    blurb: 'A mic, a cable, a speaker, and what levels really mean.',
    accentKey: 'Db',
    missions: [voiceFirst, voiceDial, voiceProbe, voiceFix],
  },
  {
    id: 2,
    title: 'Guitar to Amp',
    blurb: 'Build a pedalboard, and hear why order changes everything.',
    accentKey: 'E',
    missions: [guitarBuild, guitarProbe, guitarOrder, guitarFix],
  },
  {
    id: 3,
    title: 'Home Studio',
    blurb: 'Interfaces, MIDI, latency and phantom power.',
    accentKey: 'F#',
    missions: [studioBuild, studioProbe, studioDial, studioFix],
  },
  {
    id: 4,
    title: 'Live Stage',
    blurb: 'DI boxes, balanced lines, wedges and ground loops.',
    accentKey: 'G',
    missions: [stageBuild, stageBalance, stageWedge, stageFix],
  },
  {
    id: 5,
    title: 'Full Band',
    blurb: 'Eight channels, one snake and a full soundcheck.',
    accentKey: 'Bb',
    missions: [bandBuild, bandCheck, bandMix, bandFix],
  },
];

export const ALL_MISSIONS: readonly Mission[] = CHAPTERS.flatMap(
  (chapter) => chapter.missions,
);

export const missionById = (id: string) =>
  ALL_MISSIONS.find((mission) => mission.id === id);
