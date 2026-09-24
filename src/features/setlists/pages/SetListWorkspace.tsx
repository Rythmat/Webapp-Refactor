import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Music,
  Plus,
  Printer,
  StickyNote,
  Trash2,
  Type,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { normalizeSongMode } from '@/components/common/CircleOfFifthsSvg';
import { KeyWheel } from '@/components/common/KeyWheel';
import { ChordChart } from '@/components/songLibrary/ChordChart';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SongRoutes } from '@/constants/routes';
import { semitonesToTonic } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';
import { SongPickerDialog } from '@/features/classroom/slides/wizard/SongPickerDialog';
import { StandVideo } from '../StandVideo';
import { entryChart } from '../entryChart';
import {
  dropIndex,
  hasDragItem,
  readDragItem,
  setDragItem,
} from '../setListDnd';
import {
  STAVES_PER_PAGE,
  useSetViewMode,
  useStavesPerPage,
} from '../setViewPreference';
import type {
  SetListEntry,
  SetListProjectEntry,
  SetListSongEntry,
} from '../types';
import { chartChangedSince, useSetLists } from '../useSetLists';
import { InlineTitle } from './SetListsIndexPage';

/**
 * A set list as a place to stand and play.
 *
 * The set stays on the left the whole time — every song and text page in
 * order, draggable, one click to put it on the stand — and the chart fills the
 * rest of the screen. Nothing here navigates away from the set: moving through
 * it is moving down the rail, which is what a player does when the singer
 * skips two songs and then calls one back.
 *
 * Page view turns whole screens with ← and →, the way a foot pedal will;
 * scroll view moves continuously with ↑ and ↓.
 */

const RAIL_WIDTH = 320;

export const SetListWorkspace: FC = () => {
  const { setListId = '' } = useParams<{ setListId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { blob, status, saveState, actions, flush } = useSetLists();
  const [picking, setPicking] = useState(false);
  const [view, setView] = useSetViewMode();

  const list = blob.setLists[setListId];
  const entries = useMemo(() => list?.entries ?? [], [list]);
  const selectedId = params.get('entry') ?? entries[0]?.id ?? '';
  const selectedIndex = Math.max(
    0,
    entries.findIndex((e) => e.id === selectedId),
  );
  const selected = entries[selectedIndex];

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set('entry', id);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const step = useCallback(
    (delta: number) => {
      const next = entries[selectedIndex + delta];
      if (next) select(next.id);
      return !!next;
    },
    [entries, selectedIndex, select],
  );

  if (!list)
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: '#101012' }}
      >
        <div className="text-center">
          <p className="text-white/70">
            {status === 'loading'
              ? 'Loading your set lists…'
              : 'That set list is gone.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(SongRoutes.setLists())}
            className="mt-3 text-sm text-[#7ecfcf] hover:underline"
          >
            Back to Set Lists
          </button>
        </div>
      </div>
    );

  const show = blob.shows[list.showId];
  const artist = show ? blob.artists[show.artistId] : undefined;

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: '#101012' }}
    >
      {/* ── The set, always in view ── */}
      <aside
        className="flex h-full flex-shrink-0 flex-col border-r border-white/10"
        style={{ width: RAIL_WIDTH, background: '#0c0c0e' }}
      >
        <header className="flex-shrink-0 border-b border-white/10 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate(SongRoutes.setLists())}
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-white/50 hover:text-white"
          >
            <ChevronLeft size={14} /> Set Lists
          </button>
          <div className="flex items-center gap-1 text-[11px] text-white/35">
            {artist && (
              <InlineTitle
                value={artist.title}
                onCommit={(t) => actions.renameArtist(artist.id, t)}
              />
            )}
            <span>▸</span>
            {show && (
              <InlineTitle
                value={show.title}
                onCommit={(t) => actions.renameShow(show.id, t)}
              />
            )}
          </div>
          <InlineTitle
            value={list.title}
            onCommit={(t) => actions.renameSetList(list.id, t)}
            className="text-base font-semibold text-white"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-white/35">
              {status === 'signedOut'
                ? 'Sign in to save'
                : saveState === 'unsaved'
                  ? 'Not saved'
                  : saveState === 'saving'
                    ? 'Saving…'
                    : 'Saved ✓'}
            </span>
            <button
              type="button"
              onClick={async () => {
                await flush();
                navigate(SongRoutes.setListPrint({ setListId }));
              }}
              className="inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </header>

        <EntryRail
          entries={entries}
          setListId={setListId}
          selectedId={selected?.id ?? ''}
          onSelect={select}
        />

        <div className="flex-shrink-0 border-t border-white/10 p-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7ecfcf] py-1.5 text-xs font-semibold text-[#191919]"
            >
              <Plus size={14} /> Add song
            </button>
            <button
              type="button"
              onClick={() => actions.addText(setListId, '')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 py-1.5 text-xs text-white/80 hover:border-white/30"
            >
              <Type size={14} /> Add text
            </button>
          </div>
        </div>
      </aside>

      {/* ── The stand ── */}
      <Viewer
        entry={selected}
        setListId={setListId}
        view={view}
        onViewChange={setView}
        position={{ index: selectedIndex, total: entries.length }}
        onStep={step}
      />

      <SongPickerDialog
        open={picking}
        onOpenChange={setPicking}
        onSelect={(song) => {
          actions.addSong(setListId, song.id);
          setPicking(false);
        }}
      />
    </div>
  );
};

