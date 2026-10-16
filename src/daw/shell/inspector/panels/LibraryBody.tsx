import { AudioWaveform, Flame, Music, Search, Sparkles, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import {
  LIBRARY_ITEMS,
  searchLibraryItems,
  type LibraryItem,
} from '@/daw/data/libraryItems';
import { openSession } from '@/daw/session/openSession';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The Library panel (B4a; LibraryPanel's Library tab until then) ─────────
//
// The project templates, with a search. A click opens the template in place
// of the project, as the dashboard's template tile does (decision D10),
// through openSession: no question first (owner decision 6), the work it
// replaces is kept with a Restore, a take still recording is stopped and
// kept first, and the template is a new project, so a Save makes a new
// cloud project rather than writing over the one it replaced. Never in a
// shared session (E15: membership is the room id), where it would replace
// the room's project for everyone.

const ICONS: Record<string, ReactNode> = {
  Flame: <Flame />,
  Music: <Music />,
  Sparkles: <Sparkles />,
  AudioWaveform: <AudioWaveform />,
};

export function openTemplate(templateId: string): void {
  if (useStore.getState().roomId !== null) return;
  void openSession({ kind: 'template', templateId }, { source: 'library' });
}

export function LibraryBody() {
  const [query, setQuery] = useState('');
  const items = useMemo(
    () => (query ? searchLibraryItems(query) : LIBRARY_ITEMS),
    [query],
  );
  const inRoom = useStore((s) => s.roomId !== null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-daw-hairline p-2">
        <label
          className={cn(
            'flex h-8 items-center gap-2 rounded-[var(--daw-radius-sm)] border border-daw-outline px-2 text-daw-text-3 focus-within:border-daw-text-2 [&_svg]:size-4',
            TRANSITION,
          )}
        >
          <Search aria-hidden />
          <input
            type="search"
            aria-label="Search the library"
            placeholder="Search templates"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              TYPE_CLASS.body,
              'h-7 min-w-0 flex-1 bg-transparent text-daw-text outline-none placeholder:text-daw-text-3 [&::-webkit-search-cancel-button]:hidden',
            )}
          />
          {query ? (
            <IconButton
              label="Clear the search"
              icon={<X />}
              size="sm"
              onClick={() => setQuery('')}
            />
          ) : null}
        </label>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto py-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        <h3 className={cn(TYPE_CLASS.micro, 'px-3 pb-1 text-daw-text-3')}>
          Templates
        </h3>
        <p className={cn(TYPE_CLASS.label, 'px-3 pb-2 text-daw-text-3')}>
          {inRoom
            ? 'Leave the shared session to open a template.'
            : 'Opens as a new project. What you have open now is kept, with a Restore.'}
        </p>
        <ul aria-label="Templates">
          {items.map((item) => (
            <li key={item.id}>
              <TemplateRow item={item} inRoom={inRoom} />
            </li>
          ))}
        </ul>
        {items.length === 0 ? (
          <p
            className={cn(
              TYPE_CLASS.body,
              'px-3 py-6 text-center text-daw-text-3',
            )}
          >
            No templates match &ldquo;{query}&rdquo;
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TemplateRow({ item, inRoom }: { item: LibraryItem; inRoom: boolean }) {
  const payload = item.dragPayload;
  const templateId =
    payload.kind === 'project-template' ? payload.templateId : null;
  const disabled = !!item.disabled || inRoom || templateId === null;
  return (
    <button
      type="button"
      data-testid={`library-${item.id}`}
      aria-disabled={disabled || undefined}
      title={inRoom ? 'Leave the shared session to open a template' : undefined}
      onClick={() => {
        if (!disabled && templateId) openTemplate(templateId);
      }}
      className={cn(
        TYPE_CLASS.body,
        'flex h-9 w-full items-center gap-2.5 px-3 text-left [&_svg]:size-4',
        disabled
          ? 'cursor-default text-daw-text-3'
          : 'text-daw-text hover:bg-daw-hover',
        TRANSITION,
        FOCUS_RING,
      )}
    >
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center rounded-[var(--daw-radius-sm)] bg-daw-surface-2 text-daw-text-2"
      >
        {ICONS[item.icon] ?? <Music />}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </button>
  );
}
