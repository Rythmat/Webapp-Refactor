import type {
  LabGroove,
  LabLane,
} from '@/curriculum/engine/grooveLab/labGroove';
import { padLabel } from '@/daw/instruments/drumKits';

// The three rows' names and colors: the old grid's kick red and snare
// amber, the hi-hat its sky blue, the ride a violet of its own.

const COLORS = {
  kick: '#E5585C',
  snare: '#F2AA3C',
  hat: '#38bdf8',
  ride: '#a78bfa',
} as const;

export function laneColor(groove: LabGroove, lane: LabLane): string {
  if (lane === 'cymbal') return COLORS[groove.cymbal];
  return COLORS[lane];
}

/** "Kick", "Snare" (or the kit's name for its sidestick), "Hi-Hat", "Ride". */
export function laneName(groove: LabGroove, lane: LabLane): string {
  if (lane === 'kick') return 'Kick';
  if (lane === 'cymbal') return groove.cymbal === 'hat' ? 'Hi-Hat' : 'Ride';
  return groove.pads.snare === 38
    ? 'Snare'
    : padLabel(40, groove.kit.includes('natural') ? 'natural' : groove.kit);
}
