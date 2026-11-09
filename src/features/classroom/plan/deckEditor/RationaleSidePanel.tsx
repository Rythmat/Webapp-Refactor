/**
 * RationaleSidePanel — the docked, collapsible teacher-only panel beside the
 * canvas. Follows the selected slide: shows that slide's Question editor (for
 * interaction slides) and the phase's pedagogy via the reused `RationaleEditor`
 * (+ the Activity Bank). Everything here writes to `cells[phase]` — never to a
 * slide's student-visible fields — so the firewall is preserved.
 */
import { Lock, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import { MicroLabel } from '@/components/kit';
import { Select } from '@/daw/ui';
import type { Activity } from '../../content/types';
import {
  SECTIONS,
  SECTION_LABEL,
  isSlideSection,
  sectionNumber,
  sectionOf,
  type SlideSection,
} from '../../slides/sections';
import type { Slide } from '../../slides/types';
import type { CellRationale, Interaction } from '../../types';
import { ActivityBankPicker } from '../ActivityBankPicker';
import { RationaleEditor } from '../RationaleEditor';
import { AppRoutePanel } from './AppRoutePanel';
import { SlideInteractionPanel } from './SlideInteractionPanel';

interface RationaleSidePanelProps {
  slide: Slide;
  /** The sections these notes cover ("Connect & Showcase"). */
  phaseFullName: string;
  /** Move the slide to another section (Connect … Reflect). */
  onSectionChange?: (section: SlideSection) => void;
  rationale: CellRationale;
  onRationaleChange: (r: CellRationale) => void;
  slideInteractions: Interaction[];
  onInteractionsChange: (i: Interaction[]) => void;
  onInsertActivity: (activity: Activity) => void;
  activityAddedIds: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const RationaleSidePanel = ({
  slide,
  phaseFullName,
  onSectionChange,
  rationale,
  onRationaleChange,
  slideInteractions,
  onInteractionsChange,
  onInsertActivity,
  activityAddedIds,
  collapsed,
  onToggleCollapsed,
}: RationaleSidePanelProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex w-10 shrink-0 flex-col items-center gap-2 rounded-[var(--daw-radius-lg)] border border-white/[0.06] bg-white/[0.03] py-4 text-daw-text-3 transition-colors hover:text-daw-text"
        aria-label="Open teacher notes"
      >
        <PanelRightOpen className="h-4 w-4" />
        <span
          className="text-xs uppercase tracking-wider"
          style={{ writingMode: 'vertical-rl' }}
        >
          Teacher notes
        </span>
      </button>
    );
  }

  return (
    // Drawn as the Office's Inspector card: a titled column beside the canvas.
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto rounded-[var(--daw-radius-lg)] border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="-mx-4 -mt-4 flex h-10 items-center justify-between gap-2 border-b border-daw-hairline px-4">
        <div className="flex items-center gap-2 text-daw-text">
          <Lock className="h-3.5 w-3.5 text-daw-text-3" />
          <span className="text-[0.875rem] font-bold">Teacher notes</span>
          <span className="text-[0.75rem] text-daw-text-3">
            never shown to students
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label="Collapse teacher notes"
          className="rounded-full p-1 text-white/40 hover:bg-white/5 hover:text-white"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <MicroLabel>Section</MicroLabel>
        <Select
          label="Section"
          value={sectionOf(slide)}
          disabled={!onSectionChange}
          onValueChange={(v) => isSlideSection(v) && onSectionChange?.(v)}
          options={SECTIONS.map((s) => ({
            value: s,
            label: `${sectionNumber(s)} · ${SECTION_LABEL[s].en}`,
          }))}
        />
      </div>

      {slide.kind === 'interaction' && (
        <SlideInteractionPanel
          interactions={slideInteractions}
          onChange={onInteractionsChange}
        />
      )}

      {slide.kind === 'app-route' && (
        <AppRoutePanel
          interactions={slideInteractions}
          onChange={onInteractionsChange}
        />
      )}

      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
        <span className="text-[0.75rem] text-daw-text-3">
          These notes cover every {phaseFullName} slide. Students never see
          them.
        </span>
        <RationaleEditor rationale={rationale} onChange={onRationaleChange} />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white"
        >
          Activity Bank
        </button>
      </div>

      {pickerOpen && (
        <ActivityBankPicker
          phase={slide.phase}
          addedIds={activityAddedIds}
          onInsert={onInsertActivity}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </aside>
  );
};
