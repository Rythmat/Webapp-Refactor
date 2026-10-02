import { RotateCcw, Settings, Wand2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import type { ColorGroup } from './model/colorGroups';
import { DisplaySection } from './settings/DisplaySection';
import { FiltersSection } from './settings/FiltersSection';
import { ForcesSection } from './settings/ForcesSection';
import { GroupsSection, type GroupQueryError } from './settings/GroupsSection';
import {
  PanelIconButton,
  SETTINGS_SECTIONS,
  SettingSection,
  type GraphMode,
  type GraphPanelSettings,
  type GraphSettingsPatch,
  type SettingsSectionId,
} from './settings/SettingControls';

export type {
  GraphDisplaySettings,
  GraphFilterSettings,
  GraphForceSettings,
  GraphMode,
  GraphPanelSettings,
  GraphSettingsPatch,
  SettingsSectionId,
} from './settings/SettingControls';
export type { GroupQueryError } from './settings/GroupsSection';

/**
 * Cortex's settings panel, built to look and behave like Obsidian's graph
 * controls.
 *
 * It floats over the top-right corner of the graph, 12 px in. Closed, it is
 * a gear ("Open graph settings") and, in the global graph only, a wand that
 * starts the timelapse, on the graph's own background (the app's) with no
 * frame. Open, it is a 240 px card with an 8 px radius and a 1 px border,
 * in the console's own raised surface and hairline where Obsidian has its
 * #262626 and #3f3f3f, holding four collapsible sections
 * (Filters, Groups, Display, Forces) under a close button and "Restore
 * default settings". Like Obsidian it starts closed with every section
 * collapsed, and it scrolls inside itself, without a scrollbar, when it is
 * taller than the graph.
 *
 * The panel is controlled: it shows the settings, groups, counts and query
 * errors it is given for the current mode and reports every change. Whether
 * it is open and which sections are collapsed it keeps itself, unless the
 * parent passes `open` or `collapsed` (to restore them from storage), in
 * which case those win and the callbacks report each change.
 *
 * Wheel events stop at the panel, so scrolling it never zooms the graph
 * beneath. Key presses are not stopped (that would also silence the app's
 * own shortcuts); the graph's key handler should ignore keys typed inside
 * an element marked `data-graph-settings`, as it does for any text field.
 */
export interface GraphSettingsPanelProps {
  /** The global graph, or a local graph around one item. */
  mode: GraphMode;
  /** The current mode's settings. */
  settings: GraphPanelSettings;
  /** The colour groups, shared by both modes. */
  groups: readonly ColorGroup[];
  /** How many drawn items each group colours, by index. */
  groupCounts?: readonly (number | null | undefined)[];
  /** Each group's query error, by index. */
  queryErrors?: readonly GroupQueryError[];
  /** A setting changed; the patch holds only what changed. */
  onChange: (patch: GraphSettingsPatch) => void;
  /** The groups were edited, added to, deleted from or reordered. */
  onGroupsChange: (groups: ColorGroup[]) => void;
  /** A group row is pointed at (light that group), or none is. */
  onGroupHover: (index: number | null) => void;
  /** Reset this mode's filters, display and forces, and the groups. */
  onRestoreDefaults: () => void;
  /** Start the timelapse (global graph only). */
  onAnimate?: () => void;
  /** The timelapse cannot play now, e.g. under reduced motion. */
  animateDisabled?: boolean;
  /** Whether the panel is open; when given, it wins over the panel's own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Which sections are collapsed; when given, it wins over the panel's own state. */
  collapsed?: Partial<Record<SettingsSectionId, boolean>>;
  onCollapsedChange?: (collapsed: Record<SettingsSectionId, boolean>) => void;
  /**
   * The local graph's depth, when the page keeps it somewhere other than
   * the settings: the Mind Map keeps it in the URL (`?depth=`), so a shared
   * link opens at the depth it was copied at. Given, the Depth slider shows
   * this and reports moves through `onDepthChange` only, never through
   * `onChange`, so the stored settings' depth never competes with the URL.
   */
  depth?: number;
  /** The Depth slider moved (local graph), when `depth` is passed. */
  onDepthChange?: (depth: number) => void;
  /**
   * Position the panel in the top-right corner of its positioned parent,
   * 12 px in, above the other things floating there (the default). This is
   * how the Mind Map's shell expects it: the shell's stage is that parent.
   * Pass false only when a parent places it and gives it a definite height.
   */
  floating?: boolean;
  className?: string;
}

/** Obsidian's starting state: every section collapsed. */
const ALL_COLLAPSED: Readonly<Record<SettingsSectionId, boolean>> = {
  filters: true,
  groups: true,
  display: true,
  forces: true,
};

const SECTION_TITLES: Readonly<Record<SettingsSectionId, string>> = {
  filters: 'Filters',
  groups: 'Groups',
  display: 'Display',
  forces: 'Forces',
};

export function GraphSettingsPanel({
  mode,
  settings,
  groups,
  groupCounts,
  queryErrors,
  onChange,
  onGroupsChange,
  onGroupHover,
  onRestoreDefaults,
  onAnimate,
  animateDisabled = false,
  open,
  onOpenChange,
  collapsed,
  onCollapsedChange,
  depth,
  onDepthChange,
  floating = true,
  className,
}: GraphSettingsPanelProps) {
  const [openState, setOpenState] = useState(open ?? false);
  const isOpen = open ?? openState;
  const [collapsedState, setCollapsedState] = useState<
    Record<SettingsSectionId, boolean>
  >(() => ({ ...ALL_COLLAPSED, ...collapsed }));
  const sections: Record<SettingsSectionId, boolean> = {
    ...collapsedState,
    ...collapsed,
  };

  const rootRef = useRef<HTMLElement | null>(null);
  const setRoot = (el: HTMLElement | null) => {
    rootRef.current = el;
  };
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  /** Set when the panel is opened or closed from its own buttons. */
  const moveFocus = useRef(false);

  const setOpen = (next: boolean) => {
    moveFocus.current = true;
    setOpenState(next);
    onOpenChange?.(next);
  };

  // Opening from the gear puts focus on the close button, the first thing
  // in the card; closing puts it back on the gear, so the keyboard never
  // falls out of the panel.
  useLayoutEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (isOpen ? closeButtonRef : openButtonRef).current?.focus();
  }, [isOpen]);

  // Scrolling the panel must not zoom the graph under it. A native listener
  // is used because the graph listens natively on an ancestor, which a
  // React handler here would reach too late to stop.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const stop = (event: WheelEvent) => event.stopPropagation();
    root.addEventListener('wheel', stop, { passive: true });
    return () => root.removeEventListener('wheel', stop);
  }, [isOpen]);

  const setSectionOpen = (id: SettingsSectionId, sectionOpen: boolean) => {
    const next = { ...sections, [id]: !sectionOpen };
    setCollapsedState(next);
    onCollapsedChange?.(next);
  };

  const sectionBody = (id: SettingsSectionId) => {
    switch (id) {
      case 'filters':
        return (
          <FiltersSection
            // A fresh field per mode, so the global search never shows in a
            // local graph's box or the other way round.
            key={mode}
            mode={mode}
            filters={settings.filters}
            onChange={(filters) => onChange({ filters })}
            depth={depth}
            onDepthChange={onDepthChange}
          />
        );
      case 'groups':
        return (
          <GroupsSection
            groups={groups}
            counts={groupCounts}
            errors={queryErrors}
            onGroupsChange={onGroupsChange}
            onGroupHover={onGroupHover}
          />
        );
      case 'display':
        return (
          <DisplaySection
            mode={mode}
            display={settings.display}
            onChange={(display) => onChange({ display })}
            onAnimate={onAnimate}
            animateDisabled={animateDisabled}
          />
        );
      case 'forces':
        return (
          <ForcesSection
            forces={settings.forces}
            onChange={(forces) => onChange({ forces })}
          />
        );
    }
  };

  const global = mode === 'global';
  // Floating, the panel's containing block is the graph's stage itself, so
  // the open card's height limit is the stage's height less the 12 px inset
  // above and below. Not floating, the parent must give it a definite
  // height for `max-h-full` to mean anything.
  const position = floating
    ? 'absolute right-3 top-3 z-30'
    : 'relative pointer-events-auto';
  const maxHeight = floating ? 'max-h-[calc(100%-24px)]' : 'max-h-full';

  if (!isOpen) {
    return (
      <div
        ref={setRoot}
        data-graph-settings="closed"
        className={cn(
          position,
          // As wide as its buttons, never the width of a parent box, so it
          // covers no more of the graph than the gear and the wand.
          'flex w-fit flex-col items-center gap-2 rounded-lg border border-transparent bg-[hsl(var(--ui-background))] p-1.5',
          className,
        )}
      >
        <PanelIconButton
          ref={openButtonRef}
          aria-label="Open graph settings"
          onClick={() => setOpen(true)}
        >
          <Settings aria-hidden />
        </PanelIconButton>
        {global ? (
          <PanelIconButton
            aria-label="Start timelapse animation"
            onClick={onAnimate}
            disabled={animateDisabled || !onAnimate}
          >
            <Wand2 aria-hidden />
          </PanelIconButton>
        ) : null}
      </div>
    );
  }

  return (
    <section
      ref={setRoot}
      aria-label="Graph settings"
      data-graph-settings="open"
      className={cn(
        position,
        maxHeight,
        'w-[240px] overflow-y-auto rounded-lg border border-border bg-popover text-[13px] text-foreground',
        'shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3.4px_6.7px_rgba(0,0,0,0.18),0_15px_30px_rgba(0,0,0,0.3)]',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <PanelIconButton
        aria-label="Restore default settings"
        onClick={onRestoreDefaults}
        className="absolute right-9 top-1.5 z-[1] [&>svg]:size-4"
      >
        <RotateCcw aria-hidden />
      </PanelIconButton>
      <PanelIconButton
        ref={closeButtonRef}
        aria-label="Close graph settings"
        title="Close"
        onClick={() => setOpen(false)}
        className="absolute right-2 top-1.5 z-[1] [&>svg]:size-4"
      >
        <X aria-hidden />
      </PanelIconButton>
      {SETTINGS_SECTIONS.map((id) => (
        <SettingSection
          key={id}
          id={id}
          title={SECTION_TITLES[id]}
          open={!sections[id]}
          onOpenChange={(sectionOpen) => setSectionOpen(id, sectionOpen)}
        >
          {sectionBody(id)}
        </SettingSection>
      ))}
    </section>
  );
}
