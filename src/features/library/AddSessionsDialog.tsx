import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CAPTION } from '@/components/kit/libraryLook';
import { WHITE_PILL } from '@/components/kit/pills';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { foldForSearch } from '@/daw/shell/projects/projectRows';
import { FOCUS_RING } from '@/daw/ui/styles';
import type { LibraryItem } from './libraryItems';
import type { LibraryProject } from './libraryLocalMeta';
import { artSeedOf } from './libraryTypes';
import { ProjectCover } from './player/PlayerParts';

/**
 * Pick sessions to put in a project: every session not in it yet, newest
 * first, searchable; one in another project says so (adding moves it, a
 * session being in one project at most).
 */
export function AddSessionsDialog({
  open,
  onOpenChange,
  project,
  projects,
  items,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: LibraryProject;
  projects: readonly LibraryProject[];
  items: readonly LibraryItem[];
  onAdd: (picked: LibraryItem[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const homeOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      for (const key of p.sessions) map.set(key, p.name);
    }
    return map;
  }, [projects]);

  const choices = useMemo(() => {
    const q = foldForSearch(query.trim());
    return items
      .filter((i) => !project.sessions.includes(i.key))
      .filter((i) => !q || foldForSearch(i.name).includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [items, project.sessions, query]);

  const close = (next: boolean) => {
    if (!next) {
      setPicked(new Set());
      setQuery('');
    }
    onOpenChange(next);
  };
  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[80vh] max-w-md flex-col gap-3 border-white/10 bg-[#18181b] p-5 text-white">
        <DialogTitle className="text-[1rem] font-semibold">
          Add sessions to {project.name}
        </DialogTitle>
        <DialogDescription className={CAPTION}>
          A session is in one project at a time: one from another project moves
          here.
        </DialogDescription>
        <label className="flex h-9 items-center gap-2 rounded-full bg-white/[0.08] px-3">
          <Search aria-hidden className="size-4 shrink-0 text-white/50" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions"
            aria-label="Search sessions"
            className="w-full bg-transparent text-[0.852rem] outline-none placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <ul
          aria-label="Sessions"
          className="-mx-2 min-h-32 flex-1 overflow-y-auto"
        >
          {choices.length === 0 && (
            <li className={cn(CAPTION, 'px-3 py-8 text-center')}>
              {query
                ? 'No session by that name.'
                : 'Every session is in this project already.'}
            </li>
          )}
          {choices.map((item) => {
            const on = picked.has(item.key);
            const home = homeOf.get(item.key);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(item.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/[0.05]',
                    FOCUS_RING,
                  )}
                >
                  <span className="size-9 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-white/[0.08]">
                    <ProjectCover seed={artSeedOf(item.source)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.852rem] font-semibold">
                      {item.name}
                    </span>
                    <span className={cn(CAPTION, 'block truncate')}>
                      {home
                        ? `In ${home}`
                        : item.saved
                          ? 'Saved'
                          : 'On this device'}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full border',
                      on
                        ? 'border-white bg-white text-black'
                        : 'border-white/30',
                    )}
                  >
                    {on && <Check className="size-3.5" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className={cn(
              'h-9 rounded-full px-4 text-[0.852rem] text-white/70 hover:text-white',
              FOCUS_RING,
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={picked.size === 0}
            onClick={() => {
              onAdd(items.filter((i) => picked.has(i.key)));
              close(false);
            }}
            className={cn(WHITE_PILL, 'disabled:opacity-40')}
          >
            {picked.size === 0
              ? 'Add'
              : `Add ${picked.size} ${picked.size === 1 ? 'session' : 'sessions'}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
