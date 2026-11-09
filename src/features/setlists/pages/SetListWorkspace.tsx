import {
  AudioLines,
  ChevronLeft,
  ListMusic,
  Maximize,
  Minimize,
  ChevronRight,
  Copy,
  GripVertical,
  Plus,
  Printer,
  StickyNote,
  Trash2,
  Type,
} from 'lucide-react';
import { useCallback, useMemo, useState, type FC } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { normalizeSongMode } from '@/components/common/CircleOfFifthsSvg';
import { KeyWheel } from '@/components/common/KeyWheel';
import {
  GO_PILL,
  GO_PILL_ENABLED,
} from '@/components/promptBox/PromptBoxParts';
import { ChordChart } from '@/components/songLibrary/ChordChart';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/components/utilities';
import { SongRoutes } from '@/constants/routes';
import { SCREEN_SIZES } from '@/constants/theme';
import { semitonesToTonic } from '@/curriculum/songLibrary/transpose';
import type { Song } from '@/curriculum/types/songLibrary';
import { Button } from '@/daw/ui/Button';
import { SongPickerDialog } from '@/features/classroom/slides/wizard/SongPickerDialog';
import type { PrismModeSlug } from '@/hooks/data';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { StandVideo } from '../StandVideo';
import { entryChart } from '../entryChart';
import {
  dropIndex,
  hasDragItem,
  readDragItem,
  setDragItem,
} from '../setListDnd';
import { GLASS_CARD, GLASS_DIALOG } from '../setListsLook';
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
import { ChartStandBox, useChartStand } from '../useChartStand';
import { chartChangedSince, useSetLists } from '../useSetLists';
import { InlineTitle, PlaceFields } from './SetListsIndexPage';

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
  // Saving state and the print action live with the set panel now.
  const { blob, status, actions } = useSetLists();
  const [picking, setPicking] = useState(false);
  const [view, setView] = useSetViewMode();
  // The set is a column only where there is room for the set AND a chart:
  // the rail is 320 and a lead sheet wants ~700. Below that it is a drawer,
  // which is what gives an iPad in portrait its full width for the music
  // instead of 412px of it.
  const isWide = useMediaQuery(`(min-width: ${SCREEN_SIZES.lg}px)`);
  const [perform, setPerform] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const showRail = isWide && !perform;

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
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-white/70">
            {status === 'loading'
              ? 'Loading your set lists…'
              : 'That set list is gone.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(SongRoutes.setLists())}
            className={cn(GO_PILL, GO_PILL_ENABLED, 'mx-auto mt-4')}
          >
            Back to Set Lists
          </button>
        </div>
      </div>
    );

  const panel = (
    <SetPanel
      setListId={setListId}
      entries={entries}
      selectedId={selected?.id ?? ''}
      onSelect={select}
      onAddSong={() => setPicking(true)}
    />
  );

  return (
    <div
      // The Learn page's look (owner, 2026-10-25), on the app's black (no
      // glow here: owner, 2026-10-25): the set and the stand on the prompt
      // box's glass. Perform keeps the solid stage dark, over the whole
      // screen.
      className={
        perform
          ? 'fixed inset-0 z-[60] flex overflow-hidden'
          : 'flex h-full gap-2 overflow-hidden'
      }
      style={{
        ...(perform ? { background: '#101012' } : {}),
        // Over the whole screen the chart must keep clear of a notch and the
        // home indicator. These are zero today — index.html does not set
        // `viewport-fit=cover`, so the browser insets the viewport itself —
        // and become live the day it does, rather than silently overlapping.
        ...(perform
          ? {
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }
          : {}),
      }}
    >
      {/* ── The set: a column with room for it, a drawer without ── */}
      {showRail && (
        <aside
          className={
            perform
              ? 'flex h-full flex-shrink-0 flex-col border-r border-white/10'
              : cn(
                  GLASS_CARD,
                  'flex h-full flex-shrink-0 flex-col overflow-hidden',
                )
          }
          style={{
            width: RAIL_WIDTH,
            ...(perform ? { background: '#0c0c0e' } : {}),
          }}
        >
          {panel}
        </aside>
      )}

      {/* ── The stand ── */}
      <Viewer
        entry={selected}
        setListId={setListId}
        view={view}
        onViewChange={setView}
        onStep={step}
        perform={perform}
        onTogglePerform={() => setPerform((v) => !v)}
        onOpenSet={showRail ? undefined : () => setRailOpen(true)}
        onAddSong={() => setPicking(true)}
      />

      {!showRail && (
        <Sheet open={railOpen} onOpenChange={setRailOpen}>
          <SheetContent
            side="left"
            className="flex w-[86vw] max-w-[360px] flex-col gap-0 border-white/10 bg-[#101012]/85 p-0 text-white backdrop-blur-xl"
          >
            {panel}
          </SheetContent>
        </Sheet>
      )}

      <SongPickerDialog
        contentClassName={GLASS_DIALOG}
        glass
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
  onAddSong: () => void;
}> = ({ entries, setListId, selectedId, onSelect, onAddSong }) => {
  const { actions } = useSetLists();
  const [over, setOver] = useState<{
    index: number;
    half: 'top' | 'bottom';
  } | null>(null);

  // + Add Song as the Studio's + Add track, as the Set Lists page's + Add
  // Set List (owner, 2026-10-25), in a slot under the last entry. An empty
  // set's is in the middle of the stand instead.
  const addSong = (
    <div className="flex min-h-16 shrink-0 items-center justify-center px-2">
      <Button size="sm" variant="quiet" onClick={onAddSong}>
        <Plus aria-hidden />
        Add Song
      </Button>
    </div>
  );

  if (entries.length === 0) return <div className="flex-1" />;

  return (
    <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
      <ol>
        {entries.map((entry, index) => {
          const chart = entryChart(entry);
          const isSelected = entry.id === selectedId;
          // Its key center's colour, in this set's key (owner, 2026-10-25):
          // a bar on the row's edge, as Learn colours a key.
          const keyColor = chart?.song
            ? colorForKeyMode(
                chart.song.key.split(/\s+/)[0],
                normalizeSongMode(chart.song.mode) as PrismModeSlug,
              )
            : null;
          return (
            <li
              key={entry.id}
              onDragOver={(e) => {
                if (!hasDragItem(e.dataTransfer)) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setOver({
                  index,
                  half:
                    e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom',
                });
              }}
              onDragLeave={() =>
                setOver((o) => (o?.index === index ? null : o))
              }
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
                    ? 'border-t-2 border-white/70'
                    : 'border-b-2 border-white/70'
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
                className={`group relative mb-1 flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg py-1.5 pr-1.5 transition-colors ${
                  keyColor ? 'pl-3' : 'pl-1.5'
                } ${
                  isSelected
                    ? 'bg-white/10 ring-1 ring-white/25'
                    : 'hover:bg-white/5'
                }`}
              >
                {keyColor && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ background: keyColor }}
                  />
                )}
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
                      {/* A Studio copy keeps its mark; a song shows none
                          (owner, 2026-10-25: no note icon, no number). */}
                      {entry.kind === 'project' && (
                        <AudioLines
                          size={11}
                          className="flex-shrink-0 text-white/25"
                        />
                      )}
                      <span className="truncate text-sm text-white/90">
                        {chart?.title}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1.5 text-[11px] text-white/35',
                        entry.kind === 'project' && 'pl-4',
                      )}
                    >
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
      {addSong}
    </div>
  );
};

