import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ListMusic,
  GripVertical,
  Plus,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '@/components/songLibrary/SearchInput';
import { LearnRoutes, SongRoutes } from '@/constants/routes';
import { getSong } from '@/curriculum/data/songs';
import {
  claimDrop,
  hasCardDrag,
  hasShowDrag,
  readCardDrag,
  readShowDrag,
  setCardDrag,
  setShowDrag,
} from '../setListDnd';
import { isFavorite, roleList } from '../setListsStore';
import type { Artist, SetList, SetListParent, Show } from '../types';
import { useSetLists } from '../useSetLists';

/**
 * Set Lists.
 *
 * Flat by default: every set a player has is one grid of cards, because that
 * is what they have. Underneath, an organiser they build themselves — bands,
 * their shows, and whatever they have dragged into either. Nothing announces
 * a hierarchy before one exists.
 *
 * A set filed under a band stays in the grid as well. Filing is not a move; it
 * is a second way to find the same set, so nothing ever goes missing because
 * it was put somewhere.
 *
 * My Lead Sheets is not in the grid at all. It is the player's repertoire —
 * the master list of what they play — so it gets its own panel down the side,
 * with Favorites as a filter within it rather than a list of its own.
 */

const SONG_LIST_ROUTE = LearnRoutes.root(undefined, { tab: 'Songs' });

