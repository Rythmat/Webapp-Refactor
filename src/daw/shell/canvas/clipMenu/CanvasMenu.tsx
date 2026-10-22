import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileRoutes } from '@/constants/routes';
import { useIsPremium } from '@/hooks/useIsPremium';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useStore } from '@/daw/store';
import { semitoneCount, transposeWords } from '@/daw/harmony/intervalName';
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@/daw/ui/Menu';
import { PremiumBadge } from '@/daw/ui/PremiumBadge';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { cn } from '@/components/utilities';
import {
  useCanvasMenuStore,
  type CanvasMenuRequest,
  type CanvasMenuTarget,
} from './canvasMenuStore';
import {
  canvasMenuModel,
  type MenuEntry,
  type MenuItemModel,
} from './clipMenuModel';
import { runCanvasMenuItem } from './runCanvasMenuItem';

// ── The Create canvas's one menu (milestone 2.12) ──────────────────────────
//
// Rendered once, beside the Timeline. Every way in opens this same menu
// through canvasMenuStore: a right-click hangs it at the pointer, the Edit
// pill under itself, and a key (clip.menu) under the selected clip's pill.
// It is a drop-down menu on a trigger that stands where it should hang, so
// arrow keys, typing to jump, Enter and Escape work as in every other menu,
// and focus goes back to the pill it was opened from. Its lesson anchor is
// clip-menu (what it is for is data-menu-target), each item's
// clip-menu-<item id> (clip-menu-duplicate, clip-menu-paste …).

const TITLE: Record<CanvasMenuTarget['kind'], string> = {
  clip: 'Clip',
  lane: 'Track lane',
  marker: 'Marker',
  ruler: 'Ruler',
  section: 'Section',
  chord: 'Chord',
  chordLane: 'Chord ruler',
};

/** A shortcut's label for a menu row, or undefined for none. */
function keysOf(command: string | undefined): string | undefined {
  if (!command) return undefined;
  try {
    return shortcutKeys(command).label;
  } catch {
    return undefined;
  }
}

/** Runs an item; true when it acted (a refused transpose doesn't). */
type RunItem = (item: MenuItemModel) => boolean;

interface RowProps {
  item: MenuItemModel;
  onRun: RunItem;
}

function Row({ item, onRun }: RowProps) {
  const shortcut = keysOf(item.command);
  const select = (e: Event) => {
    if (item.keepOpen) e.preventDefault();
    onRun(item);
  };
  if (item.checked !== undefined) {
    return (
      <MenuCheckboxItem
        checked={item.checked}
        disabled={item.disabled !== undefined}
        title={item.disabled}
        shortcut={shortcut}
        data-item={item.id}
        data-tutorial-id={`clip-menu-${item.id}`}
        onSelect={select}
      >
        {item.label}
      </MenuCheckboxItem>
    );
  }
  return (
    <MenuItem
      disabled={item.disabled !== undefined}
      title={item.disabled}
      shortcut={shortcut}
      danger={item.danger}
      data-item={item.id}
      data-tutorial-id={`clip-menu-${item.id}`}
      onSelect={select}
    >
      {item.label}
    </MenuItem>
  );
}

/** Prism without Premium: locked, and a click offers the plans (decision 8). */
function PrismLocked({ onClose }: { onClose: () => void }) {
  const { isLoading } = useIsPremium();
  const navigate = useNavigate();
  return (
    <MenuItem
      data-item="prism:upgrade"
      icon={<Lock aria-hidden />}
      title="Prism is part of Premium. Subscribe to unlock it."
      aria-label="Prism (Premium, locked)"
      onSelect={() => {
        onClose();
        // While the plan is loading a premium student looks free for a
        // moment: the lock may show, but it never sends them away.
        if (!isLoading) navigate(ProfileRoutes.plan.definition);
      }}
    >
      <span className="flex items-center gap-2">
        Prism
        <PremiumBadge locked />
      </span>
    </MenuItem>
  );
}

