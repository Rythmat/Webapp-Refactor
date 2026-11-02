import type {
  CableKind,
  ControlDef,
  ControlValue,
  GearDef,
  GearInstance,
  GearKind,
  KnobDef,
  PortDef,
  Route,
  RigEnv,
  SwitchDef,
} from './rigTypes';

// ── What each piece of gear does ───────────────────────────────────────────
// Levels are in dBFS and deliberately squeezed: a real mic is about 50 dB below
// line level, which would be inaudible here, so each step is about 20 dB. The
// copy tells the real story and the ears get a version they can hear.

export const MIC_LEVEL = -36;
export const INSTRUMENT_LEVEL = -26;
/** RMS plus this is about a signal's peak. Past full scale, a stage clips. */
export const CREST_DB = 10;
const QUIET_FLOOR = -66;

const MUTED = -Infinity;

const knob = (
  id: string,
  label: string,
  min: number,
  max: number,
  initial: number,
  unit = 'dB',
  step = 1,
): KnobDef => ({ type: 'knob', id, label, min, max, step, unit, initial });

const toggle = (
  id: string,
  label: string,
  options: readonly (readonly [string, string])[],
  initial: string,
): SwitchDef => ({
  type: 'switch',
  id,
  label,
  options: options.map(([value, text]) => ({ value, label: text })),
  initial,
});

const onOff = (id: string, label: string, initial: 'on' | 'off') =>
  toggle(
    id,
    label,
    [
      ['off', 'Off'],
      ['on', 'On'],
    ],
    initial,
  );

const port = (
  id: string,
  label: string,
  dir: PortDef['dir'],
  accepts: readonly CableKind[],
  domain: PortDef['domain'],
  lanes?: number,
): PortDef => ({ id, label, dir, accepts, domain, lanes });

const POWER_PORT = port('power', 'Mains socket', 'in', ['iec'], 'power');
const COMBO: readonly CableKind[] = ['xlr', 'ts', 'trs'];

const num = (gear: GearInstance, id: string, fallback = 0): number => {
  const value = gear.controls[id];
  return typeof value === 'number' ? value : fallback;
};
const str = (gear: GearInstance, id: string, fallback = ''): string => {
  const value = gear.controls[id];
  return typeof value === 'string' ? value : fallback;
};
const floor = (env: RigEnv) => env.noiseFloorDb ?? QUIET_FLOOR;
/** A level knob all the way down reads Off, so it is off. */
const levelKnob = (gear: GearInstance, id: string): number => {
  const value = num(gear, id);
  return value <= -40 ? MUTED : value;
};

// ── The latency a buffer adds ──────────────────────────────────────────────

const SAMPLE_RATE = 44100;
export const BUFFER_SIZES = ['32', '64', '128', '256', '512', '1024', '2048'];
/** Too small a buffer, and this laptop can't keep up: the sound crackles. */
export const SMALLEST_SAFE_BUFFER = 128;
/** Round trip, in and out, plus the converters. */
export const latencySeconds = (buffer: number) =>
  (buffer * 2) / SAMPLE_RATE + 0.003;

// ── Each kind ──────────────────────────────────────────────────────────────

const speakerDef = (
  kind: 'speaker' | 'wedge' | 'monitor',
  name: string,
  blurb: string,
  mix: { foh: number; stage: number },
): GearDef => ({
  kind,
  name,
  blurb,
  hasPower: true,
  ports: [port('in', 'Input', 'in', COMBO, 'line'), POWER_PORT],
  controls: [
    toggle(
      'inputMode',
      'Input',
      [
        ['line', 'Line'],
        ['mic', 'Mic'],
      ],
      'line',
    ),
    knob('gain', 'Gain', -20, 20, 0),
    knob('volume', 'Volume', -20, 20, 0),
    onOff('power', 'Power', 'off'),
  ],
  routes: (gear, env) => [
    {
      id: 'gain',
      from: 'in',
      to: 'pre',
      gainDb: num(gear, 'gain') + (str(gear, 'inputMode') === 'mic' ? 20 : 0),
      clips: true,
      noiseDb: floor(env),
    },
    {
      id: 'volume',
      from: 'pre',
      to: 'cone',
      gainDb: num(gear, 'volume'),
    },
  ],
  sinks: () => [{ id: 'cone', at: 'cone', ...mix }],
});

