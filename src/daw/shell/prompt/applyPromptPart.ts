import {
  midiClipLength,
  midiClipSection,
} from '@/daw/components/Timeline/midiClipCuts';
import { trackSound } from '@/daw/instruments/trackSound';
import {
  normalizeSections,
  sectionTypeInfo,
  type SectionType,
} from '@/daw/model/sections';
import { trackHolder } from '@/daw/shell/canvas/clipMenu/clipActions';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import {
  replaceChordRegionsInRange,
  type ChordRegion,
} from '@/daw/store/prismSlice';
import {
  getTrackLimitMessage,
  type MidiClip,
  type Track,
} from '@/daw/store/tracksSlice';
import type {
  BuiltPart,
  PromptPartResult,
} from '@/features/promptSong/buildPromptPart';
import { trackPartOf, type PromptSpot } from './promptSpot';

/** What a prompt added: what Undo takes back, in one step. */
export interface AppliedPart {
  /** The Undo menu's label for it. */
  label: string;
  clipIds: string[];
  trackIds: string[];
  newTracks: number;
}

/** Why the part couldn't be added. */
export class PromptApplyRefusal extends Error {}

/** The clips of `track` with the spot cut out of them. */
function clearSpot(clips: readonly MidiClip[], from: number, to: number) {
  const out: MidiClip[] = [];
  for (const clip of clips) {
    const end = clip.startTick + midiClipLength(clip);
    if (end <= from || clip.startTick >= to) {
      out.push(clip);
      continue;
    }
    const before = midiClipSection(clip, clip.startTick, from);
    const after = midiClipSection(clip, to, end);
    if (before) out.push(before);
    if (after) out.push({ ...after, id: crypto.randomUUID() });
  }
  return out;
}

/** The spot's track, when this part can go on it. */
function laneFor(
  part: BuiltPart,
  spotTrack: Track | undefined,
  taken: Set<string>,
): Track | null {
  if (!spotTrack || taken.has(spotTrack.id)) return null;
  if (trackPartOf(spotTrack) !== part.part) return null;
  if (trackHolder(useStore.getState(), spotTrack.id) !== null) return null;
  return spotTrack;
}

/** Whether `track` has notes sounding from `from` to `to`. */
function playsIn(track: Track, from: number, to: number): boolean {
  return track.midiClips.some((clip) =>
    clip.events.some((e) => {
      const at = clip.startTick + e.startTick;
      return at < to && at + e.durationTicks > from;
    }),
  );
}

/** Where one of a prompt's parts goes. */
export interface PartPlacement {
  part: BuiltPart;
  /** The spot's own track, when it plays this part. */
  lane: Track | null;
  /**
   * Else the song's track that plays it already ("Bass", for a bass line
   * asked for on the Chords): the part goes there, not on a new track —
   * where it already has notes in the spot only if the student says to
   * update it (owner, 2026-10-24).
   */
  other: Track | null;
  /** `other` has notes in the spot's bars, which the part would replace. */
  occupied: boolean;
}

/** Each part's placement: the spot's track, the song's own, or a new one. */
export function placePromptParts(
  result: PromptPartResult,
  spot: PromptSpot,
): PartPlacement[] {
  const state = useStore.getState();
  const spotTrack = spot.trackId
    ? state.tracks.find((t) => t.id === spot.trackId)
    : undefined;
  const from = spot.startTick;
  const to = spot.startTick + result.reading.bars * 1920;
  const taken = new Set<string>();
  return result.parts.map((part) => {
    const lane = laneFor(part, spotTrack, taken);
    if (lane) {
      taken.add(lane.id);
      return { part, lane, other: null, occupied: false };
    }
    const other =
      state.tracks.find(
        (t) =>
          t.id !== spotTrack?.id &&
          !taken.has(t.id) &&
          trackPartOf(t) === part.part &&
          trackHolder(state, t.id) === null,
      ) ?? null;
    if (other) taken.add(other.id);
    return {
      part,
      lane: null,
      other,
      occupied: other ? playsIn(other, from, to) : false,
    };
  });
}

