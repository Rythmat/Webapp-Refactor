/* eslint-disable tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  SkipBack,
  SkipForward,
  Heart,
  Hexagon,
  Shuffle,
  FileMusic,
} from 'lucide-react';
import {
  GROOVES,
  GROOVE_GENRES,
  filterGrooves,
  getUniqueBpms,
  type GrooveItem,
} from '@/daw/data/groovesLibrary';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';

// ── Constants ──────────────────────────────────────────────────────────

/** Studio's ticks per quarter note, the resolution loadGrooveEvents returns. */
const OUR_PPQ = 480;

const TAG_COLORS: Record<string, string> = {
  'Hip Hop': '#8b5cf6',
  Trap: '#ef4444',
  'R&B': '#ec4899',
  Pop: '#3b82f6',
  Rock: '#f59e0b',
  Jazz: '#22c55e',
  House: '#06b6d4',
  Funk: '#f97316',
  Latin: '#eab308',
  Afrobeat: '#10b981',
  'Boom Bap': '#a78bfa',
  '808': '#f87171',
  Dark: '#6b7280',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] ?? 'var(--color-text-dim)';
}

type SortMode = 'newest' | 'oldest' | 'a-z';

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── GroovesBrowser ─────────────────────────────────────────────────────

interface GroovesBrowserProps {
  trackId: string;
}

