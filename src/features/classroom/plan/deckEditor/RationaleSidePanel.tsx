/**
 * RationaleSidePanel — the editor's Inspector, docked and collapsible beside
 * the canvas, in two tabs. Slide: the selected slide's section (moving it),
 * its Question editor (interaction slides) or app link (app-route slides).
 * Notes: the phase's pedagogy via the reused `RationaleEditor` (+ the
 * Activity Bank). Everything here writes to `cells[phase]` — never to a
 * slide's student-visible fields — so the firewall is preserved.
 */
import { Library, Lock, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState } from 'react';
import { MicroLabel } from '@/components/kit';
import { Button } from '@/daw/ui/Button';
import { IconButton } from '@/daw/ui/IconButton';
import { Select } from '@/daw/ui/Select';
import { Tab, TabList, TabPanel, Tabs } from '@/daw/ui/Tabs';
import type { Activity } from '../../content/types';
import {
  SECTIONS,
  SECTION_HINT,
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
  const [tab, setTab] = useState<'slide' | 'notes'>('slide');

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex w-10 shrink-0 flex-col items-center gap-2 rounded-[var(--daw-radius-lg)] border border-white/[0.06] bg-white/[0.03] py-4 text-daw-text-3 transition-colors hover:text-daw-text"
        aria-label="Open the Inspector"
      >
        <PanelRightOpen className="h-4 w-4" />
        <span
          className="text-[0.6875rem] font-bold uppercase tracking-[0.08em]"
          style={{ writingMode: 'vertical-rl' }}
        >
          Inspector
        </span>
      </button>
    );
  }

  return (
    // The Office's Inspector beside the canvas: the selected slide's own
    // settings, then the teacher's notes for its phase.
    <aside
      aria-label="Inspector"
      className="flex w-80 shrink-0 flex-col overflow-hidden rounded-[var(--daw-radius-lg)] border border-white/[0.06] bg-white/[0.03]"
    >
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v === 'notes' ? 'notes' : 'slide')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-daw-hairline px-3">
          <TabList aria-label="Inspector">
            <Tab value="slide">Slide</Tab>
            <Tab value="notes" className="gap-1">
              <Lock aria-hidden className="size-3" />
              Notes
            </Tab>
          </TabList>
          <IconButton
            label="Collapse the Inspector"
            icon={<PanelRightClose aria-hidden />}
            variant="ghost"
            onClick={onToggleCollapsed}
          />
        </div>

        <TabPanel
          value="slide"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 data-[state=inactive]:hidden [&>*]:shrink-0"
        >
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
            <p className="text-[0.75rem] leading-snug text-daw-text-3">
              {SECTION_HINT[sectionOf(slide)]}. Moving a slide carries its
              questions with it.
            </p>
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

          {slide.kind !== 'interaction' && slide.kind !== 'app-route' && (
            <p className="text-[0.8125rem] leading-snug text-daw-text-3">
              Edit this slide's words on the canvas. Its look and layout are
              under the palette at the canvas's top right; links into the app
              come from Choose content.
            </p>
          )}
        </TabPanel>

        <TabPanel
          value="notes"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 data-[state=inactive]:hidden [&>*]:shrink-0"
        >
          <p className="text-[0.75rem] leading-snug text-daw-text-3">
            Never shown to students. These notes cover every {phaseFullName}{' '}
            slide.
          </p>
          <RationaleEditor rationale={rationale} onChange={onRationaleChange} />
          <Button
            variant="secondary"
            className="w-fit"
            onClick={() => setPickerOpen(true)}
          >
            <Library aria-hidden />
            Activity Bank
          </Button>
        </TabPanel>
      </Tabs>

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