const pedalDef = (
  kind: 'compressor' | 'overdrive' | 'delay',
  name: string,
  blurb: string,
  fxParams: (gear: GearInstance) => Readonly<Record<string, number>>,
  knobs: readonly ControlDef[],
): GearDef => ({
  kind,
  name,
  blurb,
  ports: [
    port('in', 'Input', 'in', ['ts'], 'instrument'),
    port('out', 'Output', 'out', ['ts'], 'instrument'),
  ],
  controls: [onOff('engaged', 'Footswitch', 'on'), ...knobs],
  routes: (gear) => [
    {
      id: kind,
      from: 'in',
      to: 'out',
      gainDb: 0,
      fx: kind,
      fxBypassed: str(gear, 'engaged', 'on') !== 'on',
      fxParams: fxParams(gear),
    },
  ],
});

const channelCount = (gear: GearInstance) => gear.channels ?? 4;

/** A mixer's knobs for its size. Faders and gains are the job of most missions. */
function mixerControls(channels: number): ControlDef[] {
  const controls: ControlDef[] = [];
  for (let ch = 1; ch <= channels; ch++) {
    controls.push(
      knob(`gain${ch}`, `Channel ${ch} gain`, 0, 40, 20),
      knob(`fader${ch}`, `Channel ${ch} fader`, -40, 6, 0),
      knob(`aux${ch}`, `Channel ${ch} aux`, -40, 6, -40),
    );
  }
  controls.push(
    knob('master', 'Main fader', -40, 6, 0),
    knob('auxMaster', 'Aux master', -40, 6, 0),
    toggle(
      'auxMode',
      'Aux send',
      [
        ['pre', 'Pre-fader'],
        ['post', 'Post-fader'],
      ],
      'post',
    ),
    toggle(
      'solo',
      'Solo',
      [
        ['0', 'Off'],
        ...Array.from({ length: channels }, (_, i): [string, string] => [
          String(i + 1),
          `Ch ${i + 1}`,
        ]),
      ],
      '0',
    ),
    onOff('power', 'Power', 'off'),
  );
  return controls;
}

function mixerRoutes(gear: GearInstance, env: RigEnv): Route[] {
  const routes: Route[] = [];
  const solo = Number(str(gear, 'solo', '0'));
  const auxMode = str(gear, 'auxMode', 'post');
  for (let ch = 1; ch <= channelCount(gear); ch++) {
    const fader = levelKnob(gear, `fader${ch}`);
    const aux = levelKnob(gear, `aux${ch}`);
    routes.push(
      { id: `multi${ch}`, from: `multi#${ch}`, to: `ch${ch}`, gainDb: 0 },
      {
        id: `gain${ch}`,
        from: `ch${ch}`,
        to: `pre${ch}`,
        gainDb: num(gear, `gain${ch}`),
        clips: true,
        noiseDb: floor(env),
      },
      { id: `fader${ch}`, from: `pre${ch}`, to: `post${ch}`, gainDb: fader },
      {
        id: `bus${ch}`,
        from: `post${ch}`,
        to: 'mainBus',
        gainDb: solo === 0 || solo === ch ? 0 : MUTED,
      },
      {
        id: `auxPre${ch}`,
        from: `pre${ch}`,
        to: 'auxBus',
        gainDb: auxMode === 'pre' ? aux : MUTED,
      },
      {
        id: `auxPost${ch}`,
        from: `post${ch}`,
        to: 'auxBus',
        gainDb: auxMode === 'post' ? aux : MUTED,
      },
    );
  }
  routes.push(
    {
      id: 'master',
      from: 'mainBus',
      to: 'main',
      gainDb: levelKnob(gear, 'master'),
      clips: true,
    },
    {
      id: 'auxMaster',
      from: 'auxBus',
      to: 'aux',
      gainDb: levelKnob(gear, 'auxMaster'),
    },
  );
  return routes;
}

