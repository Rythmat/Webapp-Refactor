/* eslint-disable tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Play,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  Hexagon,
  Shuffle,
  MoreVertical,
  Repeat,
  Check,
  ChevronUp,
  ChevronDown,
  FileMusic,
} from 'lucide-react';
import {
  GROOVES,
  GROOVE_GENRES,
  filterGrooves,
  getUniqueBpms,
  type GrooveItem,
} from '@/daw/data/groovesLibrary';
import { importMidiFile } from '@/daw/midi/MidiFileIO';
import type { MidiNoteEvent } from '@prism/engine';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';

// ── Constants ──────────────────────────────────────────────────────────

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
  // Filters
  const [myLibrary, setMyLibrary] = useState(false);
  const [bpmFilter, setBpmFilter] = useState<string>('All');
  const [genre, setGenre] = useState('All');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Sort & shuffle
  const [sortBy, setSortBy] = useState<SortMode>('newest');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Selection & saved
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Preview
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [volume, setVolume] = useState(80);
  const previewTimeouts = useRef<number[]>([]);

  const addMidiClip = useStore((s) => s.addMidiClip);
  const setSelectedClip = useStore((s) => s.setSelectedClip);

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

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
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

      try {
        const resp = await fetch(groove.url);
        if (!resp.ok) {
          setIsPlaying(false);
          return;
        }
        const buf = await resp.arrayBuffer();
        const sequences = importMidiFile(buf);
        if (sequences.length === 0) {
          setIsPlaying(false);
          return;
        }

        const seq = sequences[0];
        const ppq = seq.ticksPerQuarterNote;
        const bpm = groove.bpm;
        const msPerTick = 60_000 / bpm / OUR_PPQ;

        const timeouts: number[] = [];
        for (const evt of seq.events) {
          const scaledStart = Math.round((evt.startTick / ppq) * OUR_PPQ);
          const scaledDur = Math.round((evt.durationTicks / ppq) * OUR_PPQ);
          const startMs = scaledStart * msPerTick;
          const endMs = (scaledStart + scaledDur) * msPerTick;

          timeouts.push(
            window.setTimeout(() => {
              entry.trackEngine.noteOn(evt.note, evt.velocity);
            }, startMs),
          );
          timeouts.push(
            window.setTimeout(() => {
              entry.trackEngine.noteOff(evt.note);
            }, endMs),
          );
        }

        const maxMs = seq.events.reduce((max: number, evt: MidiNoteEvent) => {
          const s = Math.round((evt.startTick / ppq) * OUR_PPQ);
          const d = Math.round((evt.durationTicks / ppq) * OUR_PPQ);
          return Math.max(max, (s + d) * msPerTick);
        }, 0);
        timeouts.push(
          window.setTimeout(() => setIsPlaying(false), maxMs + 100),
        );

        previewTimeouts.current = timeouts;
      } catch {
        setIsPlaying(false);
      }
    },
    [trackId, stopPreview],
  );

  // ── Load groove into track ─────────────────────────────────────────

  const loadGroove = useCallback(
    async (groove: GrooveItem) => {
      try {
        const resp = await fetch(groove.url);
        if (!resp.ok) return;
        const buf = await resp.arrayBuffer();
        const sequences = importMidiFile(buf);
        if (sequences.length === 0) return;

        const seq = sequences[0];
        const ppq = seq.ticksPerQuarterNote;
        const events = seq.events.map((evt: MidiNoteEvent) => ({
          ...evt,
          startTick: Math.round((evt.startTick / ppq) * OUR_PPQ),
          durationTicks: Math.round((evt.durationTicks / ppq) * OUR_PPQ),
        }));

        const clipId = `clip-groove-${crypto.randomUUID().slice(0, 8)}`;
        addMidiClip(trackId, {
          id: clipId,
          name: groove.name,
          startTick: 0,
          events,
        });
        setSelectedClip(clipId, trackId);
      } catch (err) {
        console.error('Failed to load groove:', err);
      }
    },
    [trackId, addMidiClip, setSelectedClip],
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
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ── Filter bar ────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Your Library toggle */}
        <FilterPill
          label="Your Library"
          active={myLibrary}
          onClick={() => setMyLibrary((v) => !v)}
          icon={<Check size={10} strokeWidth={2.5} />}
        />

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
      <div
        className="flex items-center px-3 py-1.5 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-[9px] uppercase tracking-wider w-[52px] shrink-0"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Selection
        </span>
        <span
          className="text-[9px] uppercase tracking-wider flex items-center gap-1 flex-1"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Name
          <span className="flex flex-col" style={{ lineHeight: 0 }}>
            <ChevronUp size={7} strokeWidth={2} />
            <ChevronDown size={7} strokeWidth={2} />
          </span>
        </span>

        <span
          className="text-[9px] uppercase tracking-wider w-[48px] shrink-0 text-right"
          style={{ color: 'var(--color-text-dim)' }}
        >
          BPM
        </span>

        <div className="flex items-center justify-end gap-2 w-[84px] shrink-0">
          {/* Sort dropdown */}
          <select
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
            <option value="newest">Sort</option>
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
              isSelected={selectedIds.has(groove.id)}
              isSaved={savedIds.has(groove.id)}
              onPlay={() => {
                if (previewId === groove.id && isPlaying) stopPreview();
                else playPreview(groove);
              }}
              onAdd={() => loadGroove(groove)}
              onToggleSaved={() => toggleSaved(groove.id)}
              onToggleSelected={() => toggleSelected(groove.id)}
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

          {/* Loop toggle */}
          <button
            onClick={() => setLoopEnabled((v) => !v)}
            className="flex items-center justify-center w-6 h-6 rounded cursor-pointer shrink-0"
            style={{
              color: loopEnabled
                ? 'var(--color-accent)'
                : 'var(--color-text-dim)',
              background: 'none',
              border: 'none',
            }}
            title="Loop"
          >
            <Repeat size={13} strokeWidth={1.5} />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Volume2 size={12} style={{ color: 'var(--color-text-dim)' }} />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 h-1 cursor-pointer"
              style={{
                accentColor: 'var(--color-text)',
              }}
            />
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
  isSelected,
  isSaved,
  onPlay,
  onAdd,
  onToggleSaved,
  onToggleSelected,
}: {
  groove: GrooveItem;
  isActive: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  isSaved: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onToggleSaved: () => void;
  onToggleSelected: () => void;
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
      {/* Checkbox */}
      <button
        onClick={onToggleSelected}
        className="flex items-center justify-center w-4 h-4 rounded shrink-0 cursor-pointer"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
          color: isSelected ? '#000' : 'transparent',
        }}
      >
        {isSelected && <Check size={10} strokeWidth={3} />}
      </button>

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

        {/* Three-dot menu */}
        <button
          className="flex items-center justify-center w-6 h-6 rounded cursor-pointer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-dim)',
          }}
        >
          <MoreVertical size={14} strokeWidth={1.5} />
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