/** Transpose's sub-menu, naming how far the clip has moved so far. */
function TransposeSub({
  entry,
  onRun,
}: {
  entry: Extract<MenuEntry, { type: 'sub' }>;
  onRun: RunItem;
}) {
  const [moved, setMoved] = useState(0);
  return (
    <MenuSub>
      <MenuSubTrigger
        data-item={entry.id}
        disabled={entry.disabled !== undefined}
        title={entry.disabled}
      >
        {entry.label}
      </MenuSubTrigger>
      <MenuSubContent data-ds="v2" className="w-60">
        <div
          aria-live="polite"
          className={cn('px-2 pb-1 pt-1.5 text-daw-text-2', TYPE_CLASS.label)}
        >
          {moved === 0
            ? 'Each step moves every note'
            : `${transposeWords(moved)} (${semitoneCount(moved)})`}
        </div>
        {entry.items.map((item) => (
          <Row
            key={item.id}
            item={item}
            onRun={(picked) => {
              const acted = onRun(picked);
              if (acted) {
                setMoved((n) => n + Number(picked.id.split(':')[1] ?? 0));
              }
              return acted;
            }}
          />
        ))}
      </MenuSubContent>
    </MenuSub>
  );
}

function Entry({
  entry,
  onRun,
  onClose,
}: {
  entry: MenuEntry;
  onRun: RunItem;
  onClose: () => void;
}) {
  if (entry.type === 'note') {
    return (
      <p
        data-item={entry.id}
        className={cn(
          'max-w-64 px-2 pb-1 pt-1.5 text-daw-text-2',
          TYPE_CLASS.label,
        )}
      >
        {entry.label}
      </p>
    );
  }
  if (entry.type === 'item') {
    if (entry.premium) return <PrismLocked onClose={onClose} />;
    return <Row item={entry} onRun={onRun} />;
  }
  if (entry.id === 'transpose')
    return <TransposeSub entry={entry} onRun={onRun} />;
  return (
    <MenuSub>
      <MenuSubTrigger
        data-item={entry.id}
        disabled={entry.disabled !== undefined}
        title={entry.disabled}
      >
        {entry.label}
      </MenuSubTrigger>
      <MenuSubContent data-ds="v2" className="min-w-48">
        {entry.items.map((item) => (
          <Row key={item.id} item={item} onRun={onRun} />
        ))}
      </MenuSubContent>
    </MenuSub>
  );
}

/**
 * Where the menu hangs: beside its anchor (the pointer, or the pill), top
 * aligned, so it slides up or down to fit a short screen instead of running
 * off it: the clip menu is about 400 px, and a Chromebook's editor is 655.
 * A pointer's menu starts just clear of it, so the release of a right-click
 * never lands on an item.
 */
function placement(request: CanvasMenuRequest) {
  return {
    side: 'right',
    align: 'start',
    sideOffset: request.source === 'pointer' ? 2 : 6,
  } as const;
}

