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
import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '@/components/songLibrary/SearchInput';
import { LearnRoutes, SongRoutes } from '@/constants/routes';
import { getSong } from '@/curriculum/data/songs';
import { SongPickerDialog } from '@/features/classroom/slides/wizard/SongPickerDialog';
import {
  claimDrop,
  hasCardDrag,
  hasShowDrag,
  hasSongDrag,
  readCardDrag,
  readShowDrag,
  readSongDrag,
  setCardDrag,
  setShowDrag,
  setSongDrag,
} from '../setListDnd';
import { isFavorite, roleList } from '../setListsStore';
import { attachTouchDrag } from '../touchDrag';
import type { Artist, SetList, SetListParent, Show } from '../types';
import { useSetLists } from '../useSetLists';

/**
 * Set Lists.
 *
 * Three columns, and the order of them is the work: My Lead Sheets, the
 * charts a player performs; the set lists they build out of those charts; and
 * the bands and shows those sets get played at. Each column is a drop target
 * for the one on its left, so the page reads the way the job goes — a chart
 * into a set, a set into a show, a show into a band.
 *
 * Flat by default underneath all that. Every set is in the middle column
 * whether or not it has been filed anywhere, and filing is not a move: it is
 * a second way to find the same set, so nothing goes missing because it was
 * put somewhere. Nothing announces a hierarchy before one exists.
 *
 * My Lead Sheets is not a set list — you cannot file it or delete it — which
 * is why it sits outside the middle column with Favorites as a filter over
 * it rather than a list of its own.
 *
 * The drags are native HTML5 DnD, which is mouse-only; `../touchDrag` is what
 * makes the same handlers answer to a finger, because this page is used on a
 * tablet as much as a laptop.
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

  // Touch drags for the whole three-column area. The drop handlers below are
  // written once, for drag events; this is what makes a finger produce them.
  const columnsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = columnsRef.current;
    return node ? attachTouchDrag(node) : undefined;
  }, []);

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

      {/*
        Three columns, and the order is the workflow: the charts you play, the
        sets you build out of them, and the bands and shows those sets belong
        to. Every column is a drop target for the one on its left, so the way
        the work moves is the way the page reads.

        Side by side from md up. Below that they stack in the same order —
        a phone gets the same sequence, scrolled instead of scanned.
      */}
      <div
        ref={columnsRef}
        className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-10 md:flex-row md:overflow-hidden md:px-10"
      >
        <Repertoire
          open={repertoireOpen}
          onToggle={() => setRepertoireOpen((v) => !v)}
        />

        <SetListColumn
          lists={visible}
          blob={blob}
          searching={needle.length > 0}
          onNew={newSetList}
        />

        <OrganiserColumn hasAny={hasOrganiser} organiser={organiser} />
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
  blob: ReturnType<typeof useSetLists>['blob'];
  searching: boolean;
  onNew: () => void;
}> = ({ lists, blob, searching, onNew }) => {
  const navigate = useNavigate();
  const { actions } = useSetLists();

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Set Lists
        </span>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
        >
          <Plus size={12} /> Set List
        </button>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {lists.length > 0 ? (
          <div className="flex flex-col gap-2">
            {lists.map((list) => (
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
          <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
            <ListMusic className="mx-auto mb-3 text-white/30" size={24} />
            <p className="text-sm text-white/70">
              {searching ? 'Nothing by that name.' : 'No set lists yet.'}
            </p>
            {!searching && (
              <>
                <p className="mt-1 text-xs leading-relaxed text-white/40">
                  Make one, then drag lead sheets into it from the left.
                </p>
                <button
                  type="button"
                  onClick={onNew}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#7ecfcf] px-3 py-1.5 text-sm font-semibold text-[#191919]"
                >
                  <Plus size={15} /> New Set List
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

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
  const [picking, setPicking] = useState(false);
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
        className="flex w-full flex-shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-white/45 hover:text-white md:h-full md:w-9 md:flex-col md:px-0 md:py-3"
      >
        <ChevronRight size={15} />
        <span className="text-[11px] font-medium tracking-wide md:[writing-mode:vertical-rl]">
          My Lead Sheets
        </span>
      </button>
    );

  return (
    <aside className="flex w-full flex-shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.02] md:w-56 lg:w-64">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          My Lead Sheets
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
          >
            <Plus size={12} /> Song
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Hide My Lead Sheets"
            className="rounded p-0.5 text-white/35 hover:text-white"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
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

      <div className="custom-scrollbar max-h-64 min-h-0 flex-1 overflow-y-auto px-2 pb-2 md:max-h-none">
        {songs.length === 0 ? (
          <p className="px-2 py-4 text-xs leading-relaxed text-white/35">
            {starredOnly
              ? 'Nothing starred yet.'
              : 'Charts you save land here — it is your master list of what you play. Add one with ＋ Song.'}
          </p>
        ) : (
          songs.map((song) => (
            <div
              key={song.id}
              // Only a library song can be dragged into a set: a set holds a
              // reference by song id, so a chart with no id has nothing to
              // hand over. Those stay click-to-open.
              draggable={!!song.songId}
              onDragStart={(e) => {
                if (!song.songId) return;
                setSongDrag(e.dataTransfer, {
                  songId: song.songId,
                  title: song.title,
                });
              }}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/5 ${
                song.songId ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
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

      {/* Adding to the repertoire from the page that shows it — the same
          picker the set list workspace uses, pointed at the inbox list. */}
      <SongPickerDialog
        open={picking}
        onOpenChange={setPicking}
        onSelect={(song) => {
          if (inbox) actions.addSong(inbox.id, song.id);
          setPicking(false);
        }}
      />
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
      duplicate it. Drag a set list in from the column on the left. It stays in
      that column wherever you file it: this is a second way to find a set, not
      a move.
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

/**
 * The right column: Bands over Shows, because that is the order they contain
 * each other in — a show belongs to a band, a set list belongs to either.
 *
 * They were one section under the grid, which put the last step of the
 * workflow below the middle of it. Stacked in their own column, the page
 * reads lead sheet → set list → where it is played.
 */
const OrganiserColumn: FC<{
  hasAny: boolean;
  organiser: ReturnType<typeof useSetLists>['organiser'];
}> = ({ hasAny, organiser }) => (
  <div className="flex w-full min-w-0 flex-shrink-0 flex-col gap-4 md:w-72 lg:w-80 xl:w-96">
    <BandsPanel artists={organiser.artists} showDiagram={!hasAny} />
    <ShowsPanel shows={organiser.looseShows} />
  </div>
);

/** Bands, each holding its shows and whatever has been filed straight on it. */
const BandsPanel: FC<{
  artists: ReturnType<typeof useSetLists>['organiser']['artists'];
  showDiagram: boolean;
}> = ({ artists, showDiagram }) => {
  const { actions } = useSetLists();

  return (
    <section className="flex min-h-0 flex-[3] flex-col rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Bands &amp; Artists
        </span>
        <button
          type="button"
          onClick={() => actions.createArtist()}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
        >
          <Plus size={12} /> Band
        </button>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {artists.length > 0 ? (
          <div className="space-y-3">
            {artists.map(({ artist, shows, setLists }) => (
              <ArtistBox
                key={artist.id}
                artist={artist}
                shows={shows}
                setLists={setLists}
              />
            ))}
          </div>
        ) : showDiagram ? (
          <StructureDiagram />
        ) : (
          <p className="px-2 py-4 text-xs leading-relaxed text-white/35">
            No bands yet. Make one, then drag shows and set lists onto it.
          </p>
        )}
      </div>
    </section>
  );
};

/**
 * Shows in no band, under the bands they can be dragged into. Dropping a show
 * here is how it comes back out of one.
 */
const ShowsPanel: FC<{
  shows: { show: Show; setLists: SetList[] }[];
}> = ({ shows }) => {
  const { actions } = useSetLists();

  return (
    <section className="flex min-h-0 flex-[2] flex-col rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Shows &amp; Concerts
        </span>
        <button
          type="button"
          onClick={() => actions.createShow(undefined)}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
        >
          <Plus size={12} /> Show
        </button>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <LooseShows shows={shows} />
      </div>
    </section>
  );
};

/** Shows in no band. Dropping one here takes it out of the band it was in. */
const LooseShows: FC<{ shows: { show: Show; setLists: SetList[] }[] }> = ({
  shows,
}) => {
  const { actions } = useSetLists();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (!hasShowDrag(e.dataTransfer)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        const item = claimDrop(e, readShowDrag);
        if (item) actions.fileShowAt(item.showId, undefined, null);
      }}
      className={`min-h-full rounded-xl border border-dashed p-2 transition-colors ${
        over ? 'border-[#7ecfcf] bg-[#7ecfcf]/[0.06]' : 'border-transparent'
      }`}
    >
      <p className="mb-1.5 text-[11px] leading-relaxed text-white/30">
        {shows.length === 0
          ? 'Shows with no band. Drop one here to take it out of a band.'
          : 'Shows with no band — drag one onto a band to put it there.'}
      </p>
      {shows.map(({ show, setLists }) => (
        <div key={show.id}>
          <InsertLine before={show.id} />
          <ShowBox show={show} setLists={setLists} loose />
        </div>
      ))}
      <InsertLine before={null} />
    </div>
  );
};

/**
 * A band. One drop target for shows: anywhere on it, and the show joins.
 *
 * There is deliberately no second target inside it — a show is not dropped
 * "into" another show. Ordering is done by the thin lines between them, which
 * only appear while a show is being dragged, so at any moment there is exactly
 * one thing a drop can mean.
 */
const ArtistBox: FC<{
  artist: Artist;
  shows: { show: Show; setLists: SetList[] }[];
  setLists: SetList[];
}> = ({ artist, shows, setLists }) => {
  const { actions } = useSetLists();
  const [over, setOver] = useState(false);

  return (
    <div
      data-band={artist.id}
      onDragOver={(e) => {
        if (!hasShowDrag(e.dataTransfer)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        const item = claimDrop(e, readShowDrag);
        if (item) actions.fileShowAt(item.showId, artist.id, null);
      }}
      className={`rounded-xl border bg-white/[0.02] p-3 transition-colors ${
        over ? 'border-[#7ecfcf] bg-[#7ecfcf]/[0.06]' : 'border-white/10'
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
        className="ml-1.5 mt-2 border-l border-white/10 pl-3"
      >
        {shows.map(({ show, setLists: showLists }) => (
          <div key={show.id}>
            <InsertLine artistId={artist.id} before={show.id} />
            <ShowBox show={show} setLists={showLists} />
          </div>
        ))}
        <InsertLine artistId={artist.id} before={null} />
        {shows.length === 0 && (
          <p className="py-1 text-[11px] text-white/25">
            No shows yet — add one, or drag a show onto this band.
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * The gap between two shows. Invisible until a show is in the air, then it is
 * the only thing in the band that will take the drop — so "put it here" and
 * "put it in this band" can never be the same gesture.
 */
const InsertLine: FC<{ artistId?: string; before: string | null }> = ({
  artistId,
  before,
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
        if (!item || item.showId === before) return;
        // Any show, from anywhere: the gap says where, the band says whose.
        actions.fileShowAt(item.showId, artistId, before);
      }}
      aria-hidden
      className="group/line -my-1 py-1"
    >
      <div
        className={`h-0.5 rounded-full transition-colors ${
          over ? 'bg-[#7ecfcf]' : 'bg-transparent'
        }`}
      />
    </div>
  );
};

/** A show. It carries its set lists; it is not itself a target for shows. */
const ShowBox: FC<{ show: Show; setLists: SetList[]; loose?: boolean }> = ({
  show,
  setLists,
  loose,
}) => {
  const { actions } = useSetLists();
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
      className={`rounded-lg px-2.5 py-2 ${
        loose ? 'border border-white/10 bg-white/[0.02]' : ''
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
  const { actions } = useSetLists();
  const [over, setOver] = useState(false);
  const songs = list.entries.filter((e) => e.kind !== 'text').length;
  const texts = list.entries.length - songs;
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => setCardDrag(e.dataTransfer, { setListId: list.id })}
      // A chart dragged in from My Lead Sheets lands at the end of the set.
      onDragOver={(e) => {
        if (!hasSongDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        setOver(false);
        const item = claimDrop(e, readSongDrag);
        if (item) actions.addSong(list.id, item.songId);
      }}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
      className={`group flex cursor-pointer items-center justify-between rounded-xl border bg-white/[0.03] px-4 py-3 transition-colors ${
        over
          ? 'border-[#7ecfcf] bg-[#7ecfcf]/[0.08]'
          : 'border-white/10 hover:border-white/25'
      }`}
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
