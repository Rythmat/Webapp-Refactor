import { create, type StoreApi, type UseBoundStore } from 'zustand';

// ── Whether the Projects dialog is open (milestone 1.4) ────────────────────
//
// File ▸ Open…, the kept-work toast's View, '?projects=1' and openSession's
// deps open it; ProjectsDialogHost renders it. Each opening starts sorted by
// recent work unless the caller asks for size (the storage-full path), and
// may name a draft to scroll to.

export interface ProjectsDialogState {
  open: boolean;
  sortBy: 'recent' | 'size';
  focusDraftId: string | null;
  openDialog(opts?: {
    sortBy?: 'recent' | 'size';
    focusDraftId?: string;
  }): void;
  close(): void;
}

export const useProjectsDialogStore: UseBoundStore<
  StoreApi<ProjectsDialogState>
> = create<ProjectsDialogState>()((set) => ({
  open: false,
  sortBy: 'recent',
  focusDraftId: null,
  openDialog: (opts) =>
    set({
      open: true,
      sortBy: opts?.sortBy ?? 'recent',
      focusDraftId: opts?.focusDraftId ?? null,
    }),
  close: () => set({ open: false, focusDraftId: null }),
}));
