import { create } from 'zustand';

/**
 * Whether the Report a problem dialog is open (ReportProblemHost shows it):
 * '⋯' ▸ Report a problem… and the '?' sheet's footer open it.
 */
interface ReportProblemState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useReportProblemStore = create<ReportProblemState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
