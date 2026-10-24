import { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
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
  dockViewFillsPair,
  dockViewLabel,
  dockViewShown,
  dockViewAppliesToMaster,
  dockViewPurpose,
  DOCK_VIEWS,
  type DockView,
  type DockViewId,
} from '../dock/dockViews';

// ── The dock's views (the bottom rail's left pills, 2026-10-21) ─────────────
//
// Instrument · FX and Edit · Automation, icon toggles in two pills, as the
// floating frame's bottom bar has them (dockViews.ts). A press opens the
// view in the dock and a press on the open one shuts it. Automation opens
// the selected track's lane in the dock (Master's while the dock shows
// Master), which follows the selection; another view takes the dock back
// from it. While the dock shows Master, FX (its effects) and Automation
// are its views and Instrument and Edit are off (owner, 2026-10-22). They
// are Create's: the dock lives there.

const ICONS: Record<DockViewId, ReactNode> = {
  instrument: <InstrumentGlyph />,
  fx: <FxGlyph />,
  automation: <AutomationGlyph />,
  edit: <EditGlyph />,
};

/**
 * The Instrument and FX buttons side by side: two 36 px toggles (Toggle's
 * lg: a 16 px icon, 10 px either side) and the pill's 2 px gap.
 */
const PAIR_WIDTH = 'w-[74px]';

export const DockViews = memo(function DockViews() {
  const kind = useStore((s) =>
    dockKindOf(s.tracks.find((t) => t.id === s.selectedTrackId)),
  );
  const instrument = useStore(
    (s) => s.tracks.find((t) => t.id === s.selectedTrackId)?.instrument,
  );
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  // The automation lane shows in the dock over the tab while it is open
  // (the selected track's, or Master's while the dock shows Master).
  const automationOpen = useStore((s) => s.automationOpenTrackId !== null);
  const master = useStore((s) => s.dockMaster);
  const active = useStore((s) =>
    s.automationOpenTrackId !== null
      ? null
      : activeDockView(kind, s.channelStripTab, s.dockMaster),
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
      // Master's lane while the dock shows Master, else the track's.
      s.setAutomationOpenTrackId(
        automationOpen
          ? null
          : s.dockMaster
            ? MASTER_AUTOMATION_ID
            : s.selectedTrackId,
      );
      return;
    }
    if (!view.tab) return;
    // Another view takes the dock back from the automation lane: Master's
    // FX from Master's lane, else the track's view.
    if (s.automationOpenTrackId !== null) {
      s.setAutomationOpenTrackId(null);
      if (s.dockMaster && view.id === 'fx') return;
      if (s.dockMaster) s.setDockMaster(false);
      s.setChannelStripTab(view.tab);
      return;
    }
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
    const purpose = dockViewPurpose(view.id, kind, master);
    const label = dockViewLabel(view, kind);
    // A track's one sound button, as wide as the pair it stands for, so the
    // rail keeps its shape from track to track (owner, 2026-10-22): an
    // Audio track's Instrument (its input and FX in one dock), and Master's
    // or an uploaded file's FX (they have no instrument).
    const combined = dockViewFillsPair(view.id, kind, master);
    return (
      <Toggle
        key={view.id}
        label={label}
        size="lg"
        tooltipSide="top"
        className={cn(PILL_TOGGLE, combined && PAIR_WIDTH)}
        // The wide button is the Effects icon on every track that has one
        // (owner, 2026-10-22: an Audio track's too, where the amp was).
        icon={combined ? ICONS.fx : ICONS[view.id]}
        pressed={on}
        // While the dock shows Master: its FX and Automation, as a track's.
        disabled={
          master
            ? !dockViewAppliesToMaster(view.id)
            : !dockViewApplies(view.id, kind)
        }
        onPressedChange={() => pick(view)}
        onPointerEnter={() => preload(view)}
        onFocus={() => preload(view)}
        data-tutorial-id={view.tab ? `chanstrip-tab-${view.tab}` : undefined}
        data-testid={view.tab ? `dock-tab-${view.tab}` : `dock-view-${view.id}`}
        data-hint={hintText(label, purpose)}
      />
    );
  };

  return (
    <>
      <PillGroup label="Instrument and effects" data-testid="dock-views-sound">
        {DOCK_VIEWS.slice(0, 2)
          .filter((view) => dockViewShown(view.id, kind, master))
          .map(toggle)}
      </PillGroup>
      <PillGroup label="Editing and automation" data-testid="dock-views-edit">
        {DOCK_VIEWS.slice(2).map(toggle)}
      </PillGroup>
    </>
  );
});
