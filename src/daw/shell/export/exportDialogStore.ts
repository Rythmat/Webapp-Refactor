import { create } from 'zustand';
import type { AudioExportFormat, WavBitDepth } from '@/daw/audio/exportAudio';

// ── The Export dialog's state (milestone 2.15) ─────────────────────────────
//
// One dialog, opened from the top bar's Export pill, Project ▾ ▸ Export, a
// track's menu (Export track ▸, with that track chosen) and the command
// palette. The student's choices live here rather than in the dialog, which
// is mounted only while open, so the next export starts from the last one's
// (format, bit depth, range, mastering). Session-only, outside the project
// store: nothing here is saved.

export type ExportTab = 'audio' | 'notation';
/** The whole song, each track as its own file (stems), or one track. */
export type ExportWhat = 'song' | 'stems' | 'track';
export type RangeChoice = 'project' | 'loop' | 'custom';
export type NotationFormat = 'midi' | 'leadsheet' | 'score';

export interface ExportChoices {
  format: AudioExportFormat;
  bitDepth: WavBitDepth;
  range: RangeChoice;
  /** The master chain on the file (Mix's mastering effects). */
  mastering: boolean;
  what: ExportWhat;
  /** With 'track': which one. */
  trackId: string | null;
  /** With 'track', audio: the track without its effects and sends. */
  dry: boolean;
  notation: NotationFormat;
}

export const DEFAULT_EXPORT_CHOICES: ExportChoices = {
  format: 'wav',
  bitDepth: 16,
  range: 'project',
  mastering: true,
  what: 'song',
  trackId: null,
  dry: false,
  notation: 'midi',
};

export interface OpenExport {
  tab?: ExportTab;
  /** Opens on that one track (Export track ▸). */
  trackId?: string;
  dry?: boolean;
  /** Export track ▸ WAV picks WAV. */
  format?: AudioExportFormat;
  notation?: NotationFormat;
}

interface ExportDialogState {
  isOpen: boolean;
  tab: ExportTab;
  choices: ExportChoices;
  open(opts?: OpenExport): void;
  close(): void;
  setTab(tab: ExportTab): void;
  setChoices(patch: Partial<ExportChoices>): void;
}

export const useExportDialogStore = create<ExportDialogState>()((set) => ({
  isOpen: false,
  tab: 'audio',
  choices: DEFAULT_EXPORT_CHOICES,
  open: (opts = {}) =>
    set((s) => {
      const choices = { ...s.choices };
      if (opts.trackId) {
        choices.what = 'track';
        choices.trackId = opts.trackId;
        choices.dry = opts.dry ?? false;
      } else if (choices.what === 'track') {
        // Opened for the song: a track chosen last time isn't assumed.
        choices.what = 'song';
      }
      if (opts.notation) choices.notation = opts.notation;
      if (opts.format) choices.format = opts.format;
      // Audio first, as Soundtrap's opens: what most exports are.
      return { isOpen: true, tab: opts.tab ?? 'audio', choices };
    }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ tab }),
  setChoices: (patch) => set((s) => ({ choices: { ...s.choices, ...patch } })),
}));

/** Opens the Export dialog (the pill, the menus, the palette). */
export function openExport(opts?: OpenExport): void {
  useExportDialogStore.getState().open(opts);
}
