import { ChevronLeft, ListMusic, Plus, Star, Trash2 } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '@/components/songLibrary/SearchInput';
import { LearnRoutes, SongRoutes } from '@/constants/routes';
import type { SetList } from '../types';
import { useSetLists } from '../useSetLists';

/**
 * The set lists a performer has built, grouped the way they filed them:
 * Artist ▸ Show ▸ Set List, with My Lead Sheets and My Favorites pinned on top.
 */

const SONG_LIST_ROUTE = LearnRoutes.root(undefined, { tab: 'Songs' });

export const SetListsIndexPage: FC = () => {
  const navigate = useNavigate();
  const { tree, blob, status, saveState, actions } = useSetLists();
  const [search, setSearch] = useState('');

  const matches = (list: SetList) =>
    !search.trim() ||
    list.title.toLowerCase().includes(search.trim().toLowerCase());

  const roleLists = useMemo(
    () =>
      Object.values(blob.setLists)
        .filter((l) => l.role)
        .filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blob, search],
  );

  const newSetList = () => {
    const id = actions.createSetList('New Set List');
    if (id) navigate(SongRoutes.setList({ setListId: id }));
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: '#101012' }}
    >
      <header className="flex-shrink-0 px-6 pt-4 md:px-10">
        <div className="flex flex-col items-start">
          <a
            href={SONG_LIST_ROUTE}
            className="text-xs font-medium text-white/50 hover:text-white hover:underline"
          >
            Songs
          </a>
          <button
            type="button"
            onClick={() => navigate(SONG_LIST_ROUTE)}
            aria-label="Back to Song Library"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1
            className="text-white"
            style={{
              fontFamily:
                "'Glacial Indifference', 'Fraunces', system-ui, sans-serif",
              fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
              fontWeight: 600,
            }}
          >
            Set Lists
          </h1>
          <button
            type="button"
            onClick={newSetList}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7ecfcf] px-3 py-1.5 text-sm font-semibold text-[#191919] transition-opacity hover:opacity-90"
          >
            <Plus size={15} /> New Set List
          </button>
          {status === 'signedOut' && (
            <span className="text-xs text-white/45">
              Sign in to keep your set lists.
            </span>
          )}
          {status !== 'signedOut' && saveState !== 'saved' && (
            <span className="text-xs text-white/45">
              {saveState === 'unsaved' ? 'Not saved' : 'Saving…'}
            </span>
          )}
        </div>

        <div className="mt-3 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search set lists"
          />
        </div>
      </header>

      <div className="custom-scrollbar mt-4 flex-1 overflow-y-auto px-6 pb-10 md:px-10">
        {roleLists.length > 0 && (
          <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roleLists.map((list) => (
              <SetListCard key={list.id} list={list} pinned />
            ))}
          </div>
        )}

        {tree.map(({ artist, shows }) => {
          const visible = shows
            .map((s) => ({
              ...s,
              setLists: s.setLists.filter((l) => !l.role && matches(l)),
            }))
            .filter((s) => s.setLists.length > 0);
          if (visible.length === 0) return null;
          return (
            <section key={artist.id} className="mb-6">
              <InlineTitle
                value={artist.title}
                onCommit={(title) => actions.renameArtist(artist.id, title)}
                className="text-xs font-semibold uppercase tracking-wide text-white/40"
              />
              {visible.map(({ show, setLists }) => (
                <div key={show.id} className="mt-2">
                  <InlineTitle
                    value={show.title}
                    onCommit={(title) => actions.renameShow(show.id, title)}
                    className="text-sm text-white/60"
                  />
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {setLists.map((list) => (
                      <SetListCard
                        key={list.id}
                        list={list}
                        onDelete={() => actions.deleteSetList(list.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}

        {Object.keys(blob.setLists).length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center">
            <ListMusic className="mx-auto mb-3 text-white/30" size={28} />
            <p className="text-white/70">No set lists yet.</p>
            <p className="mt-1 text-sm text-white/40">
              Build a set for a show, or star a song to start My Favorites.
            </p>
            <button
              type="button"
              onClick={newSetList}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#7ecfcf] px-3 py-1.5 text-sm font-semibold text-[#191919]"
            >
              <Plus size={15} /> New Set List
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SetListCard: FC<{
  list: SetList;
  pinned?: boolean;
  onDelete?: () => void;
}> = ({ list, pinned, onDelete }) => {
  const navigate = useNavigate();
  const songs = list.entries.filter((e) => e.kind === 'song').length;
  const texts = list.entries.length - songs;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(SongRoutes.setList({ setListId: list.id }))}
      onKeyDown={(e) => {
        if (e.key === 'Enter')
          navigate(SongRoutes.setList({ setListId: list.id }));
      }}
      className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/25"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {list.role === 'favorites' ? (
            <Star size={14} className="flex-shrink-0 text-[#7ecfcf]" />
          ) : (
            <ListMusic size={14} className="flex-shrink-0 text-white/40" />
          )}
          <span className="truncate font-medium text-white/90">
            {list.title}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-white/40">
          {songs} {songs === 1 ? 'song' : 'songs'}
          {texts > 0 && ` · ${texts} note${texts === 1 ? '' : 's'}`}
        </p>
      </div>
      {!pinned && onDelete && (
        <button
          type="button"
          aria-label={`Delete ${list.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-white/30 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
};

/** A title that becomes an input when clicked — the planner's pattern. */
export const InlineTitle: FC<{
  value: string;
  onCommit: (value: string) => void;
  className?: string;
}> = ({ value, onCommit, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  if (draft === null)
    return (
      <button
        type="button"
        onClick={() => setDraft(value)}
        className={`rounded px-1 text-left hover:bg-white/5 ${className ?? ''}`}
        title="Rename"
      >
        {value}
      </button>
    );
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim()) onCommit(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') setDraft(null);
      }}
      className={`rounded border border-white/20 bg-transparent px-1 text-white outline-none ${className ?? ''}`}
    />
  );
};
