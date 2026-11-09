import { memo } from 'react';
import { cn } from '@/components/utilities';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useStore } from '@/daw/store';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { PromptRailButton } from '../prompt/PromptRailButton';
import { RAIL_PANELS, type RailPanel } from './railPanels';

// ── The side rail (B4a) ────────────────────────────────────────────────────
//
// A 48 px column of icons at the window's right edge, under the top bar and
// over the bottom rail, after Soundtrap's (owner, 2026-10-16). Each icon
// shows its panel in the Inspector beside it; the open one has the white
// tile, and a click on it closes the Inspector. I opens and closes the
// Inspector on the panel it last showed. The rail replaced the top bar's
// Inspector toggle and the session's People and Chat columns; People holds
// the chat, and its icon the unread count (2026-10-25). The ∆ above
// the panels opens and folds the prompt bar (PromptRailButton).

const INSPECTOR_KEYS = shortcutKeys('view.inspector');

export const SideRail = memo(function SideRail() {
  return (
    <div
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Panels"
      data-testid="side-rail"
      className="flex h-full flex-col items-center gap-1 bg-daw-bg py-2"
    >
      <PromptRailButton />
      <div aria-hidden className="my-1 h-px w-6 bg-daw-outline" />
      {RAIL_PANELS.map((panel) => (
        <RailButton key={panel.id} panel={panel} />
      ))}
    </div>
  );
});

function RailButton({ panel }: { panel: RailPanel }) {
  const active = useStore(
    (s) => s.libraryOpen && s.inspectorPanel === panel.id,
  );
  const unread = useStore((s) =>
    panel.id === 'people' && s.isCollabActive ? s.unreadChatCount : 0,
  );
  const toggle = useStore((s) => s.toggleInspectorPanel);
  const Icon = panel.icon;
  const badge = unread > 0 && !active;
  const label = badge ? `${panel.title}, ${unread} unread` : panel.title;
  return (
    <Tooltip
      content={panel.hint}
      shortcut={active ? INSPECTOR_KEYS.label : undefined}
      side="left"
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        aria-keyshortcuts={active ? INSPECTOR_KEYS.aria : undefined}
        data-testid={`rail-${panel.id}`}
        data-tutorial-id={`rail-${panel.id}`}
        data-panel={panel.id}
        onClick={() => toggle(panel.id)}
        className={cn(
          'relative flex size-8 items-center justify-center rounded-[var(--daw-radius-sm)] [&_svg]:size-[18px]',
          active
            ? 'bg-daw-primary text-daw-on-primary hover:bg-daw-primary-hover'
            : 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <Icon aria-hidden strokeWidth={1.75} />
        {badge ? (
          <span
            aria-hidden
            className={cn(
              TYPE_CLASS.micro,
              'absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-daw-primary px-1 tabular-nums text-daw-on-primary',
            )}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}
