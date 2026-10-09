import { useStore, type AllSlices } from '@/daw/store';
import {
  cloudSaveGaps,
  documentFingerprint,
  useSaveStatusStore,
} from '@/daw/persistence/saveStatusStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import { hashFingerprint } from '@/lib/studio-projects/drafts/fingerprintHash';
import type { DraftCloudRecord } from '@/lib/studio-projects/drafts/types';
import { serverTimeIso } from '@/lib/studio-projects/projectsClient';
import type { LastSaved } from './cloudSaveStore';

// ── What the live session's cloud copy holds (milestone 1.4) ───────────────
//
// The save chip compares the document against the session's last save, or
// the cloud copy it opened from (LastSaved in cloudSaveStore). This module
// builds those records for openSession (a project opened from the cloud, a
// draft that remembers its last save) and says what today's cloud payload
// leaves out, in words a student reads in the save toast and the chip.
//
// Until milestone 1.5's document field, the payload has no place for the
// chord lane, the mode, the metre, markers, mastering, the Score and Lead
// Sheet, the Prism builder and clip lengths. 1.3's cloudSaveGaps names them
// by registry key (decision D7); a save that leaves any of them out is
// complete=false, and the chip reads 'Saved on this device' after it.

/**
 * Whether a cloud save of `state` would leave anything out: content only
 * 1.5's document carries, or audio whose bytes never reached the cloud.
 * 1.3's cloudSaveGaps in its legacy mode (which already drops note ids, a
 * load derives them again).
 */
export function projectHoldsDocumentOnlyData(
  state: AllSlices = useStore.getState(),
): boolean {
  return cloudSaveGaps(state, 'legacy').length > 0;
}

/** cloudSaveGaps names of audio a save couldn't upload (not document data). */
const AUDIO_GAPS: ReadonlySet<string> = new Set([
  'AudioClip.assetId',
  'Track.samplerSample',
]);

/** The plain group of each top-level key cloudSaveGaps can name. */
const GROUP_OF_KEY: Readonly<Record<string, string>> = {
  chordRegions: 'chord symbols',
  mode: 'mode',
  rootLocked: 'mode',
  timeSignatureNumerator: 'time signature',
  timeSignatureDenominator: 'time signature',
  loopStart: 'loop range',
  loopEnd: 'loop range',
  markers: 'markers',
  masterVolume: 'mastering',
  masteringFxChain: 'mastering',
  masteringEffects: 'mastering',
  masterAutomation: 'mastering',
  returns: 'effect returns',
  // Chord-coloured clips come on with the chord lane (setChordRegions).
  clipColorMode: 'chord symbols',
  chordSeq: 'Prism settings',
  stringSeq: 'Prism settings',
  strumMode: 'Prism settings',
  strumAmount: 'Prism settings',
  tiltMode: 'Prism settings',
  tiltAmount: 'Prism settings',
  filterPercent: 'Prism settings',
  chordRecordMode: 'Prism settings',
  'MidiClip.durationTicks': 'clip lengths',
  'MidiClip.ccEvents': 'controller data',
};

/** Where groups come in the toast: the ones students notice first. */
const GROUP_ORDER: readonly string[] = [
  'chord symbols',
  'notation',
  'markers',
  'time signature',
  'mode',
  'mastering',
  'Prism settings',
  'clip lengths',
  'controller data',
  'loop range',
  'effect returns',
  'note details',
  'track settings',
  'other settings',
];

function groupOf(gap: string): string {
  const named = GROUP_OF_KEY[gap];
  if (named !== undefined) return named;
  if (/^(score|leadSheet|measure)/.test(gap)) return 'notation';
  if (gap.startsWith('MidiNoteEvent.')) return 'note details';
  if (gap.startsWith('Track.') || gap.startsWith('AudioClip.')) {
    return 'track settings';
  }
  return 'other settings';
}

/**
 * What a cloud save of `state` leaves out, as plain group names in the
 * order a student notices them: 'chord symbols', 'notation', 'markers',
 * 'time signature', 'mode', 'mastering', 'Prism settings', 'clip lengths',
 * and a few rarer ones. Audio that didn't upload isn't listed: the save says
 * so in a toast of its own. Empty when the cloud holds the whole document.
 */
