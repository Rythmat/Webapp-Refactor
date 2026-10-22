import type { InstrumentType, Track, TrackType } from '@/daw/store/tracksSlice';

// ── Project Template Types ──────────────────────────────────────────────

export interface ProjectTemplateTrack {
  name: string;
  type: TrackType;
  instrument: InstrumentType;
  color: string;
  /**
   * Oracle Synth tracks: the patch to open with — a factory preset or a Music
   * Atlas patch saved "for everyone" (e.g. 'DRIFT'). Applied by
   * seedTemplateSynthPatches.
   */
  synthPreset?: string;
  /** An Instruments track's General MIDI program. */
  gmProgram?: number;
  /** An Audio track's chain to start with (its amp; audioSource). */
  guitarChain?: Track['guitarChain'];
}

/**
 * A template's guitar: an Audio track with a clean guitar amp (Quartz), as
 * the Guitar track it was until those folded into Audio (2026-10-22).
 */
const GUITAR_AMP_CHAIN: Track['guitarChain'] = [
  {
    type: 'nam-amp',
    enabled: true,
    params: {
      inputLevel: 0.5,
      bass: 0.5,
      mid: 0.5,
      treble: 0.5,
      presence: 0.5,
      outputLevel: 0.5,
      volume: 0.7,
    },
    namModelId: 'nam-clean-twin',
  },
];

export interface ProjectTemplate {
  id: string;
  label: string;
  icon: string;
  color: string;
  bpm: number;
  genre: string;
  tracks: ProjectTemplateTrack[];
}

// ── Genre Project Templates ─────────────────────────────────────────────

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'project-rock',
    label: 'Rock',
    icon: 'Flame',
    color: '#f94144',
    bpm: 120,
    genre: 'Rock',
    tracks: [
      {
        name: 'Drums',
        type: 'midi',
        instrument: 'drum-machine',
        color: '#f59e0b',
      },
      {
        name: 'Bass',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#3b82f6',
      },
      {
        name: 'Guitar',
        type: 'audio',
        instrument: 'audio-input',
        guitarChain: GUITAR_AMP_CHAIN,
        color: '#f94144',
      },
      {
        name: 'Vocal',
        type: 'audio',
        instrument: 'audio-input',
        color: '#f3722c',
      },
    ],
  },
  {
    id: 'project-rnb',
    label: 'R&B',
    icon: 'Music',
    color: '#8b5cf6',
    bpm: 85,
    genre: 'R&B',
    tracks: [
      {
        name: 'Drums',
        type: 'midi',
        instrument: 'drum-machine',
        color: '#f59e0b',
      },
      {
        name: 'Bass',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#3b82f6',
      },
      {
        name: 'Keys',
        type: 'midi',
        instrument: 'soundfont',
        gmProgram: 4, // Electric Piano 1
        color: '#43aa8b',
      },
      {
        name: 'Pad',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#a855f7',
      },
      {
        name: 'Vocal',
        type: 'audio',
        instrument: 'audio-input',
        color: '#da627d',
      },
    ],
  },
  {
    id: 'project-pop',
    label: 'Pop',
    icon: 'Sparkles',
    color: '#f9c74f',
    bpm: 120,
    genre: 'Pop',
    tracks: [
      {
        name: 'Drums',
        type: 'midi',
        instrument: 'drum-machine',
        color: '#f59e0b',
      },
      {
        name: 'Bass',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#3b82f6',
      },
      {
        name: 'Synth',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#8b5cf6',
      },
      {
        name: 'Pad',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#43aa8b',
      },
      {
        name: 'Vocal',
        type: 'audio',
        instrument: 'audio-input',
        color: '#f94144',
      },
    ],
  },
  {
    id: 'project-indie',
    label: 'Indie',
    icon: 'AudioWaveform',
    color: '#43aa8b',
    bpm: 110,
    genre: 'Indie',
    tracks: [
      {
        name: 'Drums',
        type: 'midi',
        instrument: 'drum-machine',
        color: '#f59e0b',
      },
      {
        name: 'Bass',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#3b82f6',
      },
      {
        name: 'Guitar',
        type: 'audio',
        instrument: 'audio-input',
        guitarChain: GUITAR_AMP_CHAIN,
        color: '#f3722c',
      },
      {
        name: 'Synth',
        type: 'midi',
        instrument: 'oracle-synth',
        color: '#8b5cf6',
      },
      {
        name: 'Vocal',
        type: 'audio',
        instrument: 'audio-input',
        color: '#90be6d',
      },
    ],
  },
];

export function getProjectTemplate(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}
