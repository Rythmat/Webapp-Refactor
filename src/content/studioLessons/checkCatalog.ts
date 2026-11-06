/**
 * The ready-made checks a lesson step may use, as the console's lesson editor
 * lists them: each one's name, what it says in the editor, and its
 * parameters. Pure data, so the console takes it without the Studio; the
 * Studio's own checkRegistry.ts builds each into a check over its store, and
 * checkRegistry.test.ts holds the two lists to the same names.
 *
 * "Since the step began" means against the Studio as it was when the step
 * became the student's turn (a step's `armed` snapshot), so a check passes on
 * something the student did, not on how the song happened to start.
 */

export type CheckParamSpec =
  | {
      key: string;
      label: string;
      type: 'choice';
      options: readonly string[];
      default: string;
    }
  | {
      key: string;
      label: string;
      type: 'text';
      /** Suggestions the editor offers; any text is allowed. */
      suggestions?: readonly string[];
      default: string;
    }
  | {
      key: string;
      label: string;
      type: 'number';
      min?: number;
      max?: number;
      step?: number;
      default: number;
    }
  | { key: string; label: string; type: 'boolean'; default: boolean };

export interface CheckCatalogEntry {
  name: string;
  /** The editor's name for it, sentence case. */
  label: string;
  /** Where the editor groups it. */
  group: 'Studio' | 'Prism' | 'Tracks' | 'Effects' | 'Mix' | 'Transport';
  /** One line: when the step passes. */
  passes: string;
  params: readonly CheckParamSpec[];
}

/** The Studio store's fields a "value" check may read, and their kinds. */
export const CHECK_FIELDS = {
  currentView: 'text',
  channelStripTab: 'text',
  genre: 'text',
  mode: 'text',
  rhythmName: 'text',
  rootNote: 'number',
  bpm: 'number',
  swing: 'number',
  masterVolume: 'number',
  countInBars: 'number',
  isPlaying: 'boolean',
  isRecording: 'boolean',
  loopEnabled: 'boolean',
  metronomeEnabled: 'boolean',
} as const;

export type CheckField = keyof typeof CHECK_FIELDS;

export const CHECK_OPS = ['=', '≠', '>', '≥', '<', '≤'] as const;
export type CheckOp = (typeof CHECK_OPS)[number];

const INSTRUMENTS = [
  'oracle-synth',
  'soundfont',
  'drum-machine',
  'audio-input',
];
const EFFECTS = [
  'reverb',
  'delay',
  'eq',
  'compressor',
  'gate',
  'presence',
  'de-esser',
  'saturator',
  'multiband',
  'ducker',
];
const RETURNS = ['A', 'B'];
const SWITCHES = ['mute', 'solo', 'recordArmed', 'monitoring'];
const DONE_MOMENTS = [
  'save',
  'exportMidi',
  'exportMusicXml',
  'exportAudio',
  'printScore',
  'printLeadSheet',
];

