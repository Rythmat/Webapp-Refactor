import {
  ChevronLeft,
  Copy,
  ListMusic,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FC,
  type KeyboardEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import { LearnInstrumentPill } from '@/components/learn/LearnInstrumentPill';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { learnTabRoute } from '@/features/learn/learnPaths';
import { useLearnInstrument } from '@/features/learn/useInstrumentStore';
import { GLASS_CARD, GLASS_PILL } from '../setListsLook';
import { setListPlace } from '../setListsStore';
import { setListSandboxActive } from '../storage/setListSandbox';
import type { SetList } from '../types';
import { useSetLists } from '../useSetLists';

/**
 * Set Lists.
 *
 * One card (owner, 2026-10-25): every set the player has, one under another,
 * each saying where it is played (its Group, Show and the show's Date) and
 * filed there as those are typed. Songs are added inside a set list, in its
 * workspace. The bands and shows are still the store's (Artist, Show); the
 * card is now the way to them.
 */

export const SetListsIndexPage: FC = () => {
  const navigate = useNavigate();
  // Back to Songs on the chosen instrument.
  const songsRoute = learnTabRoute(useLearnInstrument(), 'Songs');
  const { flat, status, saveState, actions } = useSetLists();
  const [search, setSearch] = useState('');

  const needle = search.trim().toLowerCase();
  const matches = (list: SetList) =>
    !needle || list.title.toLowerCase().includes(needle);

  const visible = useMemo(() => flat.filter(matches), [flat, needle]);

  const newSetList = () => {
    const id = actions.createSetList('New Set List');
    // On a tour's practice copy the new list stays here, for the tour to
    // carry on with.
    if (id && !setListSandboxActive())
      navigate(SongRoutes.setList({ setListId: id }));
  };

  return (
    // The Learn page's look (owner, 2026-10-25): Home's glow behind, the
    // instrument switcher top right and the way back to Songs
    // top left, where the Songs pages keep Set Lists. `isolate`, so the
    // glow's -z-10 sits behind all of it.
    <div className="relative isolate flex h-full flex-col overflow-hidden">
      <HomeGlow />
      {/* Only the pills (owner, 2026-10-25): the title is the Set Lists
        card's heading. Their row's height: 8px padding + the 40px pill. */}
      <header className="relative h-14 shrink-0 p-2">
        <Link
          to={songsRoute}
          aria-label="Back to Songs"
          className={cn(GLASS_PILL, 'absolute left-2 top-2 z-10 gap-1 pl-2.5')}
        >
          <ChevronLeft aria-hidden className="size-4" />
          Songs
        </Link>
        <div className="absolute right-2 top-2 z-10">
          <LearnInstrumentPill stay />
        </div>
      </header>

      {/* One card (owner, 2026-10-25): no Songs column (songs are added
        inside a set list) and no bands and shows columns (each set list's
        card says its Group, Show and Date). */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-10 md:px-10">
        <SetListColumn
          lists={visible}
          search={search}
          onSearch={setSearch}
          searching={needle.length > 0}
          onNew={newSetList}
          note={
            status === 'signedOut'
              ? 'Sign in to keep your set lists.'
              : saveState !== 'saved'
                ? saveState === 'unsaved'
                  ? 'Not saved'
                  : 'Saving…'
                : null
          }
        />
      </div>
    </div>
  );
};

/* ── The set lists ────────────────────────────────────────────────────── */

/**
 * The middle column: every set the player has, one under another.
 *
 * This was a two- and three-across grid. A grid asks to be scanned in both
 * directions, which fought the point of the page — across is the workflow,
 * down is just how many you have. One column leaves left-to-right to mean
 * lead sheet → set → show.
 */
const SetListColumn: FC<{
  lists: SetList[];
  search: string;
  onSearch: (search: string) => void;
  searching: boolean;
  onNew: () => void;
  /** Whether the set lists are kept: signed out, unsaved, saving; null when
   *  all's saved. */
  note: string | null;
}> = ({ lists, search, onSearch, searching, onNew, note }) => {
  const navigate = useNavigate();
  const { actions } = useSetLists();

  return (
    <section
      data-setlists-column="setlists"
      className={cn(GLASS_CARD, 'flex min-h-0 min-w-0 flex-1 flex-col')}
    >
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        {/* The page's title, at the Learn navigation's size (owner,
            2026-10-25), with whether it's all kept beside it. */}
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-xl font-medium text-white md:text-2xl">
            Set Lists
          </h1>
          {note && (
            <span className="truncate text-xs text-white/45">{note}</span>
          )}
        </div>
        {/* Search, where New Set List was (owner, 2026-10-25). */}
        <div
          className={cn(
            GLASS_PILL,
            'h-9 w-56 min-w-0 shrink focus-within:border-white/20',
          )}
        >
          <Search aria-hidden className="size-4 shrink-0" />
          <input
            type="search"
            aria-label="Search set lists"
            placeholder="Search set lists"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onSearch('');
            }}
            className="min-w-0 flex-1 border-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/50 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch('')}
              aria-label="Clear search"
              className="rounded-full p-0.5 text-white/50 hover:text-white"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* The set lists, then + Add Set List as the Studio's + Add track
          (owner, 2026-10-25): in a slot under the last one, or in the
          middle of an empty card. A search that finds nothing says so. */}
      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
        {lists.length > 0 && (
          <div className="flex flex-col gap-2">
            {lists.map((list) => (
              <SetListCard
                key={list.id}
                list={list}
                onOpen={() =>
                  navigate(SongRoutes.setList({ setListId: list.id }))
                }
                onDuplicate={() => actions.duplicateSetList(list.id)}
                onDelete={() => actions.deleteSetList(list.id)}
              />
            ))}
          </div>
        )}
        {searching && lists.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/50">
            Nothing by that name.
          </p>
        ) : (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center px-2',
              lists.length === 0 ? 'flex-1' : 'min-h-16',
            )}
          >
            <Button
              size="sm"
              variant="quiet"
              data-setlists-new="setlist"
              onClick={onNew}
            >
              <Plus aria-hidden />
              Add Set List
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

