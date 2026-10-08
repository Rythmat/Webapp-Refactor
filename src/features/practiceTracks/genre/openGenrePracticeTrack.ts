/**
 * openGenrePracticeTrack.ts — The hand-off from a genre lesson into its
 * Practice Track, and the Studio's side of it.
 *
 * **Why a module box and not just URL parameters.** The genre backing engine is
 * deliberately not reproducible (see buildGenrePracticeTrack), so the clips the
 * student improvises over have to be the clips that reach the Studio — rebuild
 * from `?genre=funk&level=2&section=A` and they would be playing over a
 * different performance from the one they just heard. But `DawApp`'s boot
 * resets the session to empty before it seeds anything, so the lesson cannot
 * simply seed the store and navigate: the reset would wipe it.
 *
 * So the lesson builds the track, leaves it here, and navigates with the
 * parameters. The Studio takes what is in the box. On a cold deep link or a
 * refresh the box is empty and the parameters rebuild it — a fresh performance,
 * but the same generator and no error, which is the right way round.
 */

import { StudioRoutes } from '@/constants/routes';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import type { GenrePracticeSession } from '@/daw/store/uiSlice';
import {
  buildGenrePracticeTrack,
  type GenrePracticeTrackResult,
} from './buildGenrePracticeTrack';
import { keyboardWindow, scaleTonicIn } from './practiceKeyboard';
import { practicePrompts } from './practicePrompts';

// ── The hand-off box ─────────────────────────────────────────────────────────

interface PendingPracticeTrack {
  genre: string;
  level: number;
  section: ActivitySectionId;
  genreLabel: string;
  returnTo: string;
  track: GenrePracticeTrackResult;
}

let pending: PendingPracticeTrack | null = null;

/** Leave a built Practice Track for the Studio to pick up on the next route. */
export function stashPracticeTrack(next: PendingPracticeTrack): void {
  pending = next;
}

/**
 * Take the pending Practice Track if it is the one the parameters asked for.
 * Reading it clears it, so a later refresh rebuilds rather than replaying a
 * track from a navigation that has already happened.
 */
export function takePracticeTrack(
  genre: string,
  level: number,
  section: ActivitySectionId,
): PendingPracticeTrack | null {
  const found =
    pending &&
    pending.genre === genre &&
    pending.level === level &&
    pending.section === section
      ? pending
      : null;
  pending = null;
  return found;
}

// ── The session the practice screen reads ────────────────────────────────────

/**
 * Everything the practice screen needs, derived from the built track: the
 * keyboard sized to the section's own writing, the scale lit where it can be
 * read, and the prompts for the part being played.
 */
export function practiceSessionFor(
  track: GenrePracticeTrackResult,
  genreLabel: string,
  returnTo: string,
): GenrePracticeSession {
  const keyboard = keyboardWindow(
    track.studentRange.low,
    track.studentRange.high,
    // A bass line is played downwards from what's written; everything else is
    // played upwards, so only a bass part takes the lower keyboard.
    { preferLow: track.studentParts.every((part) => part === 'bass') },
  );
  // Room for the widest scale on the switcher, so switching never pushes a name
  // off the end of the keyboard.
  const widest = Math.max(
    ...track.scales.map((scale) => scale.intervals[scale.intervals.length - 1]),
    11,
  );
  return {
    kind: 'genre',
    genre: track.genre,
    genreLabel,
    level: track.level,
    section: track.section,
    sectionName: track.sectionName,
    keyLabel: track.keyLabel,
    scales: track.scales,
    chordCycle: track.chordCycle,
    voicingSets: track.voicingSets,
    defaultVoicing: track.defaultVoicing,
    bassFloor: track.bassFloor,
    studentParts: track.studentParts,
    keyboard,
    scaleTonic: scaleTonicIn(keyboard, track.keyRootPc, widest),
    prompts: practicePrompts(track.studentParts, track.sourceDirection),
    returnTo,
  };
}

// ── Opening one ──────────────────────────────────────────────────────────────

/** The Studio URL that opens a genre Practice Track. */
export function practiceTrackUrl(
  genre: string,
  level: number,
  section: ActivitySectionId,
): string {
  return `${StudioRoutes.editor.definition}?practiceGenre=${encodeURIComponent(genre)}&practiceLevel=${level}&practiceSection=${section}`;
}

/**
 * Build the Practice Track for a section, leave it for the Studio, and give back
 * the URL to navigate to — or null when the section has nothing to practise
 * over, in which case no entry point should have been offered.
 */
export function openGenrePracticeTrack(
  flow: ActivityFlowV2,
  section: ActivitySectionId,
  options: { genreLabel: string; returnTo: string; bpm?: number },
): string | null {
  const track = buildGenrePracticeTrack(flow, section, { bpm: options.bpm });
  if (!track) return null;
  stashPracticeTrack({
    genre: flow.genre,
    level: flow.level,
    section,
    genreLabel: options.genreLabel,
    returnTo: options.returnTo,
    track,
  });
  return practiceTrackUrl(flow.genre, flow.level, section);
}

/** A genre Practice Track as the Studio opens it (resolvePracticeTrack). */
export interface ResolvedPracticeTrack {
  track: GenrePracticeTrackResult;
  genreLabel: string;
  returnTo: string;
}

/**
 * The Studio's side: the track the URL names, from the box if the lesson just
 * left one there, else rebuilt from the flow. Null when the parameters name
 * nothing real.
 */
export async function resolvePracticeTrack(
  genre: string,
  level: number,
  section: ActivitySectionId,
): Promise<ResolvedPracticeTrack | null> {
  const handed = takePracticeTrack(genre, level, section);
  if (handed) {
    return {
      track: handed.track,
      genreLabel: handed.genreLabel,
      returnTo: handed.returnTo,
    };
  }

  const flow = await getActivityFlow(genre, level);
  if (
    !flow ||
    !('version' in flow) ||
    (flow as ActivityFlowV2).version !== 'v2'
  )
    return null;
  const track = buildGenrePracticeTrack(flow as ActivityFlowV2, section);
  if (!track) return null;
  return {
    track,
    genreLabel: genreTitle(genre),
    returnTo: `/curriculum/${genre}/${level}?section=${section}`,
  };
}

/** A genre slug as a title, for a deep link that arrives without one. */
function genreTitle(genre: string): string {
  return genre
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
