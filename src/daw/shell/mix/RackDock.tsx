import { ChevronDown, ChevronUp } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { cn } from '@/components/utilities';
import { DOCK_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap } from '@/daw/commands/registry';
import { hintText } from '@/daw/shell/help/hintSource';
import { DOCK_TAB_BAR_PX } from '@/daw/shell/layout/layoutModel';
import { useStore } from '@/daw/store';
import type { RackTarget } from '@/daw/store/effectRack';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { FxRack } from './FxRack';
import { useRack } from './rackAdapters';
import { openRack } from './rackTarget';

// ── The Mix view's RackDock (milestone 2.10) ───────────────────────────────
//
// Under the strips, in the slot Create's editor dock takes, stopping at the
// Inspector: one rack at a time, a track's, a return's or the master's, in
// the same FxRack as the dock's Effects tab. A click on a strip's effects,
// a return strip or the master's chain opens it there; its × or Escape
// shuts it to its 32 px bar, so the strips get the height back. Its height
// is a share of the body (the 'rack' slot of the student's dock heights),
// never a fixed px height (decision 16), and it starts shut.

/** The rack's height before the shell has measured itself. */
const RACK_FALLBACK_PX = 220;

export const RackDock = memo(function RackDock() {
  const rootRef = useRef<HTMLDivElement>(null);
  const target = useStore((s) => s.mixRack);
  const setMixRack = useStore((s) => s.setMixRack);
  const rack = useRack(target);
  // The last rack shown, for the bar's open button.
  const last = useRef<RackTarget | null>(null);
  if (target) last.current = target;
  // A rack whose track was deleted shows as shut.
  const open = target !== null && rack !== null;

  useKeymap(
    DOCK_SCOPE.id,
    { 'dock.close': () => setMixRack(null) },
    { element: rootRef },
  );

  const reopen = () => {
    const s = useStore.getState();
    const lastTrack =
      last.current?.kind === 'track'
        ? s.tracks.some((t) => t.id === (last.current as { id: string }).id)
        : true;
    const selected = s.selectedTrackId;
    if (last.current && lastTrack) openRack(last.current);
    else if (selected && s.tracks.some((t) => t.id === selected)) {
      openRack({ kind: 'track', id: selected });
    } else openRack({ kind: 'master' });
  };

  const returnId = target?.kind === 'return' ? target.id : null;
  const openKey =
    open && target
      ? `${target.kind}:${target.kind === 'master' ? '' : target.id}`
      : null;

  // Opened from a strip, the master column or the bottom rail's Master,
  // focus moves into the rack, so Escape (the dock's key) shuts it and Tab
  // reaches its controls. A pick in the Effects library keeps its focus.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openKey) return;
    const active = document.activeElement;
    if (
      active?.closest('[data-testid="mix-view"], [data-testid="master-row"]')
    ) {
      bodyRef.current?.focus({ preventScroll: true });
    }
  }, [openKey]);

  return (
    <div
      ref={rootRef}
      data-testid="rack-dock"
      data-open={open || undefined}
      data-rack={target ? target.kind : undefined}
      className="flex h-full shrink-0 flex-col border-t border-daw-hairline bg-daw-surface-1"
    >
      <div
        data-testid="rack-dock-bar"
        className="flex shrink-0 items-center gap-2 px-2"
        style={{ height: DOCK_TAB_BAR_PX }}
      >
        <h2 className={cn(TYPE_CLASS.title, 'min-w-0 truncate text-daw-text')}>
          {open ? `Effects · ${rack?.name ?? ''}` : 'Effects'}
        </h2>
        {open ? null : (
          <span className={cn(TYPE_CLASS.label, 'truncate text-daw-text-3')}>
            Click a strip’s effects to open its rack here
          </span>
        )}
        <span className="flex-1" />
        <IconButton
          label={open ? 'Close the effects rack' : 'Open the effects rack'}
          icon={open ? <ChevronDown /> : <ChevronUp />}
          size="sm"
          variant="ghost"
          shortcut={open ? 'Esc' : undefined}
          onClick={open ? () => setMixRack(null) : reopen}
          data-hint={hintText(
            open ? 'Close the effects rack' : 'Open the effects rack',
            open
              ? 'Hide the rack under the mixer'
              : 'Show the last rack you opened',
            open ? 'Esc' : undefined,
          )}
          data-testid="rack-dock-toggle"
        />
      </div>
      {open && target ? (
        <div
          key={`${target.kind}:${returnId ?? (target.kind === 'track' ? target.id : '')}`}
          ref={bodyRef}
          data-testid="rack-dock-body"
          data-tutorial-id={returnId ? `return-fx-${returnId}` : undefined}
          // The chain's blocks and controls are the legacy components until
          // Stage C restyles them, as in the dock.
          data-ds="legacy"
          tabIndex={-1}
          className="flex min-h-0 overflow-hidden border-t border-daw-hairline outline-none duration-daw-fast animate-in fade-in-0 motion-reduce:animate-none"
          style={{
            height: `calc(var(--daw-dock-h, ${RACK_FALLBACK_PX}px) - ${DOCK_TAB_BAR_PX + 1}px)`,
          }}
        >
          <FxRack target={target} layout="side" />
        </div>
      ) : null}
    </div>
  );
});
