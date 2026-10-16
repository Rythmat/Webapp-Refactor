import { useRef } from 'react';
import { useStore, type AllSlices } from '@/daw/store';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';

// ── What the timeline canvas draws from ─────────────────────────────────────
// The canvas used to redraw whenever the tracks array changed, and almost
// every edit replaces it: a fader step, an FX knob, an automation drag, a
// rename (finding timeline-07). The canvas draws only each track's id and
// colour and its clips' places, lengths, notes, offsets and fades, so it now
// compares those and leaves everything else alone.

function sameMidiClips(a: MidiClip[], b: MidiClip[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (
      x.id !== y.id ||
      x.startTick !== y.startTick ||
      x.durationTicks !== y.durationTicks ||
      x.events !== y.events
    ) {
      return false;
    }
  }
  return true;
}

function sameAudioClips(a: AudioClip[], b: AudioClip[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (
      x.id !== y.id ||
      x.startTick !== y.startTick ||
      x.duration !== y.duration ||
      x.fadeInTicks !== y.fadeInTicks ||
      x.fadeOutTicks !== y.fadeOutTicks ||
      x.assetId !== y.assetId ||
      x.offsetSeconds !== y.offsetSeconds
    ) {
      return false;
    }
  }
  return true;
}

/** True when two tracks arrays draw the same timeline. */
export function sameTimelineGeometry(a: Track[], b: Track[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (
      x.id !== y.id ||
      x.color !== y.color ||
      !sameMidiClips(x.midiClips, y.midiClips) ||
      !sameAudioClips(x.audioClips, y.audioClips)
    ) {
      return false;
    }
  }
  return true;
}

/** Store fields the canvas reads, besides the tracks. */
const DRAWN_FIELDS = [
  'bpm',
  'timeSignatureNumerator',
  'timeSignatureDenominator',
  'timelineZoom',
  'timelineScrollLeft',
  'timelineGridSize',
  'timelineTripletMode',
  'selectedClipId',
  'selectedChordIds',
  'selectedNotes',
  'loopEnabled',
  'loopStart',
  'loopEnd',
  'markers',
  'chordRegions',
  'chordRulerShowNotes',
  'rootNote',
  'mode',
  'clipColorMode',
  'liveRecordingTrackId',
  'liveRecordingStartTick',
  'liveRecordingNotes',
  'liveAudioTrackId',
  'liveAudioStartTick',
  'liveAudioPeaks',
] as const satisfies readonly (keyof AllSlices)[];

/** True when a store change alters what the timeline canvas shows. */
export function timelineNeedsRedraw(next: AllSlices, prev: AllSlices): boolean {
  for (const key of DRAWN_FIELDS) {
    if (next[key] !== prev[key]) return true;
  }
  return !sameTimelineGeometry(next.tracks, prev.tracks);
}

/**
 * The tracks, kept as they were until a change alters what the timeline
 * draws (sameTimelineGeometry). The timeline's markup and handlers, and its
 * scrollbar, read only that part of them, and fresh state through
 * useStore.getState().
 */
export function useTimelineTracks(): Track[] {
  const kept = useRef<Track[] | null>(null);
  return useStore((s) => {
    if (kept.current && sameTimelineGeometry(kept.current, s.tracks)) {
      return kept.current;
    }
    kept.current = s.tracks;
    return s.tracks;
  });
}