/* ── A card ───────────────────────────────────────────────────────────── */

const SetListCard: FC<{
  list: SetList;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ list, onOpen, onDuplicate, onDelete }) => {
  const songs = list.entries.filter((e) => e.kind !== 'text').length;
  const texts = list.entries.length - songs;
  return (
    <div
      role="button"
      tabIndex={0}
      data-set-list={list.id}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen();
      }}
      className="group cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/25"
    >
      {/* One row (owner, 2026-10-25): the title, which is the show, then
          its Group and Date, then the card's actions. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <ListMusic size={14} className="flex-shrink-0 text-white/40" />
            <span className="truncate font-medium text-white/90">
              {list.title}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-white/40">
            {songs} {songs === 1 ? 'chart' : 'charts'}
            {texts > 0 && ` · ${texts} note${texts === 1 ? '' : 's'}`}
          </p>
        </div>
        <PlaceFields setListId={list.id} />
        <span className="flex flex-shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Duplicate ${list.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="rounded p-1 text-white/30 hover:text-white"
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${list.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-white/30 hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
        </span>
      </div>
    </div>
  );
};

/** A field on the card: a small glass pill, as the page's search is. */
const PLACE_FIELD =
  'h-8 min-w-0 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-white outline-none transition-colors placeholder:text-white/35 hover:border-white/20 focus:border-white/30 [color-scheme:dark]';

/**
 * Where the set is played, beside its title (owner, 2026-10-25: in place of
 * the bands and shows columns; the title is the show): its Group and Date.
 * Typing a group files the set under it, finding or making it by name
 * (store.placeSetList), and saves on Enter or on leaving the field, offering
 * the groups there are. The date is the set's own and saves as it is picked.
 */
export const PlaceFields: FC<{
  setListId: string;
  /** Share the row's width, each field growing to fill it (the set list
   *  editor's narrow rail). */
  fill?: boolean;
}> = ({ setListId, fill = false }) => {
  const { blob, actions } = useSetLists();
  const saved = useMemo(() => setListPlace(blob, setListId), [blob, setListId]);
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [saved]);
  const groupsId = useId();
  const groups = blob.order.artists
    .map((id) => blob.artists[id]?.title)
    .filter((t): t is string => !!t);

  const commit = (next = draft) => {
    if (next.group === saved.group && next.date === saved.date) return;
    actions.placeSetList(setListId, next);
  };
  // The fields sit on a card that opens on a click: keep their clicks and
  // keys to themselves.
  const own = {
    onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter') e.currentTarget.blur();
      if (e.key === 'Escape') {
        setDraft(saved);
        e.currentTarget.blur();
      }
    },
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        fill ? 'min-w-0 w-full' : 'flex-shrink-0',
      )}
    >
      <input
        {...own}
        aria-label="Group"
        placeholder="Group"
        list={groupsId}
        value={draft.group}
        onChange={(e) => setDraft({ ...draft, group: e.target.value })}
        onBlur={() => commit()}
        className={cn(PLACE_FIELD, fill ? 'flex-1' : 'w-40')}
      />
      <input
        {...own}
        type="date"
        aria-label="Date"
        title="When it’s played"
        value={draft.date}
        onChange={(e) => {
          const next = { ...draft, date: e.target.value };
          setDraft(next);
          commit(next);
        }}
        className={cn(PLACE_FIELD, fill ? 'w-[8.5rem] shrink-0' : 'w-36')}
      />
      <datalist id={groupsId}>
        {groups.map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>
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
