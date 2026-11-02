import type { MissionAction } from '../rig/missionReducer';
import type { CableKind } from '../rig/rigTypes';

// A way to win each mission, by the actions a student really has.

const port = (text: string) => {
  const [gear, id] = text.split('/');
  return { gear, port: id };
};

const plug = (cable: CableKind, a: string, b: string): MissionAction[] => [
  { type: 'pickCable', cable },
  { type: 'pressPort', port: port(a) },
  { type: 'pressPort', port: port(b) },
];

const place = (...gear: string[]): MissionAction[] =>
  gear.map((id) => ({ type: 'placeGear', gear: id }));

const set = (gear: string, control: string, value: number | string) =>
  ({ type: 'setControl', gear, control, value }) as const;

export const CONFIRM: MissionAction = { type: 'confirm' };
const probe = (cable: string): MissionAction => ({ type: 'probe', cable });
const swap = (a: string, b: string): MissionAction[] => [
  { type: 'pressGear', gear: a },
  { type: 'pressGear', gear: b },
];
const unplug = (cable: string): MissionAction => ({ type: 'unplug', cable });

const bandInputs = (from = 1): MissionAction[] =>
  [
    'kit/kick',
    'kit/snare',
    'kit/hat',
    'kit/tom',
    'kit/overhead',
    'bassDi/out',
    'guitarDi/out',
    'mic/out',
  ].flatMap((source, i) =>
    i + 1 >= from ? plug('xlr', source, `box/in${i + 1}`) : [],
  );

export const SOLUTIONS: Readonly<Record<string, readonly MissionAction[]>> = {
  'voice-build': [
    ...place('mic', 'speaker'),
    ...plug('xlr', 'mic/out', 'speaker/in'),
  ],
  'voice-dial': [
    set('speaker', 'inputMode', 'mic'),
    set('speaker', 'gain', 0),
    set('speaker', 'volume', 0),
    CONFIRM,
  ],
  'voice-probe': [probe('mic-cable'), probe('main-cable'), CONFIRM],
  'voice-fix': [
    ...plug('iec', 'strip/socket1', 'mixer/power'),
    ...plug('iec', 'strip/socket2', 'speaker/power'),
    set('mixer', 'power', 'on'),
    set('speaker', 'power', 'on'),
  ],
  'guitar-build': [
    ...place('guitar', 'compressor', 'overdrive', 'delay', 'amp'),
    ...plug('ts', 'guitar/out', 'compressor/in'),
    ...plug('ts', 'compressor/out', 'overdrive/in'),
    ...plug('ts', 'overdrive/out', 'delay/in'),
    ...plug('ts', 'delay/out', 'amp/in'),
  ],
  'guitar-probe': [probe('to-delay'), CONFIRM, probe('to-amp'), CONFIRM],
  'guitar-order': [
    ...swap('delay', 'overdrive'),
    ...swap('compressor', 'overdrive'),
    ...swap('overdrive', 'delay'),
    CONFIRM,
  ],
  'guitar-fix': [
    unplug('bad-one'),
    unplug('bad-two'),
    ...plug('ts', 'guitar/out', 'overdrive/in'),
    ...plug('ts', 'overdrive/out', 'delay/in'),
    set('delay', 'engaged', 'on'),
  ],
  'studio-build': [
    ...place('mic', 'keyboard', 'iface', 'laptop', 'monitor', 'phones'),
    ...plug('xlr', 'mic/out', 'iface/in1'),
    ...plug('usb', 'keyboard/out', 'laptop/usb1'),
    ...plug('usb', 'iface/usb', 'laptop/usb2'),
    ...plug('trs', 'iface/mon', 'monitor/in'),
    ...plug('trs', 'iface/phones', 'phones/in'),
  ],
  'studio-probe': [probe('key-cable'), probe('iface-cable'), CONFIRM],
  'studio-dial': [set('laptop', 'buffer', '128'), CONFIRM],
  'studio-fix': [
    set('iface', 'phantom', 'on'),
    set('laptop', 'output', 'interface'),
  ],
  'stage-build': [
    ...place('mic', 'guitar', 'di', 'mixer', 'speaker', 'wedge'),
    ...plug('xlr', 'mic/out', 'mixer/ch1'),
    ...plug('ts', 'guitar/out', 'di/in'),
    ...plug('xlr', 'di/out', 'mixer/ch2'),
    ...plug('xlr', 'mixer/main', 'speaker/in'),
    ...plug('xlr', 'mixer/aux', 'wedge/in'),
  ],
  'stage-balance': [
    unplug('long-lead'),
    ...plug('ts', 'guitar/out', 'di/in'),
    ...plug('xlr', 'di/out', 'mixer/ch2'),
    set('mixer', 'gain2', 20),
    CONFIRM,
  ],
  'stage-wedge': [
    { type: 'walk', to: 'stage' },
    set('mixer', 'aux1', -6),
    CONFIRM,
    set('mixer', 'auxMode', 'pre'),
  ],
  'stage-fix': [set('di', 'lift', 'on')],
  'band-build': [
    ...bandInputs(),
    ...plug('multicore', 'box/multi', 'mixer/multi'),
    ...plug('xlr', 'mixer/main', 'speaker/in'),
  ],
  'band-check': [
    unplug('input-2'),
    unplug('input-3'),
    ...plug('xlr', 'kit/snare', 'box/in2'),
    ...plug('xlr', 'kit/hat', 'box/in3'),
  ],
  'band-mix': [
    set('mixer', 'fader1', -6),
    set('mixer', 'fader2', -6),
    set('mixer', 'fader3', -14),
    set('mixer', 'fader4', -8),
    set('mixer', 'fader5', -12),
    set('mixer', 'fader6', -6),
    set('mixer', 'fader7', -8),
    set('mixer', 'fader8', -2),
    set('mixer', 'master', -2),
    CONFIRM,
  ],
  'band-fix': [
    ...plug('xlr', 'mic/out', 'box/in8'),
    set('mixer', 'solo', '0'),
    set('mixer', 'gain8', 20),
  ],
};