export const STAGE_BOX_INPUTS = 8;

const DEFS: Readonly<Record<GearKind, (gear?: GearInstance) => GearDef>> = {
  dynamicMic: () => ({
    kind: 'dynamicMic',
    name: 'Dynamic Mic',
    blurb: 'Turns a voice into a tiny electrical signal. Needs no power.',
    ports: [port('out', 'XLR output', 'out', ['xlr'], 'mic')],
    controls: [],
    routes: () => [],
    sources: () => [{ at: 'out', source: 'vox', levelDb: MIC_LEVEL }],
  }),
  condenserMic: () => ({
    kind: 'condenserMic',
    name: 'Condenser Mic',
    blurb:
      'A sensitive studio mic. Its circuit needs 48V of phantom power, sent up its own cable.',
    ports: [port('out', 'XLR output', 'out', ['xlr'], 'mic')],
    controls: [],
    routes: () => [],
    sources: () => [
      {
        at: 'out',
        source: 'vox',
        levelDb: MIC_LEVEL,
        needsPhantom: { port: 'out' },
      },
    ],
  }),
  guitar: () => ({
    kind: 'guitar',
    name: 'Electric Guitar',
    blurb: 'Its pickups make a small, unbalanced instrument-level signal.',
    ports: [port('out', 'Output jack', 'out', ['ts'], 'instrument')],
    controls: [],
    routes: () => [],
    sources: () => [{ at: 'out', source: 'guitar', levelDb: INSTRUMENT_LEVEL }],
  }),
  bass: () => ({
    kind: 'bass',
    name: 'Electric Bass',
    blurb: 'Instrument level, like a guitar, an octave lower.',
    ports: [port('out', 'Output jack', 'out', ['ts'], 'instrument')],
    controls: [],
    routes: () => [],
    sources: () => [{ at: 'out', source: 'bass', levelDb: INSTRUMENT_LEVEL }],
  }),
  drumKit: () => ({
    kind: 'drumKit',
    name: 'Drum Kit',
    blurb: 'Five mics, one per voice of the kit, each on its own cable.',
    ports: [
      port('kick', 'Kick mic', 'out', ['xlr'], 'mic'),
      port('snare', 'Snare mic', 'out', ['xlr'], 'mic'),
      port('hat', 'Hi-hat mic', 'out', ['xlr'], 'mic'),
      port('tom', 'Tom mic', 'out', ['xlr'], 'mic'),
      port('overhead', 'Overhead mic', 'out', ['xlr'], 'mic'),
    ],
    controls: [],
    routes: () => [],
    sources: () =>
      (['kick', 'snare', 'hat', 'tom', 'overhead'] as const).map((source) => ({
        at: source,
        source,
        levelDb: MIC_LEVEL,
      })),
  }),
  midiKeyboard: () => ({
    kind: 'midiKeyboard',
    name: 'MIDI Keyboard',
    blurb:
      'Makes no sound of its own. It sends notes, as data, for something else to play.',
    ports: [
      port('out', 'USB port', 'out', ['usb'], 'midi'),
      port('midiOut', 'MIDI out', 'out', ['midi'], 'midi'),
    ],
    controls: [],
    routes: () => [],
    sources: () => [
      { at: 'out', source: 'notes', levelDb: 0 },
      { at: 'midiOut', source: 'notes', levelDb: 0 },
    ],
  }),
  speaker: () =>
    speakerDef(
      'speaker',
      'Powered Speaker',
      'An amplifier and speaker in one box, so a line-level signal is all it needs.',
      { foh: 0, stage: -14 },
    ),
  wedge: () =>
    speakerDef(
      'wedge',
      'Stage Wedge',
      'A speaker on the floor, angled up at a performer, so they can hear themselves.',
      { foh: -14, stage: 0 },
    ),
  monitor: () =>
    speakerDef(
      'monitor',
      'Studio Monitor',
      'A speaker built to tell the truth, for mixing rather than for volume.',
      { foh: 0, stage: 0 },
    ),
  headphones: () => ({
    kind: 'headphones',
    name: 'Headphones',
    blurb: 'Lets you listen without the sound reaching the mic.',
    ports: [port('in', 'Headphone plug', 'in', ['trs'], 'line')],
    controls: [knob('volume', 'Volume', -20, 20, 0)],
    routes: (gear) => [
      { id: 'volume', from: 'in', to: 'cups', gainDb: num(gear, 'volume') },
    ],
    sinks: () => [{ id: 'cups', at: 'cups', foh: 0, stage: 0 }],
  }),
  amp: () => ({
    kind: 'amp',
    name: 'Combo Amp',
    blurb:
      'Preamp, power amp and speaker in one cabinet. Its input expects instrument level.',
    ports: [port('in', 'Input jack', 'in', ['ts'], 'instrument')],
    controls: [
      knob('gain', 'Gain', 0, 30, 8),
      knob('volume', 'Volume', -20, 6, 0),
    ],
    routes: (gear) => [
      {
        id: 'drive',
        from: 'in',
        to: 'pre',
        gainDb: 0,
        fx: 'ampDrive',
        fxParams: { gainDb: num(gear, 'gain') },
      },
      { id: 'cabinet', from: 'pre', to: 'post', gainDb: 0, fx: 'cabinet' },
      { id: 'volume', from: 'post', to: 'cone', gainDb: num(gear, 'volume') },
    ],
    sinks: () => [{ id: 'cone', at: 'cone', foh: 0, stage: 0 }],
  }),
  compressor: () =>
    pedalDef(
      'compressor',
      'Compressor',
      'Evens out the loud and the quiet, so it goes first: it works on your touch, before any dirt.',
      () => ({ threshold: 0.45, ratio: 0.25, attack: 0.2, release: 0.25 }),
      [],
    ),
  overdrive: () =>
    pedalDef(
      'overdrive',
      'Overdrive',
      'Pushes the signal into soft clipping, for grit and sustain.',
      (gear) => ({ drive: num(gear, 'drive', 0.5) }),
      [knob('drive', 'Drive', 0.1, 1, 0.5, '', 0.05)],
    ),
  delay: () =>
    pedalDef(
      'delay',
      'Delay',
      'Plays the signal back later, as echoes. After the dirt, each echo stays clean.',
      (gear) => ({
        time: 0.3125,
        feedback: num(gear, 'repeats', 0.45),
        mix: 0.38,
      }),
      [knob('repeats', 'Repeats', 0, 0.8, 0.45, '', 0.05)],
    ),
  interface: () => ({
    kind: 'interface',
    name: 'Audio Interface',
    blurb:
      'The door between the room and the computer: preamps and converters, in and out.',
    ports: [
      port('in1', 'Input 1', 'in', COMBO, 'mic'),
      port('in2', 'Input 2', 'in', COMBO, 'mic'),
      port('usb', 'USB port', 'duplex', ['usb'], 'digital'),
      port('mon', 'Monitor output', 'out', ['trs', 'xlr'], 'line'),
      port('phones', 'Headphone output', 'out', ['trs'], 'line'),
    ],
    controls: [
      knob('gain1', 'Input 1 gain', 0, 40, 20),
      knob('gain2', 'Input 2 gain', 0, 40, 20),
      onOff('phantom', '48V', 'off'),
      knob('monitor', 'Monitor', -40, 6, 0),
      knob('phones', 'Headphones', -40, 6, 0),
    ],
    phantom: (gear) => str(gear, 'phantom') === 'on',
    routes: (gear, env) => [
      {
        id: 'gain1',
        from: 'in1',
        to: 'usb:out',
        gainDb: num(gear, 'gain1'),
        clips: true,
        noiseDb: floor(env),
      },
      {
        id: 'gain2',
        from: 'in2',
        to: 'usb:out',
        gainDb: num(gear, 'gain2'),
        clips: true,
        noiseDb: floor(env),
      },
      {
        id: 'monitor',
        from: 'usb:in',
        to: 'mon',
        gainDb: levelKnob(gear, 'monitor'),
      },
      {
        id: 'phones',
        from: 'usb:in',
        to: 'phones',
        gainDb: levelKnob(gear, 'phones'),
      },
    ],
  }),
  laptop: () => ({
    kind: 'laptop',
    name: 'Laptop',
    blurb:
      'Runs the recording software, and the instrument your MIDI notes play.',
    ports: [
      port('usb1', 'USB port 1', 'duplex', ['usb'], 'digital'),
      port('usb2', 'USB port 2', 'duplex', ['usb'], 'digital'),
    ],
    controls: [
      toggle(
        'output',
        'Sound output',
        [
          ['interface', 'Audio interface'],
          ['laptop', 'Laptop speakers'],
        ],
        'interface',
      ),
      toggle(
        'buffer',
        'Buffer size',
        BUFFER_SIZES.map((size): [string, string] => [size, size]),
        '256',
      ),
    ],
    routes: (gear) => {
      const output = str(gear, 'output', 'interface');
      const buffer = Number(str(gear, 'buffer', '256'));
      return [
        { id: 'in1', from: 'usb1:in', to: 'daw', gainDb: 0 },
        { id: 'in2', from: 'usb2:in', to: 'daw', gainDb: 0 },
        {
          id: 'notes1',
          from: 'usb1:in',
          to: 'notes',
          gainDb: 0,
          midi: true,
        },
        {
          id: 'notes2',
          from: 'usb2:in',
          to: 'notes',
          gainDb: 0,
          midi: true,
        },
        { id: 'synth', from: 'instrument', to: 'daw', gainDb: 0 },
        {
          id: 'latency',
          from: 'daw',
          to: 'dawOut',
          gainDb: 0,
          fx: 'latency',
          fxParams: {
            seconds: latencySeconds(buffer),
            crackle: buffer < SMALLEST_SAFE_BUFFER ? 1 : 0,
          },
        },
        {
          id: 'out1',
          from: 'dawOut',
          to: 'usb1:out',
          gainDb: output === 'interface' ? 0 : MUTED,
        },
        {
          id: 'out2',
          from: 'dawOut',
          to: 'usb2:out',
          gainDb: output === 'interface' ? 0 : MUTED,
        },
        {
          id: 'tiny',
          from: 'dawOut',
          to: 'tinySpeakers',
          gainDb: output === 'laptop' ? 0 : MUTED,
          fx: 'tinySpeaker',
        },
      ];
    },
    sources: () => [
      {
        at: 'instrument',
        source: 'keys',
        levelDb: -16,
        needsNotesAt: 'notes',
      },
    ],
    sinks: () => [{ id: 'tinySpeakers', at: 'tinySpeakers', foh: 0, stage: 0 }],
  }),
  mixer: (gear) => {
    const channels = gear?.channels ?? 4;
    return {
      kind: 'mixer',
      name: 'Mixer',
      blurb:
        'Where everything meets. Each channel sets a level with its gain, then blends with its fader.',
      hasPower: true,
      ports: [
        ...Array.from({ length: channels }, (_, i) =>
          port(`ch${i + 1}`, `Channel ${i + 1} input`, 'in', COMBO, 'mic'),
        ),
        port('main', 'Main output', 'out', ['xlr', 'trs'], 'line'),
        port('aux', 'Aux output', 'out', ['xlr', 'trs'], 'line'),
        ...(channels > 4
          ? [
              port(
                'multi',
                'Multicore input',
                'in',
                ['multicore'],
                'mic',
                STAGE_BOX_INPUTS,
              ),
            ]
          : []),
        POWER_PORT,
      ],
      controls: mixerControls(channels),
      routes: mixerRoutes,
    };
  },
  stageBox: () => ({
    kind: 'stageBox',
    name: 'Stage Box',
    blurb:
      'Gathers every input on the stage into one thick multicore cable to the mixer.',
    ports: [
      ...Array.from({ length: STAGE_BOX_INPUTS }, (_, i) =>
        port(`in${i + 1}`, `Input ${i + 1}`, 'in', COMBO, 'mic'),
      ),
      port('multi', 'Multicore output', 'out', ['multicore'], 'mic', 8),
    ],
    controls: [],
    routes: () =>
      Array.from({ length: STAGE_BOX_INPUTS }, (_, i) => ({
        id: `lane${i + 1}`,
        from: `in${i + 1}`,
        to: `multi#${i + 1}`,
        gainDb: 0,
      })),
  }),
  di: () => ({
    kind: 'di',
    name: 'DI Box',
    blurb:
      'Turns an unbalanced instrument signal into a balanced mic-level one, ready for a long cable.',
    ports: [
      port('in', 'Instrument input', 'in', ['ts'], 'instrument'),
      port('out', 'XLR output', 'out', ['xlr'], 'mic'),
    ],
    controls: [onOff('lift', 'Ground lift', 'off')],
    routes: (gear, env) => [
      {
        id: 'balance',
        from: 'in',
        to: 'out',
        gainDb: -10,
        humDb: env.groundLoop && str(gear, 'lift') !== 'on' ? -42 : undefined,
      },
    ],
  }),
  powerStrip: () => ({
    kind: 'powerStrip',
    name: 'Power Strip',
    blurb: 'Wall power, for everything with a mains socket.',
    ports: Array.from({ length: 4 }, (_, i) =>
      port(`socket${i + 1}`, `Socket ${i + 1}`, 'out', ['iec'], 'power'),
    ),
    controls: [],
    routes: () => [],
  }),
};

