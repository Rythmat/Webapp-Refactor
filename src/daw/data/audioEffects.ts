import { BUNDLED_MODELS } from '@/daw/audio/nam/NamModelStore';

// ── The audio-only effects (the Add audio effect picker) ───────────────────
//
// What an audio track's chain can take beyond the mixer's effects: an amp
// (one of the bundled NAM models, guitar or bass) and pitch correction.
// Both run in the track's pedal chain (GuitarPedalChain), so they shape the
// live input and every recorded or imported clip on playback and bounce.
// Each has a line on how it sounds, in plain words; the amps keep their gem
// names (no brand names), and the lines describe the sound, not the model.

export type AudioEffectGroup = 'voice' | 'guitar-amps' | 'bass-amps';

export interface AudioEffectItem {
  /** The picker's id: 'pitch-correction', or the amp's model id. */
  id: string;
  kind: 'amp' | 'pitch-correction';
  group: AudioEffectGroup;
  name: string;
  /** How it sounds, in one line. */
  about: string;
  /** An amp's tone: clean, crunch or high gain. */
  tone?: 'clean' | 'crunch' | 'hi_gain';
}

export const AUDIO_EFFECT_GROUPS: readonly {
  id: AudioEffectGroup;
  label: string;
  purpose: string;
}[] = [
  {
    id: 'voice',
    label: 'Pitch',
    purpose: 'Puts a voice or a lead line in tune with the song',
  },
  {
    id: 'guitar-amps',
    label: 'Guitar amps',
    purpose: 'The sound of a guitar played through an amp, clean to heavy',
  },
  {
    id: 'bass-amps',
    label: 'Bass amps',
    purpose: 'Weight and growl for a bass, from round to roaring',
  },
];

export const TONE_LABEL: Record<
  NonNullable<AudioEffectItem['tone']>,
  string
> = {
  clean: 'Clean',
  crunch: 'Crunch',
  hi_gain: 'High gain',
};

/** How each amp sounds, by model id. */
const AMP_ABOUT: Record<string, string> = {
  // Guitar
  'nam-clean-twin': 'Big, glassy clean with lots of headroom',
  'nam-marshall-jcm-clean': 'Warm British clean that breaks up as you dig in',
  'nam-magnatone-59': 'Vintage clean with a soft, shimmering warmth',
  'nam-roland-jc120': 'Crystal-clear clean, lovely with chorus',
  'nam-vox-ac30': 'Chimey, bright clean with a jangly top end',
  'nam-crunch-plexi': 'Classic rock crunch: loud, open and bold',
  'nam-vox-ac15': 'Small-amp crunch, bright and touch-sensitive',
  'nam-marshall-jcm800': 'Punchy rock distortion for riffs and power chords',
  'nam-orange-rockerverb': 'Thick, mid-heavy distortion with a gritty edge',
  'nam-high-gain': 'Thick, saturated distortion for heavy parts',
  'nam-mesa-mark-iv': 'Tight, focused lead tone with singing sustain',
  'nam-engl-savage': 'Aggressive modern metal gain with tight lows',
  'nam-friedman-be': 'Hot-rodded British gain, rich and clear',
  'nam-soldano-slo': 'Smooth, creamy high gain for solos',
  // Bass
  'nam-ampeg-svt': 'The classic rock bass: big, warm and round',
  'nam-gk-800rb': 'Clean, punchy bass with a bright, clear attack',
  'nam-mesa-subway': 'Modern clean bass, full and even',
  'nam-ampeg-v4': 'Vintage tube bass with a gentle growl',
  'nam-markbass-lm3': 'Punchy, hi-fi bass that cuts through a mix',
  'nam-fender-bassman': 'Warm vintage bass with a soft, round drive',
  'nam-aguilar-th500': 'Deep, warm bass with a little grit',
  'nam-darkglass-b7k': 'Aggressive, growling modern bass distortion',
  'nam-svt-cranked': 'A big bass amp turned up until it roars',
};

const TONE_ORDER = ['clean', 'crunch', 'hi_gain'];

const amps = (forInstrument: 'guitar' | 'bass'): AudioEffectItem[] =>
  BUNDLED_MODELS.filter((m) => m.forInstrument === forInstrument)
    .map((m) => ({
      id: m.id,
      kind: 'amp' as const,
      group:
        forInstrument === 'guitar'
          ? ('guitar-amps' as const)
          : ('bass-amps' as const),
      name: m.name,
      about: AMP_ABOUT[m.id] ?? `${toneLabelOf(m.toneType)} amp`,
      tone: m.toneType as AudioEffectItem['tone'],
    }))
    // Clean, then crunch, then high gain: the way the gain goes up.
    .sort(
      (a, b) =>
        TONE_ORDER.indexOf(a.tone ?? '') - TONE_ORDER.indexOf(b.tone ?? ''),
    );

function toneLabelOf(tone: string): string {
  return TONE_LABEL[tone as keyof typeof TONE_LABEL] ?? tone;
}

export const PITCH_CORRECTION_ITEM: AudioEffectItem = {
  id: 'pitch-correction',
  kind: 'pitch-correction',
  group: 'voice',
  name: 'Pitch Correction',
  about: 'Tunes each note to the song’s key, from natural to robotic',
};

export const AUDIO_EFFECTS: readonly AudioEffectItem[] = [
  PITCH_CORRECTION_ITEM,
  ...amps('guitar'),
  ...amps('bass'),
];