export const CHECK_CATALOG = [
  // ── Studio ──────────────────────────────────────────────────────────────
  {
    name: 'store.value',
    label: 'A Studio setting has a value',
    group: 'Studio',
    passes:
      'The setting compares to the value (and, if asked, has changed since the step began).',
    params: [
      {
        key: 'field',
        label: 'Setting',
        type: 'choice',
        options: Object.keys(CHECK_FIELDS),
        default: 'bpm',
      },
      {
        key: 'op',
        label: 'Is',
        type: 'choice',
        options: CHECK_OPS,
        default: '=',
      },
      {
        key: 'value',
        label: 'Value',
        type: 'text',
        suggestions: [
          'arrange',
          'studio',
          'prism',
          'piano-roll',
          'Jazz',
          'dorian',
          'true',
        ],
        default: '',
      },
      {
        key: 'changed',
        label: 'And changed since the step began',
        type: 'boolean',
        default: false,
      },
    ],
  },
  {
    name: 'store.changed',
    label: 'A Studio setting changed',
    group: 'Studio',
    passes: 'The setting is different from when the step began.',
    params: [
      {
        key: 'field',
        label: 'Setting',
        type: 'choice',
        options: Object.keys(CHECK_FIELDS),
        default: 'masterVolume',
      },
    ],
  },
  {
    name: 'done.moment',
    label: 'The student saved, exported or printed',
    group: 'Studio',
    passes: 'It happened since the step began.',
    params: [
      {
        key: 'moment',
        label: 'What',
        type: 'choice',
        options: DONE_MOMENTS,
        default: 'save',
      },
    ],
  },
  {
    name: 'automation.open',
    label: 'An automation lane is open',
    group: 'Studio',
    passes: 'Some track shows its automation lane.',
    params: [],
  },
  {
    name: 'automation.points',
    label: 'An automation lane has points',
    group: 'Studio',
    passes: 'The open lane’s parameter has at least this many points.',
    params: [
      {
        key: 'param',
        label: 'Parameter',
        type: 'text',
        suggestions: ['volume', 'pan', 'send.A', 'send.B'],
        default: 'volume',
      },
      { key: 'atLeast', label: 'At least', type: 'number', min: 1, default: 2 },
    ],
  },

  // ── Prism ───────────────────────────────────────────────────────────────
  {
    name: 'prism.trackSelected',
    label: 'A melodic track is selected',
    group: 'Prism',
    passes:
      'The selected track can take Prism’s chords (a melodic MIDI track).',
    params: [],
  },
  {
    name: 'prism.chords',
    label: 'The progression has chords',
    group: 'Prism',
    passes: 'Prism’s progression has at least this many chords.',
    params: [
      { key: 'atLeast', label: 'At least', type: 'number', min: 1, default: 3 },
    ],
  },
  {
    name: 'prism.seventhAdded',
    label: 'A 7th chord was added',
    group: 'Prism',
    passes: 'The last chord added since the step began is a 7th.',
    params: [],
  },
  {
    name: 'prism.created',
    label: 'Create ran',
    group: 'Prism',
    passes: 'Prism wrote its clip since the step began.',
    params: [],
  },

  // ── Tracks ──────────────────────────────────────────────────────────────
  {
    name: 'track.selectedInstrument',
    label: 'The selected track plays an instrument',
    group: 'Tracks',
    passes: 'The selected track is this kind.',
    params: [
      {
        key: 'instrument',
        label: 'Instrument',
        type: 'choice',
        options: INSTRUMENTS,
        default: 'oracle-synth',
      },
    ],
  },
  {
    name: 'track.anyInstrument',
    label: 'Some track plays an instrument',
    group: 'Tracks',
    passes: 'At least one track is this kind.',
    params: [
      {
        key: 'instrument',
        label: 'Instrument',
        type: 'choice',
        options: INSTRUMENTS,
        default: 'drum-machine',
      },
    ],
  },
  {
    name: 'track.added',
    label: 'A track was added',
    group: 'Tracks',
    passes: 'There are more tracks than when the step began.',
    params: [],
  },
  {
    name: 'track.selectedAnother',
    label: 'Another track was selected',
    group: 'Tracks',
    passes:
      'A different track is selected than when the step began (a one-track song passes).',
    params: [],
  },
  {
    name: 'track.instrumentChanged',
    label: 'A track’s sound changed',
    group: 'Tracks',
    passes: 'Some track plays another sound than when the step began.',
    params: [],
  },
  {
    name: 'track.drumKit',
    label: 'The selected drums use a kit',
    group: 'Tracks',
    passes: 'The selected drum track plays this kit.',
    params: [
      {
        key: 'kit',
        label: 'Kit',
        type: 'text',
        suggestions: ['natural', '808', 'house'],
        default: '808',
      },
    ],
  },
  {
    name: 'track.notesAdded',
    label: 'Notes were added to the selected track',
    group: 'Tracks',
    passes:
      'Its first clip has at least this many more notes than when the step began.',
    params: [
      { key: 'atLeast', label: 'At least', type: 'number', min: 1, default: 4 },
    ],
  },
  {
    name: 'track.newClip',
    label: 'The selected track got a new clip',
    group: 'Tracks',
    passes: 'A clip appeared on the selected track since the step began.',
    params: [],
  },
  {
    name: 'track.switchedOn',
    label: 'A track switch was turned on',
    group: 'Tracks',
    passes:
      'Some track’s mute, solo, arm or monitor was turned on since the step began.',
    params: [
      {
        key: 'switch',
        label: 'Switch',
        type: 'choice',
        options: SWITCHES,
        default: 'mute',
      },
    ],
  },
  {
    name: 'track.switchedOff',
    label: 'A track switch was turned off',
    group: 'Tracks',
    passes:
      'Some track’s switch went off since the step began (or none was on).',
    params: [
      {
        key: 'switch',
        label: 'Switch',
        type: 'choice',
        options: SWITCHES,
        default: 'mute',
      },
    ],
  },

  // ── Effects ─────────────────────────────────────────────────────────────
  {
    name: 'effect.added',
    label: 'The selected track has an effect',
    group: 'Effects',
    passes: 'The effect is in the selected track’s rack.',
    params: [
      {
        key: 'effect',
        label: 'Effect',
        type: 'choice',
        options: EFFECTS,
        default: 'reverb',
      },
    ],
  },
  {
    name: 'effect.changed',
    label: 'An effect’s settings changed',
    group: 'Effects',
    passes:
      'Any knob of the effect on the selected track moved since the step began.',
    params: [
      {
        key: 'effect',
        label: 'Effect',
        type: 'choice',
        options: EFFECTS,
        default: 'reverb',
      },
    ],
  },
  {
    name: 'effect.paramAbove',
    label: 'An effect knob was raised past a value',
    group: 'Effects',
    passes: 'The knob is above the value and higher than when the step began.',
    params: [
      {
        key: 'effect',
        label: 'Effect',
        type: 'choice',
        options: EFFECTS,
        default: 'multiband',
      },
      {
        key: 'param',
        label: 'Knob',
        type: 'text',
        suggestions: ['depth', 'amount', 'wet', 'mix', 'feedback'],
        default: 'depth',
      },
      {
        key: 'value',
        label: 'Above',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.4,
      },
    ],
  },

  // ── Mix ─────────────────────────────────────────────────────────────────
  {
    name: 'mix.volumeChanged',
    label: 'A track fader moved',
    group: 'Mix',
    passes: 'Some track’s volume changed since the step began.',
    params: [],
  },
  {
    name: 'mix.sendAbove',
    label: 'A track sends to a return',
    group: 'Mix',
    passes:
      'Some track’s send is above the value and changed since the step began.',
    params: [
      {
        key: 'return',
        label: 'Return',
        type: 'choice',
        options: RETURNS,
        default: 'A',
      },
      {
        key: 'value',
        label: 'Above',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.25,
      },
    ],
  },
  {
    name: 'mix.returnChanged',
    label: 'A return’s effect changed',
    group: 'Mix',
    passes: 'The return’s effect settings changed since the step began.',
    params: [
      {
        key: 'return',
        label: 'Return',
        type: 'choice',
        options: RETURNS,
        default: 'A',
      },
    ],
  },
  {
    name: 'mix.masterFxAdded',
    label: 'An effect was added on Master',
    group: 'Mix',
    passes: 'Master’s chain has more effects than when the step began.',
    params: [],
  },

  // ── Transport ───────────────────────────────────────────────────────────
  {
    name: 'transport.playedThenStopped',
    label: 'The song played, then stopped',
    group: 'Transport',
    passes: 'Since the step began the song played and is stopped again.',
    params: [],
  },

  // ── Synth ───────────────────────────────────────────────────────────────
  {
    name: 'synth.preset',
    label: 'The synth plays a preset',
    group: 'Tracks',
    passes: 'The selected Oracle Synth has this preset loaded.',
    params: [
      {
        key: 'name',
        label: 'Preset',
        type: 'text',
        suggestions: ['WOBBLE', 'BASS'],
        default: 'WOBBLE',
      },
    ],
  },
] as const satisfies readonly CheckCatalogEntry[];

export type CheckName = (typeof CHECK_CATALOG)[number]['name'];

/** Every check's name, for the schema. */
export const CHECK_NAMES = CHECK_CATALOG.map((c) => c.name) as [
  CheckName,
  ...CheckName[],
];

export function getCheckEntry(name: string): CheckCatalogEntry | undefined {
  return (CHECK_CATALOG as readonly CheckCatalogEntry[]).find(
    (c) => c.name === name,
  );
}

/** A check's parameters with every default filled in. */
export function defaultCheckParams(
  name: string,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    (getCheckEntry(name)?.params ?? []).map((p) => [p.key, p.default]),
  );
}