export function CanvasMenu() {
  const request = useCanvasMenuStore((s) => s.request);
  const close = useCanvasMenuStore((s) => s.close);
  const { isPremium } = useIsPremium();
  // What the items read, so a mute or a paste elsewhere shows at once.
  const tracks = useStore((s) => s.tracks);
  const remoteUsers = useStore((s) => s.remoteUsers);
  const clipboardClips = useStore((s) => s.clipboardClips);
  const clipboardAudioClip = useStore((s) => s.clipboardAudioClip);
  const markers = useStore((s) => s.markers);
  const timelineGridSize = useStore((s) => s.timelineGridSize);
  const sections = useStore((s) => s.sections);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const loopStart = useStore((s) => s.loopStart);
  const loopEnd = useStore((s) => s.loopEnd);
  const isRecording = useStore((s) => s.isRecording);
  const chordRegions = useStore((s) => s.chordRegions);
  const selectedChordIds = useStore((s) => s.selectedChordIds);

  const model = useMemo(
    () =>
      request
        ? canvasMenuModel(
            {
              tracks,
              remoteUsers,
              clipboardClips,
              clipboardAudioClip,
              markers,
              timelineGridSize,
              sections,
              loopEnabled,
              loopStart,
              loopEnd,
              isRecording,
              chordRegions,
              selectedChordIds,
            },
            request.target,
            { premium: isPremium, playheadTick: request.playheadTick },
          )
        : [],
    [
      request,
      tracks,
      remoteUsers,
      clipboardClips,
      clipboardAudioClip,
      markers,
      timelineGridSize,
      sections,
      loopEnabled,
      loopStart,
      loopEnd,
      isRecording,
      chordRegions,
      selectedChordIds,
      isPremium,
    ],
  );

  // A clip or marker that goes while its menu is open closes it.
  const gone = request !== null && model.length === 0;
  useEffect(() => {
    if (gone) close();
  }, [gone, close]);
  // So does the timeline going (another view, a lesson's step): the request
  // lives in its own store and would open again with the timeline.
  useEffect(() => () => useCanvasMenuStore.getState().close(), []);

  // The key that opened it may be held: its repeats must not choose the
  // item focus lands on (Alt+Return held would cut the clip). Arrow repeats
  // still move through the items.
  useEffect(() => {
    if (request?.source !== 'key') return;
    const swallow = (e: KeyboardEvent) => {
      if (!e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', swallow, { capture: true });
    return () =>
      window.removeEventListener('keydown', swallow, { capture: true });
  }, [request]);

  // Opened from a key, focus goes straight onto the first item, as for a
  // menu opened from its button with the keyboard (Radix has focused the
  // menu itself by then).
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (request?.source !== 'key') return;
    const frame = requestAnimationFrame(() => {
      contentRef.current
        ?.querySelector<HTMLElement>('[role^="menuitem"]:not([data-disabled])')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [request]);

  const anchor = request?.anchor;
  const place = request ? placement(request) : null;
  const run: RunItem = (item) =>
    request !== null && runCanvasMenuItem(request.target, item.id);

  return (
    <Menu
      open={request !== null && !gone}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <MenuTrigger asChild>
        <span
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none fixed"
          style={{
            left: anchor?.x ?? 0,
            top: anchor?.y ?? 0,
            width: anchor?.width ?? 0,
            height: anchor?.height ?? 0,
          }}
        />
      </MenuTrigger>
      {request && place ? (
        <MenuContent
          ref={contentRef}
          data-ds="v2"
          data-tutorial-id="clip-menu"
          data-menu-target={request.target.kind}
          aria-label={`${TITLE[request.target.kind]} menu`}
          // Named by its label, not by the hidden trigger it hangs from.
          aria-labelledby={undefined}
          className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-52 overflow-y-auto"
          side={place.side}
          align={place.align}
          sideOffset={place.sideOffset}
          onCloseAutoFocus={(e) => {
            // Back to what it was opened from (the pill, or a section in
            // the sections lane); never to the hidden trigger, which would
            // take the timeline's keys away.
            // When that has gone (Delete section), to what the opener says
            // is next to it, so the next key still lands there and not on
            // the page. Neither scrolls: the opener places itself.
            e.preventDefault();
            const back = request.returnFocus;
            if (back) {
              const to = back.isConnected
                ? back
                : (request.returnFocusFallback?.() ?? null);
              to?.focus({ preventScroll: true });
            } else if (request.source !== 'pointer') {
              useCanvasMenuStore.getState().pill?.focus();
            }
          }}
        >
          {model.map((group, i) => (
            <Fragment key={i}>
              {i > 0 ? <MenuSeparator /> : null}
              <MenuGroup>
                {group.map((entry) => (
                  <Entry
                    key={entry.id}
                    entry={entry}
                    onRun={run}
                    onClose={close}
                  />
                ))}
              </MenuGroup>
            </Fragment>
          ))}
        </MenuContent>
      ) : null}
    </Menu>
  );
}
