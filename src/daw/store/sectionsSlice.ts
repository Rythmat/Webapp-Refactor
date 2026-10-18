import type { StateCreator } from 'zustand';
import {
  appendSection,
  markSectionAtBar as markAtBar,
  marksOfSections,
  normalizeSections,
  removeSectionAtBar as removeAtBar,
  resizeSectionEdge,
  type SectionMark,
  type SectionType,
  type SongSection,
} from '@/daw/model/sections';
import type { ArrangementPatch } from '@/daw/time/arrangementEdits';
import { chartBarCount } from '@/daw/time/measureEdits';
import { timeSignatureOf } from '@/daw/time/timeModel';
import type { AllSlices } from './index';

// ── Sections Slice (milestone 2.13) ─────────────────────────────────────
// The song's sections (model/sections.ts): the sections lane above the
// ruler, and the Lead Sheet's section marks, which read the same list. Kept
// in order and never overlapping: every write goes through the model.

export interface SectionsSlice {
  sections: SongSection[];
  setSections: (sections: SongSection[]) => void;
  /** A new section after the last one, 8 bars long; returns its id. */
  addSection: (input: { type: SectionType; label: string }) => string;
  updateSection: (id: string, patch: Partial<Omit<SongSection, 'id'>>) => void;
  /** Drags one edge to the nearest bar line (resizeSectionEdge). */
  resizeSection: (id: string, edge: 'start' | 'end', tick: number) => void;
  /** Deletes the section; its bars and their clips stay. */
  removeSection: (id: string) => void;
  /** The Lead Sheet's "+ Section", rename and paste at a bar. */
  markSectionAtBar: (measureIdx: number, label: string) => void;
  /** The Lead Sheet's "− Section" at a bar. */
  removeSectionAtBar: (measureIdx: number) => void;
  /**
   * Writes a whole-song edit (time/arrangementEdits.ts: Duplicate and
   * Insert section) in one write. It goes through the slice's `set`, so a
   * shared session gets it as one update and one undo step, as it does
   * every other slice action; the store's raw setState would skip the
   * room.
   */
  applyArrangementPatch: (patch: ArrangementPatch) => void;
}

export const createSectionsSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  SectionsSlice
> = (set, get) => ({
  sections: [],

  setSections: (sections) => set({ sections: normalizeSections(sections) }),

  addSection: (input) => {
    const { sections, section } = appendSection(
      get().sections,
      input,
      timeSignatureOf(get()),
    );
    set({ sections });
    return section.id;
  },

  updateSection: (id, patch) =>
    set((s) =>
      s.sections.some((section) => section.id === id)
        ? {
            sections: normalizeSections(
              s.sections.map((section) =>
                section.id === id ? { ...section, ...patch, id } : section,
              ),
            ),
          }
        : s,
    ),

  resizeSection: (id, edge, tick) =>
    set((s) => {
      const sections = resizeSectionEdge(
        s.sections,
        id,
        edge,
        tick,
        timeSignatureOf(s),
      );
      return sections === s.sections ? s : { sections };
    }),

  removeSection: (id) =>
    set((s) =>
      s.sections.some((section) => section.id === id)
        ? { sections: s.sections.filter((section) => section.id !== id) }
        : s,
    ),

  markSectionAtBar: (measureIdx, label) =>
    set((s) => {
      const ts = timeSignatureOf(s);
      const sections = markAtBar(
        s.sections,
        measureIdx,
        label,
        ts,
        chartBarCount(s.chordRegions, s.leadSheetBars, ts, s.sections),
      );
      return sections === s.sections ? s : { sections };
    }),

  removeSectionAtBar: (measureIdx) =>
    set((s) => {
      const sections = removeAtBar(s.sections, measureIdx, timeSignatureOf(s));
      return sections === s.sections ? s : { sections };
    }),

  applyArrangementPatch: (patch) => set(patch),
});

// ── The Lead Sheet's view ────────────────────────────────────────────────

const marksKept = new WeakMap<
  readonly SongSection[],
  { numerator: number; denominator: number; marks: SectionMark[] }
>();

/**
 * The sections as the Lead Sheet marks them (marksOfSections), kept per
 * list and metre, so a selector returns the same array until either
 * changes.
 */
export function leadSheetSectionsOf(
  state: Pick<
    AllSlices,
    'sections' | 'timeSignatureNumerator' | 'timeSignatureDenominator'
  >,
): SectionMark[] {
  const kept = marksKept.get(state.sections);
  if (
    kept &&
    kept.numerator === state.timeSignatureNumerator &&
    kept.denominator === state.timeSignatureDenominator
  ) {
    return kept.marks;
  }
  const marks = marksOfSections(state.sections, timeSignatureOf(state));
  marksKept.set(state.sections, {
    numerator: state.timeSignatureNumerator,
    denominator: state.timeSignatureDenominator,
    marks,
  });
  return marks;
}
