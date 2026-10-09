import { describe, expect, it } from 'vitest';
import type { LastSaved } from '@/daw/commands/cloudSaveStore';
import {
  deriveSaveChip,
  SAVE_CHIP_LABELS,
  sameSaveChipView,
  type SaveChipInputs,
} from '../saveChipModel';

// The chip's whole table (spec section 6): precedence, labels, reasons,
// tooltips and what the live region says.

const SAVED: LastSaved = {
  projectId: 'p1',
  fingerprint: 'h1:0000000000000000',
  version: 10,
  complete: true,
  updatedAt: '2026-10-01T00:00:00.000Z',
  at: 1,
  generation: 1,
};

function inputs(over: Partial<SaveChipInputs> = {}): SaveChipInputs {
  return {
    opening: false,
    cloud: { phase: 'idle', error: null, lastSaved: null },
    draft: { draftId: 'd1', pendingSeq: 3, committedSeq: 3, error: null },
    media: { pendingInMemory: 0, missing: 0 },
    projectId: null,
    documentVersion: 10,
    matchesLastSaved: null,
    saveShortcut: 'Ctrl+S',
    ...over,
  };
}

const savedProject = (over: Partial<SaveChipInputs> = {}) =>
  inputs({
    cloud: { phase: 'idle', error: null, lastSaved: SAVED },
    projectId: 'p1',
    ...over,
  });

