import {
  AudioLines,
  AudioWaveform,
  Drum,
  Music2,
  type LucideIcon,
} from 'lucide-react';
import type { InstrumentType } from '@/daw/store';

// ── A track's instrument as an icon (milestone 2.15) ───────────────────────
//
// The track row's instrument button shows it, as Soundtrap's row does (ST10).
// The same glyphs as the + Add track menu's choices, so a track looks like
// what it was added as: a waveform for Synth and for Audio, a note for
// Instruments, a drum for Drums.

const ICONS: Readonly<Record<InstrumentType, LucideIcon>> = {
  'oracle-synth': AudioWaveform,
  soundfont: Music2,
  'drum-machine': Drum,
  'audio-input': AudioLines,
  none: AudioLines,
};

/** The icon for a track of `instrument`. */
export function trackIcon(instrument: InstrumentType): LucideIcon {
  return ICONS[instrument] ?? AudioLines;
}
