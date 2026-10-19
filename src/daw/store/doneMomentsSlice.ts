import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';

// ── Done moments ────────────────────────────────────────────────────────────
//
// How many times the student has finished each of the things a lesson asks
// for but the project never shows: a count per moment, bumped at the point
// the thing really happened, so a step's check can compare the count with
// the one it armed with (`s.doneMoments.save > armed.doneMoments.save`).
// `save` counts a save to the student's account that the cloud accepted
// (Project ▸ Save, ⌘S, Save As, the save chip's Retry); a save that failed,
// or that another project opening cut short, counts nothing. `exportMidi`
// counts a MIDI file handed to the browser to download (exportProjectMidi:
// Project ▾ ▸ MIDI file, ⇧⌘E, the Export dialog's Notation tab, a track's
// Export track ▸ MIDI file); a project with no notes downloads nothing and
// counts nothing. `exportMusicXml` counts a MusicXML file downloaded from
// the Export dialog's Notation tab or the Score page's own MusicXML button
// (either layout). `exportAudio` counts an audio file rendered and
// downloaded from the Export dialog: the song, the stems or one track (the
// moment lastAudioExportAt marks too). `printScore` and `printLeadSheet`
// count the browser's print dialog opened from the Score page, by the layout
// printed: the Full score's Print / PDF or the Lead sheet's PDF; whether the
// student then prints or cancels is the browser's to know. The counts belong to the page, not the project: they
// start at 0, never go back (a new project or a load leaves them), and are
// never saved, shared or undone (the registry's 'tutorial' session group).

/** The moments counted, in the order the Save and Export lesson meets them. */
export const DONE_MOMENTS = [
  'save',
  'exportMidi',
  'exportMusicXml',
  'exportAudio',
  'printScore',
  'printLeadSheet',
] as const;

export type DoneMoment = (typeof DONE_MOMENTS)[number];

/** How many times each moment has happened on this page. */
export type DoneMoments = Readonly<Record<DoneMoment, number>>;

/** Every count at 0: a fresh page, and the registry's default. */
export function noDoneMoments(): DoneMoments {
  return {
    save: 0,
    exportMidi: 0,
    exportMusicXml: 0,
    exportAudio: 0,
    printScore: 0,
    printLeadSheet: 0,
  };
}

export interface DoneMomentsSlice {
  doneMoments: DoneMoments;
  /** One more of `moment`: call it where the thing has really happened. */
  markDone: (moment: DoneMoment) => void;
}

export const createDoneMomentsSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  DoneMomentsSlice
> = (set) => ({
  doneMoments: noDoneMoments(),
  markDone: (moment) =>
    set((state) => ({
      doneMoments: {
        ...state.doneMoments,
        [moment]: state.doneMoments[moment] + 1,
      },
    })),
});