export function documentOnlyGroups(
  state: AllSlices = useStore.getState(),
): string[] {
  return groupsFromGaps(cloudSaveGaps(state, 'legacy'));
}

/**
 * documentOnlyGroups of gaps already taken (cloudSaveGaps names): a save's
 * toast words what its own snapshot left out, not the document as it is
 * once the save finished.
 */
export function groupsFromGaps(gaps: readonly string[]): string[] {
  const groups = new Set<string>();
  for (const gap of gaps) {
    if (AUDIO_GAPS.has(gap)) continue;
    groups.add(groupOf(gap));
  }
  return [...groups].sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b),
  );
}

/** Groups named in the plural: they take 'stay', the others 'stays'. */
const PLURAL_GROUPS: ReadonlySet<string> = new Set([
  'chord symbols',
  'markers',
  'Prism settings',
  'clip lengths',
  'effect returns',
  'note details',
  'track settings',
  'other settings',
  'some settings',
]);

/**
 * Groups as one phrase: 'chord symbols', 'chord symbols and notation',
 * 'chord symbols, notation and markers', and past three
 * 'chord symbols, notation and 3 more'.
 */
export function formatGroups(groups: readonly string[]): string {
  if (groups.length === 0) return '';
  if (groups.length === 1) return groups[0];
  if (groups.length <= 3) {
    return `${groups.slice(0, -1).join(', ')} and ${groups[groups.length - 1]}`;
  }
  return `${groups.slice(0, 2).join(', ')} and ${groups.length - 2} more`;
}

/** The verb for `groups` as a subject: 'stays' for one singular group, else 'stay'. */
export function stayVerb(groups: readonly string[]): 'stays' | 'stay' {
  return groups.length === 1 && !PLURAL_GROUPS.has(groups[0])
    ? 'stays'
    : 'stay';
}

/**
 * The save toast's caveat for `groups`: ' — chord symbols and notation stay
 * on this device for now', ' — notation stays on this device for now', or
 * '' when there are none.
 */
export function stayOnDevicePhrase(groups: readonly string[]): string {
  if (groups.length === 0) return '';
  return ` — ${formatGroups(groups)} ${stayVerb(groups)} on this device for now`;
}

/**
 * The record for a project just opened from the cloud: the document as it
 * stands now (call it after the load, before any edit), complete when the
 * cloud copy holds all of it.
 */
export function cloudOpenedRecord(project: {
  id: string;
  updatedAt: Date | string | null;
}): LastSaved {
  const state = useStore.getState();
  return {
    projectId: project.id,
    fingerprint: hashFingerprint(documentFingerprint(state)),
    version: useSaveStatusStore.getState().documentVersion,
    complete: !projectHoldsDocumentOnlyData(state),
    updatedAt: serverTimeIso(project.updatedAt),
    at: Date.now(),
    generation: getSessionGeneration(),
  };
}

/**
 * The record a draft remembers of its last save, for the session it opens
 * as: null when the draft has none, or when it names another project than
 * the one the session is linked to. version -1: only the fingerprint can
 * say whether the document still matches.
 */
export function lastSavedFromDraft(
  cloud: DraftCloudRecord | undefined,
  projectId: string | null,
): LastSaved | null {
  if (!cloud || !projectId || cloud.projectId !== projectId) return null;
  return {
    projectId,
    fingerprint: cloud.savedFingerprint,
    version: -1,
    complete: cloud.savedComplete,
    updatedAt: cloud.updatedAt,
    at: cloud.savedAt,
    generation: getSessionGeneration(),
  };
}

/** The draft's record of a save (DraftMeta.cloud), from the chip's. */
export function cloudRecordFromLastSaved(saved: LastSaved): DraftCloudRecord {
  return {
    projectId: saved.projectId,
    updatedAt: saved.updatedAt,
    savedFingerprint: saved.fingerprint,
    savedComplete: saved.complete,
    savedAt: saved.at,
  };
}
