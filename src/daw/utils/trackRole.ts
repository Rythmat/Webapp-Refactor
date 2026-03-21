/**
 * Guess a track's harmonic role from its name and instrument type.
 * Used by both the DAW store (track creation) and UNISON (session analysis).
 */
export type DawTrackRole = 'chords' | 'melody' | 'bass' | 'drums' | 'auto';

export function guessTrackRole(name: string, instrument: string): DawTrackRole {
  const n = name.toLowerCase();
  const inst = instrument.toLowerCase();

  if (n.includes('drum') || inst.includes('drum')) return 'drums';
  if (n.includes('bass') || inst.includes('bass')) return 'bass';
  if (n.includes('melody') || n.includes('lead')) return 'melody';
  if (
    n.includes('chord') ||
    n.includes('harm') ||
    n.includes('pad') ||
    inst.includes('pad')
  )
    return 'chords';
  return 'auto';
}
