import type { CloudSaveState } from '@/daw/commands/cloudSaveStore';
import { formatGroups, stayVerb } from '@/daw/commands/lastSaved';
import type {
  DraftStatus,
  PendingMediaStatus,
} from '@/daw/persistence/drafts/draftStatusStore';
import type { DraftErrorKind } from '@/lib/studio-projects/drafts/types';

// ── What the save chip says (milestone 1.4, spec E13 and section 6) ────────
//
// Pure: the chip's state, label, tooltip and announcement from the cloud
// save, the draft writer, the pending media and the document's version.
// useSaveChipState feeds it; the tests walk its whole table.
//
// Precedence, first match wins:
//   1. opening: the previous view, frozen, while a session opens;
//   2. saving: a cloud save is running;
//   3. error: the cloud save failed (reason 'cloud'), or the draft can't be
//      written on this device (any draft error but a conflict, which the
//      writer resolves itself: reason 'device'). A cloud error's tooltip
//      says the work is on this device only when the device holds all of it;
//      deviceFailing tells Retry to retry the device write too;
//   4. audio-pending: audio couldn't be stored on this device, or its bytes
//      have been only in memory for over a second (the hook holds that
//      second back: it passes pendingInMemory as 0 until then);
//   5. unsaved: a change this page made hasn't reached the draft yet, or
//      there is no draft record at all (nothing is kept on this device, so
//      'Saved on this device' would be untrue);
//   6. saved: the live project is the one last saved, that save held all of
//      it, and the document is what it sent (same version, or the throttled
//      fingerprint check says it matches: undo back to it reads 'Saved');
//   7. local: everything else, a pristine new project included. When the
//      document is what an incomplete save sent, reason 'partial': the
//      account has it, but not all of it (1.5 adds the rest).

export type SaveChipState =
  | 'saved'
  | 'saving'
  | 'unsaved'
  | 'local'
  | 'error'
  | 'audio-pending';

/** Fixed, so the row beside it never moves as the label changes. */
export const SAVE_CHIP_WIDTH_PX = 150;

export interface SaveChipInputs {
  /** An open is in progress (useSessionStore phase waiting..baselining). */
  opening: boolean;
  cloud: Pick<CloudSaveState, 'phase' | 'error' | 'lastSaved'>;
  draft: Pick<DraftStatus, 'draftId' | 'pendingSeq' | 'committedSeq' | 'error'>;
  media: Pick<PendingMediaStatus, 'pendingInMemory' | 'missing'>;
  /** The live session's cloud link. */
  projectId: string | null;
  documentVersion: number;
  /**
   * Whether the document's fingerprint equals lastSaved.fingerprint, at
   * this documentVersion; null when it hasn't been checked (yet).
   */
  matchesLastSaved: boolean | null;
  /**
   * What an incomplete save left out, as plain groups ('chord symbols',
   * 'notation'), for the 'partial' tooltip. Optional.
   */
  gapGroups?: readonly string[] | null;
  /**
   * The incomplete save left audio out (a clip or sampler sample whose
   * upload failed): the account doesn't have it. Optional.
   */
  audioNotUploaded?: boolean;
  /** The save shortcut as this keyboard writes it ('Ctrl+S' or '⌘S'). */
  saveShortcut?: string;
}

export type SaveChipReason = 'cloud' | 'device' | 'partial' | null;

export interface SaveChipView {
  state: SaveChipState;
  label: string;
  /**
   * error: whose failure ('cloud' or 'device'). local: 'partial' when the
   * account holds this document in part. Otherwise null.
   */
  reason: SaveChipReason;
  /** Show the Retry button. */
  retry: boolean;
  tooltip: string;
  /** What the live region says on entering this state; null = nothing. */
  announce: string | null;
  /**
   * The draft can't be written on this device (any draft error but a
   * conflict), whatever the chip shows first: Retry retries it too.
   */
  deviceFailing: boolean;
}

export const SAVE_CHIP_LABELS: Readonly<Record<SaveChipState, string>> = {
  saved: 'Saved',
  saving: 'Saving…',
  unsaved: 'Unsaved',
  local: 'Saved on this device',
  error: "Couldn't save – Retry",
  'audio-pending': 'Audio not saved yet',
};

/** The visible text before the Retry button in the error state. */
export const SAVE_CHIP_ERROR_LEAD = "Couldn't save –";

const DEFAULT_SHORTCUT = 'Ctrl+S (⌘S)';

function view(
  state: SaveChipState,
  tooltip: string,
  reason: SaveChipReason = null,
  deviceFailing = false,
): SaveChipView {
  return {
    deviceFailing,
    state,
    label: SAVE_CHIP_LABELS[state],
    reason,
    retry: state === 'error',
    tooltip,
    announce:
      state === 'saved'
        ? 'Saved'
        : state === 'error'
          ? "Couldn't save"
          : state === 'audio-pending'
            ? 'Audio not saved yet'
            : null,
  };
}

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