/**
 * Put a prompt's part on the timeline at its spot: each part on the spot's
 * track when that track plays it (its clips there cut away), else on the
 * song's track that plays it — where that one has notes in the spot, only
 * on `others: 'update'`; on 'keep' the part takes a track of its own — else
 * on a new track with the band's sound; the chords on the chord lane when
 * the part brought its own; the key and tempo the prompt named (or the
 * part's, when the song had none). One Undo step.
 */
export function applyPromptPart(
  result: PromptPartResult,
  spot: PromptSpot,
  others: 'update' | 'keep' = 'update',
): AppliedPart {
  const before = useStore.getState();
  const plan = placePromptParts(result, spot).map((p) => ({
    part: p.part,
    lane:
      p.lane ??
      (p.other && (!p.occupied || others === 'update') ? p.other : null),
  }));
  const newTracks = plan.filter((p) => !p.lane).length;
  if (newTracks) {
    const tracks = [...before.tracks];
    for (let i = 0; i < newTracks; i++) {
      const message = getTrackLimitMessage(tracks, 'midi');
      if (message) throw new PromptApplyRefusal(message);
      tracks.push({ type: 'midi' } as Track);
    }
  }

  const label = `Add ${result.parts.length === 1 ? result.parts[0].name : `${result.reading.styleName} parts`}`;
  const from = spot.startTick;
  const to = spot.startTick + result.reading.bars * 1920;
  return withTransaction(label, () => {
    const s = useStore.getState();
    // The tempo and key the prompt named, or a blank project's (its
    // groove's tempo, its style's key): the session's from now on.
    if (result.newBpm !== null) s.setBpm(result.newBpm);
    if (result.newKey) {
      if (s.rootLocked) s.toggleRootLock();
      s.setMode(result.newKey.mode);
      s.setRootNote(result.newKey.tonicPc);
    }

    const clipIds: string[] = [];
    const trackIds: string[] = [];
    for (const { part, lane } of plan) {
      let trackId: string;
      if (lane) {
        trackId = lane.id;
        const now = useStore.getState().tracks.find((t) => t.id === trackId);
        if (now) {
          useStore.getState().updateTrack(trackId, {
            midiClips: clearSpot(now.midiClips, from, to),
          });
        }
      } else {
        trackId = useStore.getState().addTrack('midi', 'soundfont', part.name, {
          trackRole: part.part,
        });
        if (!trackId) throw new PromptApplyRefusal('Track limit reached');
        const { settings, drumKit } = trackSound(
          trackId,
          part.sound,
          useStore.getState().bpm,
        );
        useStore.getState().updateTrack(trackId, {
          ...settings,
          ...(part.volume !== undefined ? { volume: part.volume } : {}),
        });
        if (drumKit) useStore.getState().setDrumKit(trackId, drumKit);
      }
      const clip: MidiClip = {
        ...part.clip,
        id: crypto.randomUUID(),
        startTick: from,
      };
      useStore.getState().addMidiClip(trackId, clip);
      clipIds.push(clip.id);
      trackIds.push(trackId);
    }

    if (result.chordRegions) {
      const placed: ChordRegion[] = result.chordRegions.map((r) => ({
        ...r,
        id: crypto.randomUUID(),
        startTick: r.startTick + from,
        endTick: r.endTick + from,
      }));
      const now = useStore.getState();
      now.setChordRegions(
        replaceChordRegionsInRange(now.chordRegions, placed, from, to),
        true,
        'given',
      );
    }

    // A section named ("write a bridge") marks the spot, where the song has
    // none there yet.
    if (result.section && !spot.section) {
      const now = useStore.getState();
      const clear = !now.sections.some(
        (sec) => sec.endTick > from && sec.startTick < to,
      );
      if (clear) {
        const type = result.section as SectionType;
        now.setSections(
          normalizeSections([
            ...now.sections,
            {
              id: crypto.randomUUID(),
              type,
              label: sectionTypeInfo(type).name,
              startTick: from,
              endTick: to,
            },
          ]),
        );
      }
    }

    if (clipIds.length) {
      const now = useStore.getState();
      now.setSelectedTrackId(trackIds[0]);
      now.setSelectedClip(clipIds[0], trackIds[0]);
    }
    return { label, clipIds, trackIds, newTracks };
  });
}
