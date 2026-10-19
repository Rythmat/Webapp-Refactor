import {
  AudioLines,
  AudioWaveform,
  Drum,
  Guitar,
  KeyboardMusic,
  Mic,
  Music2,
  Piano,
  Plug,
  Scissors,
  SlidersHorizontal,
  Speaker,
  type LucideIcon,
} from 'lucide-react';
import type { InstrumentType } from '@/daw/store';

// ── A track's instrument as an icon (milestone 2.15) ───────────────────────
//
// The track row's instrument button shows it, as Soundtrap's row does (ST10).
// The same glyphs as the Add-track picker's choices, so a track looks like
// the tile it was added from: a piano for the piano, the amp's plug for a
// live guitar, a waveform for a plain audio track.

const ICONS: Readonly<Record<InstrumentType, LucideIcon>> = {
  'oracle-synth': AudioWaveform,
  'piano-sampler': Piano,
  'electric-piano': KeyboardMusic,
  'bass-electric': Guitar,
  'guitar-acoustic': Guitar,
  cello: Music2,
  organ: SlidersHorizontal,
  'tonewheel-organ': SlidersHorizontal,
  soundfont: Music2,
  'drum-machine': Drum,
  sampler: Scissors,
  'guitar-fx': Plug,
  'bass-fx': Speaker,
  'vocal-fx': Mic,
  none: AudioLines,
};

/** The icon for a track of `instrument`. */
export function trackIcon(instrument: InstrumentType): LucideIcon {
  return ICONS[instrument] ?? AudioLines;
}