const cache = new Map<string, GearDef>();

export function gearDef(
  gear: Pick<GearInstance, 'kind' | 'channels'>,
): GearDef {
  const key = `${gear.kind}:${gear.channels ?? ''}`;
  let def = cache.get(key);
  if (!def) {
    def = DEFS[gear.kind](gear as GearInstance);
    cache.set(key, def);
  }
  return def;
}

export const gearName = (gear: GearInstance) => gear.name ?? gearDef(gear).name;

export function initialControls(
  gear: Pick<GearInstance, 'kind' | 'channels'>,
  overrides: Readonly<Record<string, ControlValue>> = {},
): Record<string, ControlValue> {
  const controls: Record<string, ControlValue> = {};
  for (const control of gearDef(gear).controls) {
    controls[control.id] = control.initial;
  }
  return { ...controls, ...overrides };
}

export function portOf(
  gear: Pick<GearInstance, 'kind' | 'channels'>,
  id: string,
): PortDef | undefined {
  return gearDef(gear).ports.find((p) => p.id === id);
}

export const CABLE_NAME: Readonly<Record<CableKind, string>> = {
  xlr: 'XLR',
  ts: 'Instrument (TS)',
  trs: 'Balanced (TRS)',
  usb: 'USB',
  midi: 'MIDI',
  speakon: 'Speaker (speakON)',
  iec: 'Mains (IEC)',
  multicore: 'Multicore',
};

/** Its name where there's little room: a phone's rack. */
export const CABLE_SHORT_NAME: Readonly<Record<CableKind, string>> = {
  xlr: 'XLR',
  ts: 'TS',
  trs: 'TRS',
  usb: 'USB',
  midi: 'MIDI',
  speakon: 'speakON',
  iec: 'IEC',
  multicore: 'Multi',
};

/** What each cable is for, on the rack. */
export const CABLE_BLURB: Readonly<Record<CableKind, string>> = {
  xlr: 'Three pins, male and female ends. Balanced, so it can run long without picking up hum.',
  ts: 'One signal, one shield. Fine for short runs from an instrument, but it picks up hum over distance.',
  trs: 'A jack with an extra ring: balanced, for line-level gear and headphones.',
  usb: 'Digital. Carries many channels of audio, or notes, between devices.',
  midi: 'Five pins that carry notes as data. There is no sound in it.',
  speakon:
    'Heavy, locking, for the strong signal from a power amp to a passive speaker.',
  iec: 'The mains cord. Power only, no signal.',
  multicore:
    'Many balanced lines in one cable, so a stage needs one run to the mixer.',
};
