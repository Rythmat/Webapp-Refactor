import type { InstrumentType } from '@/daw/store/tracksSlice';
import { BUNDLED_MODELS } from './nam/NamModelStore';

// ── What an Audio track has plugged in ─────────────────────────────────────
//
// The Guitar, Bass and Voice tracks went (owner, 2026-10-22): an Audio track
// holds their amps and pitch correction. What it records is read from its
// chain, with no setting to learn: a bass amp means a bass, a guitar amp a
// guitar, pitch correction with no amp a voice, anything else plain audio.
// Guitar/Bass-to-MIDI takes its pitch range from it, the Score its clef,
// chord detection its one-note-at-a-time handling of a voice.

export type AudioSource = 'guitar' | 'bass' | 'voice' | 'other';

interface ChainBlock {
  type: string;
  namModelId?: string | null;
}

/** What an Audio track records, from its chain (others: 'other'). */
export function audioSourceOf(track: {
  instrument: InstrumentType;
  guitarChain?: readonly ChainBlock[];
}): AudioSource {
  if (track.instrument !== 'audio-input') return 'other';
  const chain = track.guitarChain ?? [];
  const amp = chain.find((b) => b.type === 'nam-amp');
  if (amp) {
    const model = BUNDLED_MODELS.find((m) => m.id === amp.namModelId);
    return model?.forInstrument === 'bass' ? 'bass' : 'guitar';
  }
  return chain.some((b) => b.type === 'pitch-correction') ? 'voice' : 'other';
}