describe('deriveSaveChip', () => {
  it('reads local for a pristine new project once its record exists', () => {
    const chip = deriveSaveChip(inputs());
    expect(chip.state).toBe('local');
    expect(chip.label).toBe('Saved on this device');
    expect(chip.reason).toBeNull();
    expect(chip.retry).toBe(false);
    expect(chip.announce).toBeNull();
    expect(chip.tooltip).toBe(
      'Saved in this browser. Press Ctrl+S to save to your account.',
    );
  });

  it('names both shortcuts when the platform is unknown', () => {
    const chip = deriveSaveChip(inputs({ saveShortcut: undefined }));
    expect(chip.tooltip).toContain('Press Ctrl+S (⌘S) to save');
  });

  it('reads saved at the saved version of the saved project', () => {
    const chip = deriveSaveChip(savedProject());
    expect(chip).toMatchObject({
      state: 'saved',
      label: 'Saved',
      reason: null,
      retry: false,
      announce: 'Saved',
    });
  });

  it('reads local after an edit until the fingerprint check says it matches', () => {
    expect(deriveSaveChip(savedProject({ documentVersion: 11 })).state).toBe(
      'local',
    );
    expect(
      deriveSaveChip(
        savedProject({ documentVersion: 11, matchesLastSaved: false }),
      ).state,
    ).toBe('local');
    // Undo back to the snapshot: another version, the same document.
    expect(
      deriveSaveChip(
        savedProject({ documentVersion: 12, matchesLastSaved: true }),
      ).state,
    ).toBe('saved');
  });

  it('reads saved for a draft-restored record (version -1) only by fingerprint', () => {
    const fromDraft = { ...SAVED, version: -1 };
    const base = {
      cloud: { phase: 'idle' as const, error: null, lastSaved: fromDraft },
      projectId: 'p1',
    };
    expect(deriveSaveChip(inputs(base)).state).toBe('local');
    expect(
      deriveSaveChip(inputs({ ...base, matchesLastSaved: true })).state,
    ).toBe('saved');
  });

  it('never reads saved for another project', () => {
    expect(deriveSaveChip(savedProject({ projectId: 'p2' })).state).toBe(
      'local',
    );
    expect(deriveSaveChip(savedProject({ projectId: null })).state).toBe(
      'local',
    );
  });

  it('reads local with reason partial after an incomplete save', () => {
    const partial = { ...SAVED, complete: false };
    const chip = deriveSaveChip(
      savedProject({
        cloud: { phase: 'idle', error: null, lastSaved: partial },
        gapGroups: ['chord symbols', 'notation'],
      }),
    );
    expect(chip).toMatchObject({
      state: 'local',
      label: 'Saved on this device',
      reason: 'partial',
      announce: null,
    });
    expect(chip.tooltip).toBe(
      'Saved to your account. Chord symbols and notation stay on this device until an update.',
    );
    const noGroups = deriveSaveChip(
      savedProject({
        cloud: { phase: 'idle', error: null, lastSaved: partial },
      }),
    );
    expect(noGroups.reason).toBe('partial');
    expect(noGroups.tooltip).toBe(
      'Saved to your account. Some parts stay on this device until an update.',
    );
    // One group named in the singular takes 'stays', as the save toast does.
    const single = (gapGroups: string[]) =>
      deriveSaveChip(
        savedProject({
          cloud: { phase: 'idle', error: null, lastSaved: partial },
          gapGroups,
        }),
      ).tooltip;
    expect(single(['notation'])).toBe(
      'Saved to your account. Notation stays on this device until an update.',
    );
    expect(single(['mode'])).toBe(
      'Saved to your account. Mode stays on this device until an update.',
    );
    expect(single(['markers'])).toBe(
      'Saved to your account. Markers stay on this device until an update.',
    );
    // Audio the save couldn't upload: the tooltip says so, and how to fix it.
    const audio = deriveSaveChip(
      savedProject({
        cloud: { phase: 'idle', error: null, lastSaved: partial },
        audioNotUploaded: true,
      }),
    );
    expect(audio.reason).toBe('partial');
    expect(audio.tooltip).toBe(
      'Saved to your account except some audio. Press Ctrl+S to upload it.',
    );
    expect(
      deriveSaveChip(
        savedProject({
          cloud: { phase: 'idle', error: null, lastSaved: partial },
          audioNotUploaded: true,
          gapGroups: ['notation'],
        }),
      ).tooltip,
    ).toBe(
      'Saved to your account except some audio. Press Ctrl+S to upload it. Notation stays on this device until an update.',
    );
    // Edited since: the account no longer has this document, even in part.
    const edited = deriveSaveChip(
      savedProject({
        cloud: { phase: 'idle', error: null, lastSaved: partial },
        documentVersion: 11,
        matchesLastSaved: false,
      }),
    );
    expect(edited.reason).toBeNull();
  });

  it('reads unsaved while a change has not reached the draft', () => {
    const chip = deriveSaveChip(
      savedProject({
        draft: { draftId: 'd1', pendingSeq: 4, committedSeq: 3, error: null },
      }),
    );
    expect(chip.state).toBe('unsaved');
    expect(chip.label).toBe('Unsaved');
    expect(chip.announce).toBeNull();
  });

  it('reads audio-pending over unsaved, for missing or held-back bytes', () => {
    const pending = {
      draft: { draftId: 'd1', pendingSeq: 4, committedSeq: 3, error: null },
    };
    const missing = deriveSaveChip(
      inputs({ ...pending, media: { pendingInMemory: 0, missing: 2 } }),
    );
    expect(missing).toMatchObject({
      state: 'audio-pending',
      label: 'Audio not saved yet',
      announce: 'Audio not saved yet',
      retry: false,
    });
    expect(missing.tooltip).toContain("couldn't be stored");
    const inMemory = deriveSaveChip(
      inputs({ ...pending, media: { pendingInMemory: 1, missing: 0 } }),
    );
    expect(inMemory.state).toBe('audio-pending');
  });

  it('reads error for a device write failure, with reason device', () => {
    for (const error of ['quota', 'unavailable'] as const) {
      const chip = deriveSaveChip(
        inputs({
          draft: { draftId: 'd1', pendingSeq: 4, committedSeq: 3, error },
          media: { pendingInMemory: 0, missing: 3 },
        }),
      );
      expect(chip).toMatchObject({
        state: 'error',
        reason: 'device',
        retry: true,
        label: "Couldn't save – Retry",
        announce: "Couldn't save",
      });
    }
    expect(
      deriveSaveChip(
        inputs({
          draft: {
            draftId: 'd1',
            pendingSeq: 4,
            committedSeq: 3,
            error: 'quota',
          },
        }),
      ).tooltip,
    ).toBe(
      'Storage on this device is full. Save to your account, or free space in Projects.',
    );
  });

  it('does not treat a conflict as a chip error (the writer forks)', () => {
    const chip = deriveSaveChip(
      inputs({
        draft: {
          draftId: 'd1',
          pendingSeq: 3,
          committedSeq: 3,
          error: 'conflict',
        },
      }),
    );
    expect(chip.state).toBe('local');
    expect(chip.deviceFailing).toBe(false);
  });

  it('reads every other draft error as a device error', () => {
    const tips = {
      'not-found': "This draft can't be updated on this device.",
      blocked: "Storage on this device isn't available right now.",
      readonly: "This draft can't be updated on this device.",
      corrupt: "This draft can't be updated on this device.",
    } as const;
    for (const [error, tip] of Object.entries(tips)) {
      for (const pendingSeq of [3, 9]) {
        const chip = deriveSaveChip(
          inputs({
            draft: {
              draftId: 'd1',
              pendingSeq,
              committedSeq: 3,
              error: error as keyof typeof tips,
            },
          }),
        );
        expect(chip).toMatchObject({
          state: 'error',
          reason: 'device',
          retry: true,
          deviceFailing: true,
        });
        expect(chip.tooltip).toBe(
          `${tip} Press Ctrl+S to save to your account.`,
        );
      }
    }
  });

  it('reads error for a cloud failure, ahead of a device failure', () => {
    const cloudError = {
      phase: 'error' as const,
      error: { kind: 'offline' as const, message: "You're offline" },
      lastSaved: null,
    };
    const ok = deriveSaveChip(inputs({ cloud: cloudError }));
    expect(ok).toMatchObject({
      state: 'error',
      reason: 'cloud',
      retry: true,
      deviceFailing: false,
    });
    expect(ok.tooltip).toBe(
      "You're offline. Your work is saved on this device.",
    );
    const blank = deriveSaveChip(
      inputs({ cloud: { phase: 'error', error: null, lastSaved: null } }),
    );
    expect(blank.tooltip).toBe(
      "Couldn't save to your account. Your work is saved on this device.",
    );
  });

  it('never says the device has the work when it does not, under a cloud error', () => {
    const cloud = {
      phase: 'error' as const,
      error: { kind: 'offline' as const, message: "You're offline" },
      lastSaved: null,
    };
    const quota = deriveSaveChip(
      inputs({
        cloud,
        draft: {
          draftId: 'd1',
          pendingSeq: 9,
          committedSeq: 3,
          error: 'quota',
        },
      }),
    );
    expect(quota).toMatchObject({
      state: 'error',
      reason: 'cloud',
      deviceFailing: true,
    });
    expect(quota.tooltip).not.toContain('saved on this device');
    expect(quota.tooltip).toBe(
      "You're offline. Storage on this device is full too. Free space in Projects.",
    );
    const blocked = deriveSaveChip(
      inputs({
        cloud,
        draft: {
          draftId: 'd1',
          pendingSeq: 3,
          committedSeq: 3,
          error: 'blocked',
        },
      }),
    );
    expect(blocked.deviceFailing).toBe(true);
    expect(blocked.tooltip).not.toContain('saved on this device');
    const pending = deriveSaveChip(
      inputs({
        cloud,
        draft: { draftId: 'd1', pendingSeq: 9, committedSeq: 3, error: null },
      }),
    );
    expect(pending.deviceFailing).toBe(false);
    expect(pending.tooltip).toBe(
      "You're offline. Your latest changes are still being kept on this device.",
    );
    for (const over of [
      { draft: { draftId: null, pendingSeq: 0, committedSeq: 0, error: null } },
      { media: { pendingInMemory: 0, missing: 1 } },
    ]) {
      expect(deriveSaveChip(inputs({ cloud, ...over })).tooltip).not.toContain(
        'saved on this device',
      );
    }
  });

  it('reads unsaved, never local, with no draft record', () => {
    const chip = deriveSaveChip(
      inputs({
        draft: { draftId: null, pendingSeq: 0, committedSeq: 0, error: null },
      }),
    );
    expect(chip.state).toBe('unsaved');
    expect(chip.tooltip).toBe(
      'Not kept on this device yet. Press Ctrl+S to save to your account.',
    );
    // An incomplete save without a record: not 'Saved on this device'.
    expect(
      deriveSaveChip(
        savedProject({
          cloud: {
            phase: 'idle',
            error: null,
            lastSaved: { ...SAVED, complete: false },
          },
          draft: {
            draftId: null,
            pendingSeq: 0,
            committedSeq: 0,
            error: null,
          },
        }),
      ).state,
    ).toBe('unsaved');
    // The account holds all of it: Saved is true with or without a record.
    expect(
      deriveSaveChip(
        savedProject({
          draft: {
            draftId: null,
            pendingSeq: 0,
            committedSeq: 0,
            error: null,
          },
        }),
      ).state,
    ).toBe('saved');
  });

  it('reads saving over everything else', () => {
    const chip = deriveSaveChip(
      inputs({
        cloud: {
          phase: 'saving',
          error: { kind: 'server', message: 'x' },
          lastSaved: SAVED,
        },
        draft: {
          draftId: 'd1',
          pendingSeq: 9,
          committedSeq: 3,
          error: 'quota',
        },
        media: { pendingInMemory: 2, missing: 2 },
      }),
    );
    expect(chip).toMatchObject({
      state: 'saving',
      label: 'Saving…',
      announce: null,
      retry: false,
    });
  });

  it('freezes the previous view while a session opens', () => {
    const before = deriveSaveChip(savedProject());
    const during = deriveSaveChip(
      inputs({
        opening: true,
        cloud: { phase: 'saving', error: null, lastSaved: null },
      }),
      before,
    );
    expect(during).toBe(before);
    // Nothing shown yet: derive as usual.
    expect(deriveSaveChip(inputs({ opening: true })).state).toBe('local');
  });

  it('labels every state with the spec copy', () => {
    expect(SAVE_CHIP_LABELS).toEqual({
      saved: 'Saved',
      saving: 'Saving…',
      unsaved: 'Unsaved',
      local: 'Saved on this device',
      error: "Couldn't save – Retry",
      'audio-pending': 'Audio not saved yet',
    });
  });

  it('compares views by content', () => {
    const a = deriveSaveChip(savedProject());
    const b = deriveSaveChip(
      savedProject({ documentVersion: 12, matchesLastSaved: true }),
    );
    expect(a).not.toBe(b);
    expect(sameSaveChipView(a, b)).toBe(true);
    expect(sameSaveChipView(a, deriveSaveChip(inputs()))).toBe(false);
  });
});