export function GroovesBrowser({ trackId }: GroovesBrowserProps) {
  // Only controls that do something are shown. The "Your Library" filter, the
  // row checkboxes, the preview's Loop and Volume, the row ⋮ menu and the
  // Name sort arrows were removed: none of them was read by the list or the
  // preview (dock-instruments-11).

  // Filters
  const [bpmFilter, setBpmFilter] = useState<string>('All');
  const [genre, setGenre] = useState('All');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Sort & shuffle
  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Saved
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Preview
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewTimeouts = useRef<number[]>([]);

  const addMidiClip = useStore((s) => s.addMidiClip);
  const setSelectedClip = useStore((s) => s.setSelectedClip);
  const projectBpm = useStore((s) => s.bpm);
  const setBpm = useStore((s) => s.setBpm);

  // Pending groove awaiting BPM confirmation
  const [pendingGroove, setPendingGroove] = useState<GrooveItem | null>(null);
  const bpmPopoverRef = useRef<HTMLDivElement>(null);

  // Close BPM popover on outside click
  useEffect(() => {
    if (!pendingGroove) return;
    function handleMouseDown(e: MouseEvent) {
      if (bpmPopoverRef.current?.contains(e.target as Node)) return;
      setPendingGroove(null);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [pendingGroove]);

  const uniqueBpms = useMemo(() => getUniqueBpms(), []);

  // ── Filtering & sorting ──────────────────────────────────────────────

  const filtered = useMemo(() => {
    const bpm = bpmFilter === 'All' ? undefined : Number(bpmFilter);
    let items = filterGrooves(genre, '', bpm);

    if (showSavedOnly) {
      items = items.filter((g) => savedIds.has(g.id));
    }

    // Sort
    if (sortBy === 'oldest') {
      items = [...items].reverse();
    } else if (sortBy === 'a-z') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Shuffle (applied after sort when seed > 0)
    if (shuffleSeed > 0) {
      items = shuffleArray(items);
    }

    return items;
  }, [genre, bpmFilter, showSavedOnly, savedIds, sortBy, shuffleSeed]);

  const previewGroove = GROOVES.find((g) => g.id === previewId);

  // ── Toggle helpers ───────────────────────────────────────────────────

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Stop preview ───────────────────────────────────────────────────

  const stopPreview = useCallback(() => {
    for (const t of previewTimeouts.current) clearTimeout(t);
    previewTimeouts.current = [];
    setIsPlaying(false);
  }, []);

  // ── Audition groove through drum engine ────────────────────────────

  const playPreview = useCallback(
    async (groove: GrooveItem) => {
      stopPreview();
      setPreviewId(groove.id);
      setIsPlaying(true);

      const entry = trackEngineRegistry.get(trackId);
      if (!entry) {
        setIsPlaying(false);
        return;
      }

      // The same fetch, parse and rescale as adding the groove (and as the
      // practice tracks and demos), so a preview plays what Add would add.
      const events = await loadGrooveEvents(groove.id);
      if (!events) {
        setIsPlaying(false);
        return;
      }

      const msPerTick = 60_000 / groove.bpm / OUR_PPQ;
      const timeouts: number[] = [];
      let endMs = 0;
      for (const evt of events) {
        const startMs = evt.startTick * msPerTick;
        const stopMs = (evt.startTick + evt.durationTicks) * msPerTick;
        endMs = Math.max(endMs, stopMs);
        timeouts.push(
          window.setTimeout(() => {
            entry.trackEngine.noteOn(evt.note, evt.velocity);
          }, startMs),
        );
        timeouts.push(
          window.setTimeout(() => {
            entry.trackEngine.noteOff(evt.note);
          }, stopMs),
        );
      }
      timeouts.push(window.setTimeout(() => setIsPlaying(false), endMs + 100));

      previewTimeouts.current = timeouts;
    },
    [trackId, stopPreview],
  );

  // ── Load groove into track ─────────────────────────────────────────

  const doLoadGroove = useCallback(
    async (groove: GrooveItem) => {
      // loadGrooveEvents logs a groove it can't fetch or parse; that adds
      // nothing.
      const events = await loadGrooveEvents(groove.id);
      if (!events) return;

      const clipId = `clip-groove-${crypto.randomUUID().slice(0, 8)}`;
      addMidiClip(trackId, {
        id: clipId,
        name: groove.name,
        startTick: 0,
        events,
      });
      setSelectedClip(clipId, trackId);
    },
    [trackId, addMidiClip, setSelectedClip],
  );

  const loadGroove = useCallback(
    (groove: GrooveItem) => {
      if (groove.bpm !== projectBpm) {
        setPendingGroove(groove);
      } else {
        doLoadGroove(groove);
      }
    },
    [projectBpm, doLoadGroove],
  );

  // ── Navigate preview ───────────────────────────────────────────────

  const navigatePreview = useCallback(
    (dir: -1 | 1) => {
      if (!previewId) return;
      const idx = filtered.findIndex((g) => g.id === previewId);
      const next = filtered[idx + dir];
      if (next) playPreview(next);
    },
    [previewId, filtered, playPreview],
  );

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div
      data-tutorial-id="grooves-browser"
      className="relative flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ── Filter bar ────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* BPM dropdown */}
        <select
          value={bpmFilter}
          onChange={(e) => setBpmFilter(e.target.value)}
          className="text-[10px] rounded-full px-3 py-1 cursor-pointer"
          style={{
            backgroundColor:
              bpmFilter !== 'All'
                ? 'var(--color-surface-3)'
                : 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            outline: 'none',
          }}
        >
          <option value="All">BPM</option>
          {uniqueBpms.map((b) => (
            <option key={b} value={b}>
              {b} BPM
            </option>
          ))}
        </select>

        {/* Genre dropdown */}
        <select
          aria-label="Genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="text-[10px] rounded-full px-3 py-1 cursor-pointer"
          style={{
            backgroundColor:
              genre !== 'All'
                ? 'var(--color-surface-3)'
                : 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            outline: 'none',
          }}
        >
          {GROOVE_GENRES.map((g) => (
            <option key={g} value={g}>
              {g === 'All' ? 'Genre' : g}
            </option>
          ))}
        </select>

        {/* Saved toggle */}
        <FilterPill
          label="Saved"
          active={showSavedOnly}
          onClick={() => setShowSavedOnly((v) => !v)}
          icon={
            <Heart
              size={10}
              strokeWidth={2}
              fill={showSavedOnly ? 'currentColor' : 'none'}
            />
          }
        />
      </div>

      {/* ── List header ───────────────────────────────────────────── */}
      {/* Same gaps and column widths as GrooveRow, so Name and BPM sit over
          their columns. */}
      <div
        className="flex items-center gap-2.5 px-3 py-1.5 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Spans the row's thumbnail and play button. */}
        <span className="w-[56px] shrink-0" aria-hidden />
        <span
          className="text-[11px] uppercase tracking-wider flex-1"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Name
        </span>

        <span
          className="text-[11px] uppercase tracking-wider w-[48px] shrink-0 text-right"
          style={{ color: 'var(--color-text-dim)' }}
        >
          BPM
        </span>

        <div className="flex items-center justify-end gap-2 w-[84px] shrink-0">
          {/* Sort dropdown */}
          <select
            aria-label="Sort grooves"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortMode);
              setShuffleSeed(0);
            }}
            className="text-[10px] rounded-full px-2.5 py-1 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              outline: 'none',
            }}
          >
            {/* One option per order: a "Sort" placeholder also meant
                newest, so picking Newest showed "Sort" again. */}
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="a-z">Alphabetical</option>
          </select>

          {/* Shuffle */}
          <button
            onClick={() => setShuffleSeed((s) => s + 1)}
            className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
            style={{
              color: 'var(--color-text-dim)',
              background: 'none',
              border: 'none',
            }}
            title="Shuffle"
          >
            <Shuffle size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ── Groove list ───────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        {filtered.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-[10px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            No grooves found
          </div>
        ) : (
          filtered.map((groove) => (
            <GrooveRow
              key={groove.id}
              groove={groove}
              isActive={previewId === groove.id}
              isPlaying={previewId === groove.id && isPlaying}
              isSaved={savedIds.has(groove.id)}
              onPlay={() => {
                if (previewId === groove.id && isPlaying) stopPreview();
                else playPreview(groove);
              }}
              onAdd={() => loadGroove(groove)}
              onToggleSaved={() => toggleSaved(groove.id)}
            />
          ))
        )}
      </div>

      {/* ── Bottom preview bar ────────────────────────────────────── */}
      {previewGroove && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 shrink-0 border-t"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface-2)',
          }}
        >
          {/* Transport */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => navigatePreview(-1)}
              className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
              style={{
                color: 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
              }}
            >
              <SkipBack size={14} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                if (isPlaying) stopPreview();
                else playPreview(previewGroove);
              }}
              className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer"
              style={{
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-surface-3)',
                border: 'none',
              }}
            >
              {isPlaying ? (
                <Square size={10} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
            </button>
            <button
              onClick={() => navigatePreview(1)}
              className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
              style={{
                color: 'var(--color-text-dim)',
                background: 'none',
                border: 'none',
              }}
            >
              <SkipForward size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* Thumbnail */}
          <div
            className="w-8 h-8 rounded shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-surface-3)' }}
          >
            <FileMusic
              size={14}
              strokeWidth={1.5}
              style={{ color: 'var(--color-text-dim)' }}
            />
          </div>

          {/* Groove info */}
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span
              className="text-[11px] font-medium truncate"
              style={{ color: 'var(--color-text)' }}
            >
              {previewGroove.name}
            </span>
            <div className="flex items-center gap-1">
              <TagPill label={previewGroove.genre} />
              {previewGroove.tags.map((t) => (
                <TagPill key={t} label={t} />
              ))}
            </div>
          </div>

          {/* Hexagon add */}
          <button
            onClick={() => loadGroove(previewGroove)}
            className="flex items-center justify-center w-7 h-7 rounded cursor-pointer shrink-0"
            style={{
              color: 'var(--color-accent)',
              backgroundColor: 'var(--color-surface-3)',
              border: 'none',
            }}
            title="Add to track"
          >
            <Hexagon size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* BPM mismatch popover */}
      {pendingGroove && (
        <div
          ref={bpmPopoverRef}
          className="absolute left-1/2 top-1/2 z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded-xl p-4 shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
        >
          <p
            className="mb-1 text-xs font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Change Project BPM?
          </p>
          <p
            className="mb-4 text-[10px] leading-relaxed"
            style={{ color: 'var(--color-text-dim)' }}
          >
            This groove is{' '}
            <strong style={{ color: 'var(--color-text)' }}>
              {pendingGroove.bpm} BPM
            </strong>
            , but your project is{' '}
            <strong style={{ color: 'var(--color-text)' }}>
              {projectBpm} BPM
            </strong>
            .
          </p>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                setBpm(pendingGroove.bpm);
                doLoadGroove(pendingGroove);
                setPendingGroove(null);
              }}
              className="flex h-7 w-full cursor-pointer items-center justify-center rounded-md text-[10px] font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#000',
                border: 'none',
              }}
            >
              Change to {pendingGroove.bpm} BPM
            </button>
            <button
              onClick={() => {
                doLoadGroove(pendingGroove);
                setPendingGroove(null);
              }}
              className="flex h-7 w-full cursor-pointer items-center justify-center rounded-md text-[10px] font-medium transition-colors hover:bg-white/10"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              Add Anyway
            </button>
            <button
              onClick={() => setPendingGroove(null)}
              className="flex h-6 w-full cursor-pointer items-center justify-center text-[10px] transition-colors hover:underline"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-text-dim)',
                border: 'none',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FilterPill ─────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[10px] rounded-full px-3 py-1 cursor-pointer"
      style={{
        backgroundColor: active
          ? 'var(--color-surface-3)'
          : 'var(--color-surface-2)',
        color: active ? 'var(--color-text)' : 'var(--color-text-dim)',
        border: '1px solid var(--color-border)',
      }}
    >
      {label}
      <span
        style={{
          color: active ? 'var(--color-accent)' : 'var(--color-text-dim)',
        }}
      >
        {icon}
      </span>
    </button>
  );
}

