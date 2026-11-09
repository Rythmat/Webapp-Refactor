// ── Make Your Song's flow ──────────────────────────────────────────────────
// What the student is doing, as one reducer (docs/echo-game.md, Make Your
// Song and Takes): choose a band and its groove, then the mini-Studio,
// where a track is recorded take by take (a count-in, the phrase, the take
// shown), each take used or tried again; with both tracks taken, the
// Listen / Edit / Finish pop-up; Finish shows the victory.
//
//   band ──► studio ──► victory
//              │  idle ─► countIn ─► recording ─► review ─► idle
//              │  idle ─► listening ─► idle
//              └─ popup (both takes): Listen · Edit · Finish
//
// The Chords track is picked first, so the band can play the chords. A
// track with a take can be recorded again whenever it's picked. Pure: the
// component plays the sound and records the notes.

import type { ChordTake, EchoTake, MelodyTake } from '@/curriculum/engine/echo';

export type SongTrack = 'chords' | 'melody';

export type StudioActivity =
  | { kind: 'idle' }
  /** The bar before the take: beat 1–4 heard (0 before the first). */
  | { kind: 'countIn'; track: SongTrack; beat: number }
  | { kind: 'recording'; track: SongTrack }
  /** A take recorded, shown with Use That Take / Try Another Take. */
  | { kind: 'review'; take: EchoTake; playing: boolean }
  /** The whole song playing. */
  | { kind: 'listening' };

export interface SongFlow {
  screen: 'band' | 'studio' | 'victory';
  /** The band and groove chosen; null before one is. */
  band: { band: string; variation: string } | null;
  /** The track a Record records. */
  selected: SongTrack;
  takes: { chords: ChordTake | null; melody: MelodyTake | null };
  activity: StudioActivity;
  /** The Listen / Edit / Finish pop-up. */
  popup: boolean;
}

export type SongAction =
  | { type: 'pickBand'; band: string; variation: string }
  | { type: 'openStudio' }
  | { type: 'changeBand' }
  | { type: 'select'; track: SongTrack }
  | { type: 'countIn'; beat: number }
  | { type: 'record' }
  | { type: 'recorded'; take: EchoTake }
  | { type: 'stop' }
  | { type: 'reviewPlaying'; playing: boolean }
  | { type: 'useTake' }
  | { type: 'tryAgain' }
  | { type: 'listen' }
  | { type: 'openPopup' }
  | { type: 'edit' }
  | { type: 'finish' };

export const initialSongFlow = (band: SongFlow['band'] = null): SongFlow => ({
  screen: 'band',
  band,
  selected: 'chords',
  takes: { chords: null, melody: null },
  activity: { kind: 'idle' },
  popup: false,
});

/** Both tracks have a take: the song can be finished. */
export const songComplete = (flow: Pick<SongFlow, 'takes'>): boolean =>
  flow.takes.chords !== null && flow.takes.melody !== null;

/** Nothing is recording or about to: a track can be picked, a band changed. */
export const studioFree = (flow: SongFlow): boolean =>
  flow.activity.kind === 'idle' || flow.activity.kind === 'listening';

const IDLE: StudioActivity = { kind: 'idle' };

export function songFlowReducer(flow: SongFlow, action: SongAction): SongFlow {
  switch (action.type) {
    case 'pickBand':
      return {
        ...flow,
        band: { band: action.band, variation: action.variation },
      };
    case 'openStudio':
      return flow.band
        ? { ...flow, screen: 'studio', activity: IDLE, popup: false }
        : flow;
    case 'changeBand':
      // Edit's other half: a band and groove chosen again, the takes kept.
      return flow.screen === 'studio' && studioFree(flow)
        ? { ...flow, screen: 'band', activity: IDLE, popup: false }
        : flow;
    case 'select':
      return studioFree(flow)
        ? { ...flow, selected: action.track, activity: IDLE }
        : flow;
    case 'countIn':
      // Starting a take, or the next beat of its count-in.
      if (flow.activity.kind === 'countIn')
        return { ...flow, activity: { ...flow.activity, beat: action.beat } };
      return studioFree(flow)
        ? {
            ...flow,
            popup: false,
            activity: {
              kind: 'countIn',
              track: flow.selected,
              beat: action.beat,
            },
          }
        : flow;
    case 'record':
      return flow.activity.kind === 'countIn'
        ? {
            ...flow,
            activity: { kind: 'recording', track: flow.activity.track },
          }
        : flow;
    case 'recorded':
      return flow.activity.kind === 'recording' ||
        flow.activity.kind === 'countIn'
        ? {
            ...flow,
            activity: { kind: 'review', take: action.take, playing: false },
          }
        : flow;
    case 'stop':
      // A take stopped before its end is no take; playback just stops.
      return flow.activity.kind === 'review'
        ? { ...flow, activity: { ...flow.activity, playing: false } }
        : { ...flow, activity: IDLE };
    case 'reviewPlaying':
      return flow.activity.kind === 'review'
        ? { ...flow, activity: { ...flow.activity, playing: action.playing } }
        : flow;
    case 'useTake': {
      if (flow.activity.kind !== 'review') return flow;
      const { take } = flow.activity;
      const takes =
        take.kind === 'chords'
          ? { ...flow.takes, chords: take }
          : { ...flow.takes, melody: take };
      const complete = songComplete({ takes });
      // On to the track still waiting for a take, if one is.
      const selected: SongTrack = complete
        ? take.kind
        : take.kind === 'chords'
          ? 'melody'
          : 'chords';
      return { ...flow, takes, selected, activity: IDLE, popup: complete };
    }
    case 'tryAgain':
      return flow.activity.kind === 'review'
        ? { ...flow, activity: IDLE }
        : flow;
    case 'listen':
      return flow.screen === 'studio' && studioFree(flow)
        ? { ...flow, activity: { kind: 'listening' } }
        : flow;
    case 'openPopup':
      return songComplete(flow) && studioFree(flow)
        ? { ...flow, popup: true }
        : flow;
    case 'edit':
      return { ...flow, popup: false, activity: IDLE };
    case 'finish':
      return songComplete(flow)
        ? { ...flow, screen: 'victory', popup: false, activity: IDLE }
        : flow;
  }
}