/** The key pill in the rail: this set's key for this chart. */
const EntryKey: FC<{
  entry: SetListSongEntry | SetListProjectEntry;
  setListId: string;
  /** Already in this set's key — the wheel moves from here. */
  inKey: Song;
  /** The rail's small pill, or the song's heading bar's (owner, 2026-10-25:
   *  transpose from either). */
  size?: 'sm' | 'md';
}> = ({ entry, setListId, inKey, size = 'sm' }) => {
  const { actions } = useSetLists();
  const shift = entry.semitones > 6 ? entry.semitones - 12 : entry.semitones;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'rounded-full border border-white/15 text-white/60 transition-colors hover:border-white/35 hover:text-white',
            size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 text-[10px]',
          )}
          title="Key for this set: pick a key center to transpose"
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

const Viewer: FC<{
  entry: SetListEntry | undefined;
  setListId: string;
  view: 'page' | 'scroll';
  onViewChange: (v: 'page' | 'scroll') => void;
  onStep: (delta: number) => boolean;
  /** The stand has the whole screen, and the screen is held awake. */
  perform: boolean;
  onTogglePerform: () => void;
  /** Set when the set itself is a drawer rather than a column. */
  onOpenSet?: () => void;
  /** Opens the song picker: the empty stand's + Add Song. */
  onAddSong: () => void;
}> = ({
  entry,
  setListId,
  view,
  onViewChange,
  onStep,
  perform,
  onTogglePerform,
  onOpenSet,
  onAddSong,
}) => {
  const { actions } = useSetLists();
  const [staves, setStaves] = useStavesPerPage();
  const [notesOpen, setNotesOpen] = useState(false);

  // The staff chart, on every device (owner, 2026-10-25: no Chart switcher,
  // no chord grid on a phone).
  const systemsPerPage = view === 'page' ? staves : undefined;

  const stand = useChartStand({
    view,
    measureDeps: [entry, staves],
    onStep,
    perform,
    onExit: onTogglePerform,
  });
  const { turn } = stand;

  const chart = useMemo(() => (entry ? entryChart(entry) : null), [entry]);
  const inKey = chart?.song ?? null;
  // A library chart is always played from the published version; this only
  // says it is not the one the player last looked at. A printed Studio page
  // has no published version to drift from.
  const updatedFingerprint =
    entry?.kind === 'song' ? chartChangedSince(entry) : null;

  if (!entry)
    return (
      <section
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          !perform && cn(GLASS_CARD, 'overflow-hidden'),
        )}
      >
        {/* Where the set is a drawer, the way to it. */}
        {onOpenSet && (
          <header className="flex flex-shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
            <button
              type="button"
              onClick={onOpenSet}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/70 hover:border-white/30"
            >
              <ListMusic size={16} /> The set
            </button>
          </header>
        )}
        {/* + Add Song as the Studio's + Add track, in the middle of the
            empty stand (owner, 2026-10-25): the song lands here. */}
        <div className="flex flex-1 items-center justify-center px-6">
          <Button size="sm" variant="quiet" onClick={onAddSong}>
            <Plus aria-hidden />
            Add Song
          </Button>
        </div>
      </section>
    );

  return (
    <section
      className={cn(
        'flex min-w-0 flex-1 flex-col',
        !perform && cn(GLASS_CARD, 'overflow-hidden'),
      )}
    >
      <header className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 md:gap-3 md:px-5 md:py-2.5">
        {onOpenSet && (
          <button
            type="button"
            onClick={onOpenSet}
            aria-label="Open the set"
            className="flex-shrink-0 rounded-lg border border-white/15 p-1.5 text-white/70 hover:border-white/30"
          >
            <ListMusic size={16} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-white">
            {chart?.title ?? 'Text page'}
          </h1>
          {chart && inKey && (
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-white/45">
              {chart.artist && <span className="truncate">{chart.artist}</span>}
              {/* The key center, as the rail's: pick one to transpose. */}
              {entry.kind !== 'text' && (
                <EntryKey
                  entry={entry}
                  setListId={setListId}
                  inKey={inKey}
                  size="md"
                />
              )}
              {entry.kind === 'project' && (
                <span className="shrink-0">from the Studio</span>
              )}
            </p>
          )}
        </div>

        {entry.kind !== 'text' && (
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className={`rounded-full border px-2 py-1 text-xs ${
              entry.notes
                ? 'border-white/40 bg-white/10 text-white'
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

        <div className="hidden items-center gap-1 rounded-full border border-white/10 p-0.5 sm:flex">
          {/* Scroll, then Page, by name alone (owner, 2026-10-25). */}
          {(['scroll', 'page'] as const).map((mode) => (
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
              {mode}
            </button>
          ))}
        </div>

        {/* Expand (Perform), last, in the corner (owner, 2026-10-25). */}
        <button
          type="button"
          onClick={onTogglePerform}
          aria-pressed={perform}
          title={
            perform
              ? 'Leave Perform (Esc)'
              : 'Perform — full screen, screen stays awake'
          }
          className={`flex-shrink-0 rounded-full border px-2 py-1 text-xs ${
            perform
              ? 'border-white/40 bg-white/10 text-white'
              : 'border-white/15 text-white/60 hover:border-white/30'
          }`}
        >
          {perform ? <Minimize size={13} /> : <Maximize size={13} />}
        </button>

        {/* No song and page count here (owner, 2026-10-25). */}
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

      <ChartStandBox stand={stand} view={view}>
        {inKey ? (
          <ChordChart
            key={`${entry.id}:${inKey.key}:${staves}`}
            song={inKey}
            systemsPerPage={systemsPerPage}
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
      </ChartStandBox>

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

/* ── The set itself, as a column or as a drawer ────────────────────────── */

const SetPanel: FC<{
  setListId: string;
  entries: SetListEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddSong: () => void;
}> = ({ setListId, entries, selectedId, onSelect, onAddSong }) => {
  const navigate = useNavigate();
  const { blob, status, saveState, actions, flush } = useSetLists();
  const list = blob.setLists[setListId];
  if (!list) return null;
  return (
    <>
      <header className="flex-shrink-0 border-b border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={() => navigate(SongRoutes.setLists())}
          className="mb-2 flex h-8 w-fit items-center gap-1 rounded-full border border-white/10 bg-white/10 pl-2 pr-3 text-[0.8125rem] text-white backdrop-blur-md transition-colors hover:bg-white/[0.14]"
        >
          <ChevronLeft size={14} /> Set Lists
        </button>
        <InlineTitle
          value={list.title}
          onCommit={(t) => actions.renameSetList(list.id, t)}
          className="text-base font-semibold text-white"
        />
        {/* Where it's played, under its title (owner, 2026-10-25): its
            Group and Date, always there to fill in, as on its card on Set
            Lists. */}
        <div className="mt-2">
          <PlaceFields setListId={setListId} fill />
        </div>
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
        selectedId={selectedId}
        onSelect={onSelect}
        onAddSong={onAddSong}
      />

      <div className="flex-shrink-0 border-t border-white/10 p-2">
        {/* Add Song is in the list above (owner, 2026-10-25). */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => actions.addText(setListId, '')}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/85"
          >
            <Type size={14} /> Add text
          </button>
        </div>
      </div>
    </>
  );
};