// ── GrooveRow ──────────────────────────────────────────────────────────

function GrooveRow({
  groove,
  isActive,
  isPlaying,
  isSaved,
  onPlay,
  onAdd,
  onToggleSaved,
}: {
  groove: GrooveItem;
  isActive: boolean;
  isPlaying: boolean;
  isSaved: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 group border-b"
      style={{
        backgroundColor: isActive ? 'var(--color-surface-2)' : 'transparent',
        borderColor: 'var(--color-border)',
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Thumbnail */}
      <div
        className="w-8 h-8 rounded shrink-0 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-surface-3)' }}
      >
        <FileMusic
          size={14}
          strokeWidth={1.5}
          style={{ color: 'var(--color-text-dim)' }}
        />
      </div>

      {/* Play button */}
      <button
        onClick={onPlay}
        className="flex items-center justify-center shrink-0 cursor-pointer"
        style={{
          background: 'none',
          border: 'none',
          color: isPlaying ? 'var(--color-accent)' : 'var(--color-text-dim)',
        }}
      >
        {isPlaying ? (
          <Square size={12} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" />
        )}
      </button>

      {/* Name + tags */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: 'var(--color-text)' }}
        >
          {groove.name}
        </span>
        <div className="flex items-center gap-1">
          <TagPill label={groove.genre} />
          {groove.tags.map((t) => (
            <TagPill key={t} label={t} />
          ))}
        </div>
      </div>

      {/* BPM */}
      <span
        className="text-[10px] w-[48px] shrink-0 text-right"
        style={{
          color: 'var(--color-text-dim)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {groove.bpm}
      </span>

      {/* Row actions */}
      <div className="flex items-center justify-end gap-1 w-[84px] shrink-0">
        {/* Heart / save */}
        <button
          onClick={onToggleSaved}
          className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: isSaved ? '#ef4444' : 'var(--color-text-dim)',
            opacity: isSaved ? 1 : undefined,
          }}
        >
          <Heart
            size={14}
            strokeWidth={1.5}
            fill={isSaved ? 'currentColor' : 'none'}
          />
        </button>

        {/* Hexagon add */}
        <button
          onClick={onAdd}
          className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-dim)',
          }}
          title="Add to track"
        >
          <Hexagon size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

// ── TagPill ────────────────────────────────────────────────────────────

function TagPill({ label }: { label: string }) {
  const color = tagColor(label);
  return (
    <span
      className="flex items-center gap-0.5 text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-sm shrink-0"
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M1 6 L3 3 L5 5 L7 2 L9 4" />
      </svg>
      {label}
    </span>
  );
}
