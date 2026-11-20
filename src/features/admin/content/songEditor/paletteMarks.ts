import type { SongSection } from '@/curriculum/types/songLibrary';
import type { PaletteAction } from '@/daw/components/Score/ScorePalettes';
import {
  fitIntoSystem,
  setBarValue,
  toggleBarFlag,
} from '@/lib/chartEditor/roadmapOps';
import type { BarRef } from '@/lib/chartEditor/selection';

/**
 * The Score's mark palettes, on a song chart (owner, 2026-11-12): the same
 * cells the Studio's Score has, each the chart's own roadmap mark. A chart
 * has no rehearsal marks (its sections are named) and no pages to break,
 * so those two cells are left out.
 */
export const CHART_PALETTE_ACTIONS: ReadonlySet<PaletteAction> = new Set([
  'text.staffText',
  'barline.normal',
  'repeat.start',
  'repeat.end',
  'layout.systemBreak',
  'layout.makeSystem',
  'jump.segno',
  'jump.coda',
  'jump.dc',
  'jump.ds',
  'jump.dcAlCoda',
  'jump.dsAlCoda',
] satisfies PaletteAction[]);

const JUMPS = {
  'jump.dc': 'D.C.',
  'jump.ds': 'D.S.',
  'jump.dcAlCoda': 'D.C. al Coda',
  'jump.dsAlCoda': 'D.S. al Coda',
} as const;

/**
 * A mark cell applied to the picked bars: the new sections and the undo
 * step's name, or null for a cell the chart does not take (staff text is
 * typed, in the bar inspector).
 */
export function applyPaletteMark(
  sections: SongSection[],
  refs: readonly BarRef[],
  action: PaletteAction,
): { sections: SongSection[]; label: string } | null {
  if (refs.length === 0) return null;
  switch (action) {
    case 'repeat.start':
      return {
        sections: toggleBarFlag(sections, refs, 'repeatStart'),
        label: 'Start repeat',
      };
    case 'repeat.end':
      return {
        sections: toggleBarFlag(sections, refs, 'repeatEnd'),
        label: 'End repeat',
      };
    case 'barline.normal': {
      // A plain barline: no repeat sign on either side of the bars.
      const set = new Set(refs.map((r) => `${r.section}.${r.bar}`));
      return {
        sections: sections.map((section, si) => ({
          ...section,
          bars: section.bars.map((bar, bi) => {
            if (!set.has(`${si}.${bi}`)) return bar;
            const next = { ...bar };
            delete next.repeatStart;
            delete next.repeatEnd;
            return next;
          }),
        })),
        label: 'Single barline',
      };
    }
    case 'layout.systemBreak':
      return {
        sections: toggleBarFlag(sections, refs, 'systemBreak'),
        label: 'System break',
      };
    case 'layout.makeSystem':
      return { sections: fitIntoSystem(sections, refs), label: 'Fit to line' };
    case 'jump.segno':
      return {
        sections: toggleBarFlag(sections, refs, 'segno'),
        label: 'Segno',
      };
    case 'jump.coda':
      return { sections: toggleBarFlag(sections, refs, 'coda'), label: 'Coda' };
    case 'jump.dc':
    case 'jump.ds':
    case 'jump.dcAlCoda':
    case 'jump.dsAlCoda':
      return {
        sections: setBarValue(sections, refs, 'jump', JUMPS[action]),
        label: JUMPS[action],
      };
    default:
      return null;
  }
}