export const SetListsIndexPage: FC = () => {
  const navigate = useNavigate();
  const { blob, organiser, flat, status, saveState, actions } = useSetLists();
  const [search, setSearch] = useState('');
  const [repertoireOpen, setRepertoireOpen] = useState(true);

  const needle = search.trim().toLowerCase();
  const matches = (list: SetList) =>
    !needle || list.title.toLowerCase().includes(needle);

  const visible = useMemo(() => flat.filter(matches), [flat, needle]);

  const newSetList = () => {
    const id = actions.createSetList('New Set List');
    if (id) navigate(SongRoutes.setList({ setListId: id }));
  };

  const hasOrganiser =
    organiser.artists.length > 0 || organiser.looseShows.length > 0;

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

      <div className="mt-4 flex min-h-0 flex-1 gap-4 px-6 pb-10 md:px-10">
        <Repertoire
          open={repertoireOpen}
          onToggle={() => setRepertoireOpen((v) => !v)}
        />

        <div className="custom-scrollbar min-w-0 flex-1 overflow-y-auto">
          {visible.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((list) => (
                <SetListCard
                  key={list.id}
                  list={list}
                  filedIn={filedLabel(list, blob)}
                  onOpen={() =>
                    navigate(SongRoutes.setList({ setListId: list.id }))
                  }
                  onDuplicate={() => actions.duplicateSetList(list.id)}
                  onDelete={() => actions.deleteSetList(list.id)}
                  onUnfile={
                    list.parent
                      ? () => actions.fileSetList(list.id, undefined)
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center">
              <ListMusic className="mx-auto mb-3 text-white/30" size={28} />
              <p className="text-white/70">
                {needle ? 'Nothing by that name.' : 'No set lists yet.'}
              </p>
              {!needle && (
                <>
                  <p className="mt-1 text-sm text-white/40">
                    Build a set for a show, or star a song to start My
                    Favorites.
                  </p>
                  <button
                    type="button"
                    onClick={newSetList}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#7ecfcf] px-3 py-1.5 text-sm font-semibold text-[#191919]"
                  >
                    <Plus size={15} /> New Set List
                  </button>
                </>
              )}
            </div>
          )}

          <Organiser hasAny={hasOrganiser} organiser={organiser} />
        </div>
      </div>
    </div>
  );
};

/** Where a set is filed, for the line on its card. */
function filedLabel(
  list: SetList,
  blob: ReturnType<typeof useSetLists>['blob'],
): string | undefined {
  const parent = list.parent;
  if (!parent) return undefined;
  if (parent.kind === 'artist') return blob.artists[parent.id]?.title;
  const show = blob.shows[parent.id];
  if (!show) return undefined;
  const band = show.artistId ? blob.artists[show.artistId]?.title : undefined;
  return band ? `${band} ▸ ${show.title}` : show.title;
}

/* ── The repertoire ───────────────────────────────────────────────────── */

/**
 * My Lead Sheets: the master list of charts a player performs, with the
 * starred ones as a filter over it. It is not a set list and does not sit in
 * the grid — you cannot file it under a band or delete it.
 */
const Repertoire: FC<{ open: boolean; onToggle: () => void }> = ({
  open,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { blob, actions } = useSetLists();
  const [starredOnly, setStarredOnly] = useState(false);
  const inbox = roleList(blob, 'inbox');
  const entries = inbox?.entries ?? [];

  const songs = entries.flatMap((entry) => {
    if (entry.kind === 'text') return [];
    const songId = entry.kind === 'song' ? entry.songId : undefined;
    const starred = songId ? isFavorite(blob, songId) : false;
    if (starredOnly && !starred) return [];
    const title =
      entry.title ??
      (songId ? (getSong(songId)?.title ?? songId) : 'Lead sheet');
    return [{ id: entry.id, title, songId, starred }];
  });

  if (!open)
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Show My Lead Sheets"
        className="hidden h-full w-9 flex-shrink-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-3 text-white/45 hover:text-white lg:flex"
      >
        <ChevronRight size={15} />
        <span
          className="text-[11px] font-medium tracking-wide"
          style={{ writingMode: 'vertical-rl' }}
        >
          My Lead Sheets
        </span>
      </button>
    );

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.02] lg:flex">
      <div className="flex flex-shrink-0 items-center justify-between px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          My Lead Sheets
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Hide My Lead Sheets"
          className="rounded p-0.5 text-white/35 hover:text-white"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      <div className="flex flex-shrink-0 gap-1 px-3 pb-2">
        {(
          [
            ['All', false],
            ['★ Favorites', true],
          ] as const
        ).map(([label, only]) => (
          <button
            key={label}
            type="button"
            onClick={() => setStarredOnly(only)}
            aria-pressed={starredOnly === only}
            className={`rounded-full px-2 py-0.5 text-[11px] transition-colors ${
              starredOnly === only
                ? 'bg-white text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {songs.length === 0 ? (
          <p className="px-2 py-4 text-xs leading-relaxed text-white/35">
            {starredOnly
              ? 'Nothing starred yet.'
              : 'Charts you save land here — it is your master list of what you play.'}
          </p>
        ) : (
          songs.map((song) => (
            <div
              key={song.id}
              className="group flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/5"
            >
              <button
                type="button"
                onClick={() =>
                  inbox &&
                  navigate(
                    `${SongRoutes.setList({ setListId: inbox.id })}?entry=${song.id}`,
                  )
                }
                className="min-w-0 flex-1 truncate text-left text-sm text-white/80 hover:text-white"
              >
                {song.title}
              </button>
              {song.songId && (
                <button
                  type="button"
                  aria-label={song.starred ? 'Unstar' : 'Star'}
                  onClick={() => actions.toggleFavorite(song.songId!)}
                  className={
                    song.starred
                      ? 'text-[#7ecfcf]'
                      : 'text-white/20 opacity-0 transition-opacity hover:text-white/60 group-hover:opacity-100'
                  }
                >
                  <Star
                    size={13}
                    fill={song.starred ? 'currentColor' : 'none'}
                  />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

/* ── The organiser ────────────────────────────────────────────────────── */

/**
 * What the three levels are, drawn rather than described.
 *
 * Shown only while the organiser is empty: it is there to teach the shape
 * once, then get out of the way.
 */
const StructureDiagram: FC = () => (
  <div className="rounded-xl border border-dashed border-white/10 px-4 py-5">
    <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
      <figure className="min-w-60">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-white/40" />
          <span className="text-sm font-semibold text-white/80">Band</span>
          <span className="text-[11px] text-white/30">The Quartet</span>
        </div>

        <div className="ml-[7px] border-l border-white/15 pl-4 pt-1.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="ml-[-17px] h-px w-[9px] bg-white/15" />
            <ListMusic size={13} className="text-white/35" />
            <span className="text-sm text-white/70">Show / Tour</span>
            <span className="text-[11px] text-white/30">Summer Tour</span>
          </div>

          <div className="ml-[6px] border-l border-white/15 pl-4 pt-1.5">
            <Leaf label="Night 1" />
            <Leaf label="Night 2" />
          </div>

          <div className="pt-2">
            <Leaf label="Rehearsal" note="straight under the band" />
          </div>
        </div>
      </figure>

      <figure className="min-w-52 pt-0.5">
        <div className="flex items-center gap-2">
          <ListMusic size={13} className="text-white/35" />
          <span className="text-sm text-white/70">Show / Tour</span>
          <span className="text-[11px] text-white/30">Jazz Fest</span>
        </div>
        <div className="ml-[6px] border-l border-white/15 pl-4 pt-1.5">
          <Leaf label="Festival set" note="a show with no band" />
        </div>
      </figure>
    </div>

    <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/40">
      A band does not need a show, and a show does not need a band — but a show
      belongs to the band it was made in and stays there; to use it elsewhere,
      duplicate it. Drag a set list from the grid above into any of these. It
      stays in the grid wherever you file it: this is a second way to find a
      set, not a move.
    </p>
  </div>
);

const Leaf: FC<{ label: string; note?: string }> = ({ label, note }) => (
  <div className="flex items-center gap-2 py-0.5">
    <span aria-hidden className="ml-[-17px] h-px w-[9px] bg-white/15" />
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/70">
      <ListMusic size={10} className="text-white/35" />
      {label}
    </span>
    {note && <span className="text-[11px] text-white/25">{note}</span>}
  </div>
);

const Organiser: FC<{
  hasAny: boolean;
  organiser: ReturnType<typeof useSetLists>['organiser'];
}> = ({ hasAny, organiser }) => {
  const { actions } = useSetLists();

  return (
    <section className="mt-8">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
          Bands &amp; Shows
        </h2>
        <button
          type="button"
          onClick={() => actions.createArtist()}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
        >
          <Plus size={12} /> Band
        </button>
        <button
          type="button"
          onClick={() => actions.createShow(undefined)}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
        >
          <Plus size={12} /> Show
        </button>
      </div>

      {!hasAny ? (
        <StructureDiagram />
      ) : (
        <div className="space-y-3">
          {organiser.artists.map(({ artist, shows, setLists }) => (
            <ArtistBox
              key={artist.id}
              artist={artist}
              shows={shows}
              setLists={setLists}
            />
          ))}

          {organiser.looseShows.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] text-white/30">
                Shows with no band — drag one onto a band to put it there.
              </p>
              <div className="space-y-2">
                {organiser.looseShows.map(({ show, setLists }) => (
                  <ShowBox
                    key={show.id}
                    show={show}
                    setLists={setLists}
                    loose
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

/** A band: its shows stacked under it, plus anything filed straight on it. */
const ArtistBox: FC<{
  artist: Artist;
  shows: { show: Show; setLists: SetList[] }[];
  setLists: SetList[];
}> = ({ artist, shows, setLists }) => {
  const { actions } = useSetLists();
  const [over, setOver] = useState(false);

  /** A show dropped on the band joins it — unless it is already in another. */
  const takeShow = (e: React.DragEvent) => {
    const item = claimDrop(e, readShowDrag);
    if (!item) return false;
    if (item.artistId && item.artistId !== artist.id) return false;
    actions.fileShowAt(item.showId, artist.id, null);
    return true;
  };

  return (
    <div
      onDragOver={(e) => {
        if (!hasShowDrag(e.dataTransfer) && !hasCardDrag(e.dataTransfer))
          return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        takeShow(e);
      }}
      data-band={artist.id}
      className={`rounded-xl border bg-white/[0.02] p-3 transition-colors ${
        over ? 'border-[#7ecfcf]/60' : 'border-white/10'
      }`}
    >
      <NodeHeader
        icon={<Users size={14} className="text-white/35" />}
        title={artist.title}
        onRename={(t) => actions.renameArtist(artist.id, t)}
        onDuplicate={() => actions.duplicateArtist(artist.id)}
        onDelete={() => actions.deleteArtist(artist.id)}
        alwaysOn={
          <button
            type="button"
            onClick={() => actions.createShow(artist.id)}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/55 hover:border-white/30 hover:text-white"
          >
            <Plus size={11} /> Show
          </button>
        }
      />

      <DropZone parent={{ kind: 'artist', id: artist.id }} lists={setLists} />

      <div
        data-band-shows={artist.id}
        className="ml-1.5 mt-2 space-y-2 border-l border-white/10 pl-3"
      >
        {shows.map(({ show, setLists: showLists }) => (
          <ShowBox key={show.id} show={show} setLists={showLists} />
        ))}
        {/* Always here, so there is somewhere to drop the next show however
            many the band already has, and somewhere to drop one at the end. */}
        <ShowDropStrip artistId={artist.id} empty={shows.length === 0} />
      </div>
    </div>
  );
};

/** The tail of a band's show list: drop here to add one at the bottom. */
const ShowDropStrip: FC<{ artistId: string; empty: boolean }> = ({
  artistId,
  empty,
}) => {
  const { actions } = useSetLists();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (!hasShowDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const item = claimDrop(e, readShowDrag);
        if (!item) return;
        if (item.artistId && item.artistId !== artistId) return;
        actions.fileShowAt(item.showId, artistId, null);
      }}
      className={`rounded-lg border border-dashed px-2 py-1.5 text-[11px] transition-colors ${
        over
          ? 'border-[#7ecfcf] bg-[#7ecfcf]/10 text-white/70'
          : 'border-white/10 text-white/25'
      }`}
    >
      {empty
        ? 'No shows yet — add one, or drag a show here.'
        : 'Drop a show here'}
    </div>
  );
};

/** A show, wherever it sits. Draggable, so it can join a band or be reordered. */
const ShowBox: FC<{ show: Show; setLists: SetList[]; loose?: boolean }> = ({
  show,
  setLists,
  loose,
}) => {
  const { actions } = useSetLists();
  const [over, setOver] = useState(false);

  return (
    <div
      data-show={show.id}
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setShowDrag(e.dataTransfer, {
          showId: show.id,
          artistId: show.artistId,
        });
      }}
      onDragOver={(e) => {
        if (!hasShowDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const item = claimDrop(e, readShowDrag);
        if (!item || item.showId === show.id) return;
        // Land above the show it was dropped on, in the same band as it.
        if (item.artistId && item.artistId !== show.artistId) return;
        actions.fileShowAt(item.showId, show.artistId, show.id);
      }}
      className={`rounded-lg border px-2.5 py-2 transition-colors ${
        over
          ? 'border-[#7ecfcf] bg-[#7ecfcf]/10'
          : loose
            ? 'border-white/10 bg-white/[0.02]'
            : 'border-transparent'
      }`}
    >
      <NodeHeader
        icon={<GripVertical size={13} className="cursor-grab text-white/25" />}
        title={show.title}
        small
        onRename={(t) => actions.renameShow(show.id, t)}
        onDuplicate={() => actions.duplicateShow(show.id)}
        onDelete={() => actions.deleteShow(show.id)}
        alwaysOn={
          show.artistId ? (
            <button
              type="button"
              onClick={() => actions.fileShow(show.id, undefined)}
              className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/45 hover:border-white/30 hover:text-white"
              title="Take this show out of the band"
            >
              Out of band
            </button>
          ) : undefined
        }
      />
      <DropZone parent={{ kind: 'show', id: show.id }} lists={setLists} />
    </div>
  );
};

const NodeHeader: FC<{
  icon: React.ReactNode;
  title: string;
  small?: boolean;
  /** Shown whether or not the row is hovered — a way in, not a tidy-up. */
  alwaysOn?: React.ReactNode;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ icon, title, small, alwaysOn, onRename, onDuplicate, onDelete }) => (
  <div className="group flex items-center gap-1.5">
    {icon}
    <InlineTitle
      value={title}
      onCommit={onRename}
      className={
        small ? 'text-sm text-white/70' : 'text-sm font-semibold text-white/90'
      }
    />
    <span className="ml-auto flex items-center gap-1">
      {alwaysOn}
      <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label={`Duplicate ${title}`}
          onClick={onDuplicate}
          className="rounded p-1 text-white/30 hover:text-white"
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          aria-label={`Delete ${title}`}
          onClick={onDelete}
          className="rounded p-1 text-white/30 hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </span>
    </span>
  </div>
);

/** Set lists filed here, stacked, and the place to drop another. */
const DropZone: FC<{ parent: SetListParent; lists: SetList[] }> = ({
  parent,
  lists,
}) => {
  const navigate = useNavigate();
  const { actions } = useSetLists();
  const [over, setOver] = useState<string | null>(null);

  const drop = (e: React.DragEvent, beforeId: string | null) => {
    setOver(null);
    // A show dragged onto this strip is meant for the band around it.
    const item = claimDrop(e, readCardDrag);
    if (item) actions.fileSetListAt(item.setListId, parent, beforeId);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!hasCardDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setOver('end');
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
      }}
      onDrop={(e) => drop(e, null)}
      className={`mt-1.5 flex min-h-9 flex-col gap-1 rounded-lg border border-dashed px-2 py-1.5 transition-colors ${
        over ? 'border-[#7ecfcf] bg-[#7ecfcf]/10' : 'border-white/10'
      }`}
    >
      {lists.length === 0 ? (
        <span className="text-[11px] text-white/25">Drag a set list here</span>
      ) : (
        lists.map((list) => (
          <div
            key={list.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              setCardDrag(e.dataTransfer, { setListId: list.id });
            }}
            onDragOver={(e) => {
              if (!hasCardDrag(e.dataTransfer)) return;
              e.preventDefault();
              e.stopPropagation();
              setOver(list.id);
            }}
            onDrop={(e) => drop(e, list.id)}
            className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${
              over === list.id ? 'bg-[#7ecfcf]/20' : 'hover:bg-white/5'
            }`}
          >
            <GripVertical size={12} className="cursor-grab text-white/20" />
            <button
              type="button"
              onClick={() =>
                navigate(SongRoutes.setList({ setListId: list.id }))
              }
              className="min-w-0 flex-1 truncate text-left text-xs text-white/80 hover:text-white"
            >
              {list.title}
            </button>
            <button
              type="button"
              aria-label={`Take ${list.title} out`}
              onClick={() => actions.fileSetList(list.id, undefined)}
              className="rounded p-0.5 text-white/25 hover:text-white"
              title="Take out"
            >
              <X size={12} />
            </button>
          </div>
        ))
      )}
    </div>
  );
};

/* ── A card ───────────────────────────────────────────────────────────── */

const SetListCard: FC<{
  list: SetList;
  filedIn?: string;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUnfile?: () => void;
}> = ({ list, filedIn, onOpen, onDuplicate, onDelete, onUnfile }) => {
  const songs = list.entries.filter((e) => e.kind !== 'text').length;
  const texts = list.entries.length - songs;
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => setCardDrag(e.dataTransfer, { setListId: list.id })}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className="group flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/25"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <ListMusic size={14} className="flex-shrink-0 text-white/40" />
          <span className="truncate font-medium text-white/90">
            {list.title}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-white/40">
          {songs} {songs === 1 ? 'chart' : 'charts'}
          {texts > 0 && ` · ${texts} note${texts === 1 ? '' : 's'}`}
          {filedIn && ` · ${filedIn}`}
        </p>
      </div>
      <span className="flex flex-shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
        {onUnfile && (
          <button
            type="button"
            aria-label={`Take ${list.title} out of ${filedIn}`}
            onClick={(e) => {
              e.stopPropagation();
              onUnfile();
            }}
            className="rounded p-1 text-white/30 hover:text-white"
            title="Unfile"
          >
            <ChevronLeft size={15} />
          </button>
        )}
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
