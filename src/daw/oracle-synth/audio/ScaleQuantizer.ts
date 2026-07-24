import { ALL_MODES } from '@prism/engine';

/**
 * Scale quantization for note input (Key/Scale lock).
 *
 * A scale is a 12-bit mask over pitch classes (bit n set = pc n in scale),
 * the same representation the DAW's music-intelligence bus uses
 * (musicIntelligenceSlice.activeNotesBitmask). Mask 0xfff = chromatic.
 */

export type SnapMode = 'nearest' | 'down' | 'up' | 'fold';

export const CHROMATIC_MASK = 0xfff;

/** Builds a 12-bit pitch-class mask for a key from @prism/engine's mode table. */
export function scaleMask(rootPc: number, mode: string): number {
  const intervals = ALL_MODES[mode];
  if (!intervals) return CHROMATIC_MASK;
  let mask = 0;
  for (const iv of intervals) {
    mask |= 1 << ((rootPc % 12) + 12 + iv) % 12;
  }
  return mask;
}

function inScale(note: number, mask: number): boolean {
  return (mask & (1 << ((note % 12) + 12) % 12)) !== 0;
}

/**
 * Snaps a MIDI note into the scale described by `mask`.
 *
 * - 'nearest': smallest chromatic distance to an in-scale pc (tie → down)
 * - 'down' / 'up': force direction
 * - 'fold': positional remap — the 12 chromatic pcs map onto the scale
 *   degrees in order (a "scale keyboard"), preserving octave
 *
 * In-scale notes pass through; an empty or full mask is a passthrough.
 * The result is clamped to the 0-127 MIDI range.
 */
export function quantizePitch(
  note: number,
  mask: number,
  snap: SnapMode = 'nearest',
): number {
  if (mask === 0 || mask === CHROMATIC_MASK) return note;
  if (snap !== 'fold' && inScale(note, mask)) return note;

  if (snap === 'fold') {
    const degrees: number[] = [];
    for (let pc = 0; pc < 12; pc++) {
      if (mask & (1 << pc)) degrees.push(pc);
    }
    if (degrees.length === 0) return note;
    const octave = Math.floor(note / 12);
    const pc = note % 12;
    // Position within the chromatic octave → scale degree (wrap past the end)
    const degreeIndex = pc % degrees.length;
    const extraOctaves = Math.floor(pc / degrees.length);
    return clampMidi((octave + extraOctaves) * 12 + degrees[degreeIndex]);
  }

  for (let dist = 1; dist <= 6; dist++) {
    const down = note - dist;
    const up = note + dist;
    const downOk = down >= 0 && inScale(down, mask);
    const upOk = up <= 127 && inScale(up, mask);
    switch (snap) {
      case 'down':
        if (downOk) return down;
        break;
      case 'up':
        if (upOk) return up;
        break;
      case 'nearest':
      default:
        if (downOk) return down; // tie → down
        if (upOk) return up;
        break;
    }
  }
  // Directional snap hit the MIDI range edge — fall back to the other side
  for (let dist = 1; dist <= 6; dist++) {
    const down = note - dist;
    const up = note + dist;
    if (down >= 0 && inScale(down, mask)) return down;
    if (up <= 127 && inScale(up, mask)) return up;
  }
  return note;
}

function clampMidi(note: number): number {
  return Math.max(0, Math.min(127, note));
}

/**
 * Stateful quantizer for the note-input path.
 *
 * The input→output mapping is many-to-one (several input keys can quantize
 * to the same scale note, and the same input key can remap mid-hold when
 * the key changes), so two structures are kept:
 *
 * - `held`: a LIFO stack of played notes per input note, so a note-off
 *   always releases the note that was actually played — even after a
 *   key change or a same-note retrigger (overlapping clips).
 * - `outputRefs`: a refcount per played note. A note-off for an output
 *   that other held keys still sound is SUPPRESSED (mapNoteOff returns
 *   null) so releasing one of two colliding keys doesn't silence both.
 */
export class ScaleQuantizer {
  private mask = CHROMATIC_MASK;
  private snap: SnapMode = 'nearest';
  private enabled = false;
  private held = new Map<number, number[]>();
  private outputRefs = new Map<number, number>();

  setScale(mask: number, snap: SnapMode, enabled: boolean): void {
    this.mask = mask;
    this.snap = snap;
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getMask(): number {
    return this.enabled ? this.mask : CHROMATIC_MASK;
  }

  mapNoteOn(note: number): number {
    const out = this.enabled ? quantizePitch(note, this.mask, this.snap) : note;
    const stack = this.held.get(note);
    if (stack) {
      stack.push(out);
    } else {
      this.held.set(note, [out]);
    }
    this.outputRefs.set(out, (this.outputRefs.get(out) ?? 0) + 1);
    return out;
  }

  /**
   * Returns the played note to release, or null when the note-off must be
   * suppressed because another held key still sounds the same output note.
   */
  mapNoteOff(note: number): number | null {
    const stack = this.held.get(note);
    if (!stack || stack.length === 0) {
      // Unknown note-off (e.g. enabled mid-note) — best effort, unrefcounted
      return this.enabled ? quantizePitch(note, this.mask, this.snap) : note;
    }
    const out = stack.pop()!;
    if (stack.length === 0) this.held.delete(note);

    const refs = (this.outputRefs.get(out) ?? 1) - 1;
    if (refs > 0) {
      this.outputRefs.set(out, refs);
      return null; // another held key still sounds this note
    }
    this.outputRefs.delete(out);
    return out;
  }

  clear(): void {
    this.held.clear();
    this.outputRefs.clear();
  }
}