/* ── The rail ─────────────────────────────────────────────────────────── */

const EntryRail: FC<{
  entries: SetListEntry[];
  setListId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ entries, setListId, selectedId, onSelect }) => {
  const { actions } = useSetLists();
  const [over, setOver] = useState<{
    index: number;
    half: 'top' | 'bottom';
  } | null>(null);

  if (entries.length === 0)
    return (
      <div className="flex-1 px-3 py-6 text-center text-xs text-white/35">
        Nothing in this set yet. Add a song, or a note to yourself.
      </div>
    );

  return (
    <ol className="custom-scrollbar flex-1 overflow-y-auto p-2">
      {entries.map((entry, index) => {
        const chart = entryChart(entry);
        const isSelected = entry.id === selectedId;
        return (
          <li
            key={entry.id}
            onDragOver={(e) => {
              if (!hasDragItem(e.dataTransfer)) return;
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              setOver({
                index,
                half: e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom',
              });
            }}
            onDragLeave={() => setOver((o) => (o?.index === index ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              const item = readDragItem(e.dataTransfer);
              const half = over?.index === index ? over.half : 'top';
              setOver(null);
              if (!item || item.setListId !== setListId) return;
              actions.moveEntry(
                setListId,
                item.index,
                dropIndex(item.index, index, half),
              );
            }}
            className={
              over?.index === index
                ? over.half === 'top'
                  ? 'border-t-2 border-[#7ecfcf]'
                  : 'border-b-2 border-[#7ecfcf]'
                : ''
            }
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(entry.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(entry.id);
                }
              }}
              className={`group mb-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors ${
                isSelected
                  ? 'bg-[#7ecfcf]/15 ring-1 ring-[#7ecfcf]/40'
                  : 'hover:bg-white/5'
              }`}
            >
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragItem(e.dataTransfer, {
                    setListId,
                    entryId: entry.id,
                    index,
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                className="cursor-grab text-white/20 hover:text-white/60 active:cursor-grabbing"
                title="Drag to reorder"
                aria-label="Drag to reorder"
              >
                <GripVertical size={14} />
              </span>
              <span className="w-4 flex-shrink-0 text-right text-[11px] text-white/30">
                {index + 1}
              </span>
              {entry.kind === 'text' ? (
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm text-white/70">
                    <Type size={11} className="flex-shrink-0 text-white/25" />
                    <span className="truncate italic">
                      {entry.text.trim() || 'Text page'}
                    </span>
                  </span>
                </span>
              ) : (
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    {entry.kind === 'project' ? (
                      <AudioLines
                        size={11}
                        className="flex-shrink-0 text-white/25"
                      />
                    ) : (
                      <Music
                        size={11}
                        className="flex-shrink-0 text-white/25"
                      />
                    )}
                    <span className="truncate text-sm text-white/90">
                      {chart?.title}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 pl-4 text-[11px] text-white/35">
                    <span className="truncate">
                      {chart?.artist ??
                        (entry.kind === 'project'
                          ? 'From the Studio'
                          : 'Missing song')}
                    </span>
                    {chart?.song && (
                      <EntryKey
                        entry={entry}
                        setListId={setListId}
                        inKey={chart.song}
                      />
                    )}
                  </span>
                </span>
              )}
              <span className="flex flex-shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.duplicateEntry(setListId, entry.id);
                  }}
                  className="rounded p-0.5 text-white/30 hover:text-white"
                >
                  <Copy size={12} />
                </button>
                <button
                  type="button"
                  aria-label="Remove from set"
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.removeEntry(setListId, entry.id);
                  }}
                  className="rounded p-0.5 text-white/30 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/** The key pill in the rail: this set's key for this chart. */
const EntryKey: FC<{
  entry: SetListSongEntry | SetListProjectEntry;
  setListId: string;
  /** Already in this set's key — the wheel moves from here. */
  inKey: Song;
}> = ({ entry, setListId, inKey }) => {
  const { actions } = useSetLists();
  const shift = entry.semitones > 6 ? entry.semitones - 12 : entry.semitones;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="rounded-full border border-white/15 px-1.5 text-[10px] text-white/60 hover:border-white/35"
          title="Key for this set"
        >
          {inKey.key}
          {shift !== 0 && (
            <span className="ml-0.5 text-white/40">
              {shift > 0 ? `+${shift}` : shift}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        className="w-auto rounded-xl border-0 p-4"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <KeyWheel
          selectedPc={((inKey.keyRoot % 12) + 12) % 12}
          mode={normalizeSongMode(inKey.mode)}
          onSelectPc={(pc) =>
            actions.setEntryTranspose(
              setListId,
              entry.id,
              entry.semitones + semitonesToTonic(inKey, pc),
            )
          }
          ariaLabel="Key for this set"
          footer={
            <span
              className="text-[10px] font-medium capitalize"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {inKey.key.replace(/^[A-G](?:♯|♭)?\s*/, '') || 'major'}
            </span>
          }
        />
      </PopoverContent>
    </Popover>
  );
};

/* ── The stand ────────────────────────────────────────────────────────── */

/** A page of the chart: where it starts and how tall it is, unzoomed. */
interface ChartPage {
  top: number;
  height: number;
}

const Viewer: FC<{
  entry: SetListEntry | undefined;
  setListId: string;
  view: 'page' | 'scroll';
  onViewChange: (v: 'page' | 'scroll') => void;
  position: { index: number; total: number };
  onStep: (delta: number) => boolean;
}> = ({ entry, setListId, view, onViewChange, position, onStep }) => {
  const { actions } = useSetLists();
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [staves, setStaves] = useStavesPerPage();
  /** Where each page starts and how tall it is, in the chart's own pixels.
   *  Empty until measured, so the first paint is not clipped to nothing. */
  const [pages, setPages] = useState<ChartPage[]>([]);
  /** One zoom for the whole chart, so the staves are the same size on
   *  every page — the fullest page is the one that has to fit. */
  const [zoom, setZoom] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const pageCount = Math.max(1, pages.length);

  const chart = useMemo(() => (entry ? entryChart(entry) : null), [entry]);
  const inKey = chart?.song ?? null;
  // A library chart is always played from the published version; this only
  // says it is not the one the player last looked at. A printed Studio page
  // has no published version to drift from.
  const updatedFingerprint =
    entry?.kind === 'song' ? chartChangedSince(entry) : null;

  // Where the pages fall, and how far the chart has to shrink to fit one.
  //
  // ChordChart marks the system that opens each page (it counts staves across
  // section boundaries, so a page is always the same number of staves). Those
  // marks give the page tops; a page's height is the distance to the next one.
  // `offsetTop` is layout, not paint, so the zoom below does not disturb it.
  useEffect(() => {
    setPage(0);
    const measure = () => {
      const box = boxRef.current;
      const content = contentRef.current;
      if (!box || !content) return;
      const base = content.offsetTop;
      const tops = [
        0,
        ...Array.from(
          content.querySelectorAll<HTMLElement>('[data-page-start]'),
        ).map((el) => el.offsetTop - base),
      ];
      const total = content.offsetHeight;
      const next = tops.map((top, i) => ({
        top,
        height: Math.max(1, (tops[i + 1] ?? total) - top),
      }));
      const tallest = Math.max(...next.map((p) => p.height));
      setPages(next);
      setZoom(Math.min(1, box.clientHeight / tallest));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (boxRef.current) observer.observe(boxRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [entry, view, staves]);

  const turn = useCallback(
    (delta: number) => {
      setPage((current) => {
        const next = current + delta;
        // Past either edge, the next thing in the set comes up — what a
        // player expects from a pedal at the end of a chart.
        if (next < 0) {
          // Off the front: the previous piece comes up, at its first page.
          onStep(-1);
          return 0;
        }
        if (next >= pageCount) return onStep(1) ? 0 : current;
        return next;
      });
    },
    [onStep, pageCount],
  );

  // Arrow keys: pages across, scrolling down, and always the set itself.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      const box = boxRef.current;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        view === 'page' ? turn(1) : onStep(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        view === 'page' ? turn(-1) : onStep(-1);
      } else if (e.key === 'ArrowDown') {
        if (view === 'page') {
          e.preventDefault();
          onStep(1);
        } else if (box) {
          e.preventDefault();
          box.scrollBy({ top: box.clientHeight * 0.8, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        if (view === 'page') {
          e.preventDefault();
          onStep(-1);
        } else if (box) {
          e.preventDefault();
          box.scrollBy({ top: -box.clientHeight * 0.8, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn, onStep, view]);

  if (!entry)
    return (
      <div className="flex flex-1 items-center justify-center text-white/40">
        Add a song to this set to put it on the stand.
      </div>
    );

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-white/10 px-5 py-2.5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-white">
            {chart?.title ?? 'Text page'}
          </h1>
          {chart && inKey && (
            <p className="truncate text-xs text-white/45">
              {chart.artist ? `${chart.artist} · ` : ''}
              {inKey.key}
              {entry.kind === 'project' && ' · from the Studio'}
            </p>
          )}
        </div>

        {entry.kind !== 'text' && (
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className={`rounded-full border px-2 py-1 text-xs ${
              entry.notes
                ? 'border-[#7ecfcf]/50 text-[#7ecfcf]'
                : 'border-white/15 text-white/60 hover:border-white/30'
            }`}
          >
            <StickyNote size={13} className="mr-1 inline" />
            Note
          </button>
        )}

        <StandVideo song={inKey} recordedKey={chart?.recordedKey} />

        {view === 'page' && inKey && (
          <label className="flex flex-shrink-0 items-center gap-1 text-xs text-white/40">
            <span className="hidden sm:inline">Staves</span>
            <select
              value={staves}
              onChange={(e) =>
                setStaves(
                  Number(e.target.value) as (typeof STAVES_PER_PAGE)[number],
                )
              }
              className="rounded-full border border-white/15 bg-transparent px-1.5 py-0.5 text-xs text-white/70 outline-none focus:border-white/35"
              title="Staves on a page"
            >
              {STAVES_PER_PAGE.map((n) => (
                <option key={n} value={n} className="bg-[#161618]">
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1 rounded-full border border-white/10 p-0.5">
          {(['page', 'scroll'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewChange(mode)}
              aria-pressed={view === mode}
              className={`rounded-full px-2.5 py-1 text-xs capitalize transition-colors ${
                view === mode
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {mode} view
            </button>
          ))}
        </div>

        <span className="text-xs tabular-nums text-white/40">
          {position.index + 1}/{position.total}
          {view === 'page' && pageCount > 1 && ` · p${page + 1}/${pageCount}`}
        </span>
      </header>

      {entry.kind === 'song' && updatedFingerprint && (
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-amber-300/20 bg-amber-300/[0.06] px-5 py-1.5">
          <span className="text-xs text-amber-200/90">
            This chart has been corrected since you added it — you are looking
            at the new one.
          </span>
          <button
            type="button"
            onClick={() =>
              actions.acceptChartUpdate(setListId, entry.id, updatedFingerprint)
            }
            className="text-xs text-amber-200/70 underline-offset-2 hover:underline"
          >
            Got it
          </button>
        </div>
      )}

      {entry.kind !== 'text' && (notesOpen || entry.notes) && (
        <input
          value={entry.notes ?? ''}
          autoFocus={notesOpen && !entry.notes}
          onChange={(e) =>
            actions.setEntryNotes(setListId, entry.id, e.target.value)
          }
          placeholder="count in 4 · cut last chorus · watch the drummer"
          className="flex-shrink-0 border-b border-white/10 bg-transparent px-5 py-1.5 text-sm text-white/80 outline-none placeholder:text-white/25"
        />
      )}

      <div
        ref={boxRef}
        className={
          view === 'page'
            ? 'relative min-h-0 flex-1 overflow-hidden'
            : 'custom-scrollbar relative min-h-0 flex-1 overflow-y-auto'
        }
      >
        {/* Page view is three nested jobs: zoom the whole chart down until a
            page fits, clip to exactly this page's height so the next page's
            staves cannot show through under a short one, and slide the chart
            up to the page being read. */}
        <div
          style={
            view === 'page'
              ? { transform: `scale(${zoom})`, transformOrigin: 'top center' }
              : undefined
          }
        >
          <div
            style={
              view === 'page'
                ? { height: pages[page]?.height, overflow: 'hidden' }
                : undefined
            }
          >
            <div
              ref={contentRef}
              className={view === 'page' ? 'px-5' : 'px-5 py-4'}
              style={
                view === 'page'
                  ? {
                      transform: `translateY(-${pages[page]?.top ?? 0}px)`,
                      transition: 'transform 180ms ease-out',
                    }
                  : undefined
              }
            >
              {inKey ? (
                <ChordChart
                  key={`${entry.id}:${inKey.key}:${staves}`}
                  song={inKey}
                  systemsPerPage={view === 'page' ? staves : undefined}
                />
              ) : chart ? (
                <p className="text-white/40">{chart.missing}</p>
              ) : entry.kind === 'text' ? (
                <textarea
                  value={entry.text}
                  onChange={(e) =>
                    actions.setEntryText(setListId, entry.id, e.target.value)
                  }
                  placeholder="A page for the band — transitions, staging, anything. Prints as its own page."
                  className="min-h-[60vh] w-full resize-none bg-transparent leading-relaxed text-white/90 outline-none placeholder:text-white/25"
                  style={{ fontSize: '16pt' }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {view === 'page' && (
        <footer className="flex flex-shrink-0 items-center justify-between border-t border-white/10 px-5 py-1.5">
          <button
            type="button"
            onClick={() => turn(-1)}
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <span className="text-[11px] text-white/30">
            ← → turn pages · ↑ ↓ change song
          </span>
          <button
            type="button"
            onClick={() => turn(1)}
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"
          >
            Next <ChevronRight size={14} />
          </button>
        </footer>
      )}
    </section>
  );
};
