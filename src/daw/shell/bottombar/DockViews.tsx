import { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import { hintText } from '@/daw/shell/help/hintSource';
import { preloadDockTab, preloadInstrumentViews } from '@/daw/shell/lazyParts';
import { useStore } from '@/daw/store';
import {
  AutomationGlyph,
  EditGlyph,
  FxGlyph,
  InstrumentGlyph,
} from '@/daw/ui/icons/frameIcons';
import { PILL_TOGGLE, PillGroup } from '@/daw/ui/Pill';
import { Toggle } from '@/daw/ui/Toggle';
import { dockKindOf } from '../dock/dockTabs';
import {
  activeDockView,
  dockViewApplies,
  dockViewPurpose,
  DOCK_VIEWS,
  type DockView,
  type DockViewId,
} from '../dock/dockViews';

// ── The dock's views (the bottom rail's left pills, 2026-10-21) ─────────────
//
// Instrument · FX and Automation · Edit, icon toggles in two pills, as the
// floating frame's bottom bar has them (dockViews.ts). A press opens the
// view under the timeline and a press on the open one shuts it; Automation
// opens the selected track's lane, which stacks with the dock and follows
// the selection. They are Create's: the dock and the lane live there.

const ICONS: Record<DockViewId, ReactNode> = {
  instrument: <InstrumentGlyph />,
  fx: <FxGlyph />,
  automation: <AutomationGlyph />,
  edit: <EditGlyph />,
};

export const DockViews = memo(function DockViews() {
  const kind = useStore((s) =>
    dockKindOf(s.tracks.find((t) => t.id === s.selectedTrackId)),
  );
  const instrument = useStore(
    (s) => s.tracks.find((t) => t.id === s.selectedTrackId)?.instrument,
  );
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const active = useStore((s) =>
    activeDockView(kind, s.channelStripTab, s.dockMaster),
  );
  const automationOpen = useStore(
    (s) =>
      s.selectedTrackId !== null &&
      s.automationOpenTrackId === s.selectedTrackId,
  );

  // A track's lane follows the selection while it is open, as the dock
  // does; Master's lane stays Master's.
  const lastSelected = useRef(selectedTrackId);
  useEffect(() => {
    if (lastSelected.current === selectedTrackId) return;
    lastSelected.current = selectedTrackId;
    const s = useStore.getState();
    const open = s.automationOpenTrackId;
    if (open === null || open === MASTER_AUTOMATION_ID) return;
    s.setAutomationOpenTrackId(selectedTrackId);
  }, [selectedTrackId]);

  // Each tab's content is its own chunk (1.12a): a pointer over or a focus
  // on its button fetches it, so a press usually finds it there.
  const preload = useCallback(
    (view: DockView) => {
      if (!view.tab) return;
      if (view.tab === 'controls') {
        if (instrument) preloadInstrumentViews([instrument]);
      } else preloadDockTab(view.tab, instrument);
    },
    [instrument],
  );

  const pick = (view: DockView) => {
    const s = useStore.getState();
    if (view.id === 'automation') {
      s.setAutomationOpenTrackId(automationOpen ? null : s.selectedTrackId);
      return;
    }
    if (!view.tab) return;
    // Shutting the dock also gives Master's slot back (uiSlice).
    if (active === view.id) {
      s.setChannelStripTab(null);
      return;
    }
    if (s.dockMaster) s.setDockMaster(false);
    s.setChannelStripTab(view.tab);
  };

  const toggle = (view: DockView) => {
    const on = view.id === 'automation' ? automationOpen : active === view.id;
    const purpose = dockViewPurpose(view.id, kind);
    return (
      <Toggle
        key={view.id}
        label={view.label}
        size="lg"
        tooltipSide="top"
        className={PILL_TOGGLE}
        icon={ICONS[view.id]}
        pressed={on}
        disabled={!dockViewApplies(view.id, kind)}
        onPressedChange={() => pick(view)}
        onPointerEnter={() => preload(view)}
        onFocus={() => preload(view)}
        data-tutorial-id={view.tab ? `chanstrip-tab-${view.tab}` : undefined}
        data-testid={view.tab ? `dock-tab-${view.tab}` : `dock-view-${view.id}`}
        data-hint={hintText(view.label, purpose)}
      />
    );
  };

  return (
    <>
      <PillGroup label="Instrument and effects" data-testid="dock-views-sound">
        {DOCK_VIEWS.slice(0, 2).map(toggle)}
      </PillGroup>
      <PillGroup label="Automation and editing" data-testid="dock-views-edit">
        {DOCK_VIEWS.slice(2).map(toggle)}
      </PillGroup>
    </>
  );
});