/** `text` as a sentence: a capital first, a full stop last. */
function sentence(text: string): string {
  const capital = capitalize(text.trim());
  if (!capital) return '';
  return /[.!?…]$/.test(capital) ? capital : `${capital}.`;
}

/** Draft errors the writer resolves itself (a fork): not a chip error. */
function isDeviceFailure(error: DraftErrorKind | null): boolean {
  return error !== null && error !== 'conflict';
}

/** The device-error tooltip for `error`. */
function deviceErrorTooltip(error: DraftErrorKind, shortcut: string): string {
  switch (error) {
    case 'quota':
      return 'Storage on this device is full. Save to your account, or free space in Projects.';
    case 'unavailable':
    case 'blocked':
      return `Storage on this device isn't available right now. Press ${shortcut} to save to your account.`;
    default:
      // readonly, corrupt, a not-found the writer couldn't re-create.
      return `This draft can't be updated on this device. Press ${shortcut} to save to your account.`;
  }
}

/**
 * 'Chord symbols and notation stay', 'Notation stays': the groups an
 * incomplete save left out, as the start of a sentence, with the save
 * toast's wording (lastSaved.ts) so both say the same thing.
 */
function groupsStay(groups: readonly string[]): string {
  if (groups.length === 0) return '';
  return `${capitalize(formatGroups(groups))} ${stayVerb(groups)}`;
}

/** The chip's view for `inputs`; `previous` is what it shows now. */
export function deriveSaveChip(
  inputs: SaveChipInputs,
  previous: SaveChipView | null = null,
): SaveChipView {
  if (inputs.opening && previous !== null) return previous;

  const { cloud, draft, media, projectId } = inputs;
  const shortcut = inputs.saveShortcut ?? DEFAULT_SHORTCUT;

  if (cloud.phase === 'saving') {
    return view('saving', 'Saving to your account…');
  }

  const deviceFailing = isDeviceFailure(draft.error);

  if (cloud.phase === 'error') {
    const reason =
      sentence(cloud.error?.message ?? '') || "Couldn't save to your account.";
    const deviceOk =
      draft.draftId !== null &&
      !deviceFailing &&
      draft.pendingSeq <= draft.committedSeq &&
      media.missing === 0;
    const device = deviceOk
      ? 'Your work is saved on this device.'
      : draft.error === 'quota'
        ? 'Storage on this device is full too. Free space in Projects.'
        : deviceFailing
          ? "Storage on this device isn't available right now."
          : 'Your latest changes are still being kept on this device.';
    return view('error', `${reason} ${device}`, 'cloud', deviceFailing);
  }

  if (deviceFailing) {
    return view(
      'error',
      deviceErrorTooltip(draft.error!, shortcut),
      'device',
      true,
    );
  }

  if (media.missing > 0 || media.pendingInMemory > 0) {
    return view(
      'audio-pending',
      media.missing > 0
        ? `Some audio couldn't be stored on this device. Press ${shortcut} to save it to your account.`
        : 'Storing your audio on this device…',
    );
  }

  if (draft.pendingSeq > draft.committedSeq) {
    return view(
      'unsaved',
      'Your latest changes are being kept on this device.',
    );
  }

  const saved = cloud.lastSaved;
  const sameProject =
    saved !== null && projectId !== null && saved.projectId === projectId;
  const sameDocument =
    sameProject &&
    (inputs.documentVersion === saved.version ||
      inputs.matchesLastSaved === true);

  if (sameDocument && saved.complete) {
    return view('saved', 'Saved to your account.');
  }

  if (draft.draftId === null) {
    // No draft record: nothing of this session is kept on this device.
    return view(
      'unsaved',
      `Not kept on this device yet. Press ${shortcut} to save to your account.`,
    );
  }

  if (sameDocument) {
    const stay = groupsStay(inputs.gapGroups ?? []);
    const rest = stay ? ` ${stay} on this device until an update.` : '';
    return view(
      'local',
      inputs.audioNotUploaded
        ? `Saved to your account except some audio. Press ${shortcut} to upload it.${rest}`
        : stay
          ? `Saved to your account.${rest}`
          : 'Saved to your account. Some parts stay on this device until an update.',
      'partial',
    );
  }

  return view(
    'local',
    `Saved in this browser. Press ${shortcut} to save to your account.`,
  );
}

/** Whether two views would draw the same chip. */
export function sameSaveChipView(a: SaveChipView, b: SaveChipView): boolean {
  return (
    a.state === b.state &&
    a.label === b.label &&
    a.reason === b.reason &&
    a.retry === b.retry &&
    a.tooltip === b.tooltip &&
    a.announce === b.announce &&
    a.deviceFailing === b.deviceFailing
  );
}
