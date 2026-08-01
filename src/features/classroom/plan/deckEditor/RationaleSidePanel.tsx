/**
 * RationaleSidePanel — the docked, collapsible teacher-only panel beside the
 * canvas. Follows the selected slide: shows that slide's Question editor (for
 * interaction slides) and the phase's pedagogy via the reused `RationaleEditor`
 * (+ the Activity Bank). Everything here writes to `cells[phase]` — never to a
 * slide's student-visible fields — so the firewall is preserved.
 */
import { Lock, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import type { Activity } from '../../content/types';
import type { Slide } from '../../slides/types';
import type { CellRationale, Interaction } from '../../types';
import { ActivityBankPicker } from '../ActivityBankPicker';
import { RationaleEditor } from '../RationaleEditor';
import { SlideInteractionPanel } from './SlideInteractionPanel';

interface RationaleSidePanelProps {
  slide: Slide;
  phaseFullName: string;
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
        className="flex w-10 shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-4 text-white/50 transition-colors hover:text-white"
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
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-white/70">
          <Lock className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider">Teacher-only</span>
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

      {slide.kind === 'interaction' && (
        <SlideInteractionPanel
          interactions={slideInteractions}
          onChange={onInteractionsChange}
        />
      )}

      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
        <span className="text-[11px] text-white/40">
          Pedagogy applies to all {phaseFullName} slides — it never reaches
          students.
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
