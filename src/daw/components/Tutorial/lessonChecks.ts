import type { AllSlices } from '@/daw/store';
import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { trackSoundString } from '@/daw/instruments/simpleInstruments';
import { clipCount } from './studioBasics/loopAndRepeatChecks';
import type { StepCheck } from './tutorials';

export {
  clipCount,
  playedThenStopped,
} from './studioBasics/loopAndRepeatChecks';

// ── Checks the Studio Production lessons share ─────────────────────────────
// Every lesson starts from a blank project (owner, 2026-11-09), so a check
// never names a track: it looks at the selected track, or at the track
// playing a part (its role, as Prism and the track menu set it), and it
// compares with `armed`, the Studio as the step began, so nothing passes
// before the student has made the move.

type Track = AllSlices['tracks'][number];

/** The parts Prism writes, and the role a track playing one has. */
export type PartRole = 'drums' | 'bass' | 'chords';

/** The selected track, if any. */
export const selectedTrack = (s: AllSlices): Track | undefined =>
  s.tracks.find((t) => t.id === s.selectedTrackId);

/** The track playing `role`: the first one, top down. */
export const trackPlaying = (s: AllSlices, role: PartRole): Track | undefined =>
  s.tracks.find((t) => t.trackRole === role);

/** Every note on one track, across its clips. */
export const notesOn = (
  s: AllSlices,
  trackId: string | null | undefined,
): number =>
  s.tracks
    .find((t) => t.id === trackId)
    ?.midiClips.reduce((n, c) => n + c.events.length, 0) ?? 0;

/** The selected track has at least `n` more notes than when the step began. */
export const notesAddedOnSelected =
  (n: number): StepCheck =>
  (s, armed) =>
    notesOn(s, s.selectedTrackId) >= notesOn(armed, s.selectedTrackId) + n;

/** The ids of every note clip in the song. */
const clipIdsOf = (s: AllSlices): Set<string> =>
  new Set(s.tracks.flatMap((t) => t.midiClips.map((c) => c.id)));

/** A clip with notes appeared on a track playing `role` since the step began. */
export const newPartOn =
  (role: PartRole): StepCheck =>
  (s, armed) => {
    const had = clipIdsOf(armed);
    return s.tracks.some(
      (t) =>
        t.trackRole === role &&
        t.midiClips.some((c) => !had.has(c.id) && c.events.length > 0),
    );
  };

/** Every one of `roles` got a new part since the step began. */
export const newPartsOn =
  (...roles: PartRole[]): StepCheck =>
  (s, armed) =>
    roles.every((role) => newPartOn(role)(s, armed));

/** A track was added since the step began, and is selected, playing `instrument`. */
export const addedAndSelected =
  (instrument: Track['instrument']): StepCheck =>
  (s, armed) =>
    s.tracks.length > armed.tracks.length &&
    selectedTrack(s)?.instrument === instrument;

/** Some track's value changed since the step began. */
export const someTrackChanged =
  (read: (t: Track) => unknown): StepCheck =>
  (s, armed) =>
    s.tracks.some((t) => {
      const was = armed.tracks.find((a) => a.id === t.id);
      return !!was && read(t) !== read(was);
    });

/** The track playing `role` has another sound than when the step began. */
export const instrumentChangedOn =
  (role: PartRole): StepCheck =>
  (s, armed) => {
    const now = trackPlaying(s, role);
    const was = armed.tracks.find((t) => t.id === now?.id);
    return !!now && !!was && trackSoundString(now) !== trackSoundString(was);
  };

/** The selected track plays `role` and its dock shows `tab`. */
export const roleShowing =
  (role: PartRole, tab: AllSlices['channelStripTab']): StepCheck =>
  (s) =>
    selectedTrack(s)?.trackRole === role &&
    s.channelStripTab === tab &&
    !s.dockMaster;

/** The selected track has effect `type` in its chain. */
export const effectOnSelected =
  (type: EffectSlotType): StepCheck =>
  (s) =>
    selectedTrack(s)?.activeEffects.includes(type) ?? false;

/** The selected track's effect `type` has new settings since the step began. */
export const effectTweaked =
  (type: EffectSlotType): StepCheck =>
  (s, armed) => {
    const now = selectedTrack(s);
    const was = armed.tracks.find((t) => t.id === now?.id);
    return !!now && !!was && now.effects[type] !== was.effects[type];
  };

/** The song has more sections than when the step began. */
export const sectionAdded: StepCheck = (s, armed) =>
  s.sections.length > armed.sections.length;

/** The chord lane has at least `n` more chords than when the step began. */
export const chordsAdded =
  (n: number): StepCheck =>
  (s, armed) =>
    s.chordRegions.length >= armed.chordRegions.length + n;

/** At least `n` more clips than when the step began. */
export const clipsAdded =
  (n: number): StepCheck =>
  (s, armed) =>
    clipCount(s) >= clipCount(armed) + n;

/** The playhead is parked at the start. */
export const atStart: StepCheck = (s) => !s.isPlaying && s.position === 0;

/** A clip was added since the step began, and `also` holds. */
export const clipAddedAnd =
  (also: StepCheck): StepCheck =>
  (s, armed) =>
    clipCount(s) > clipCount(armed) && also(s, armed);
