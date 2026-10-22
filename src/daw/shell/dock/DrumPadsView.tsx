import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Loader2, Play, Plus, Square } from 'lucide-react';
import { cn } from '@/components/utilities';
import {
  LIST,
  ROW,
  ROW_OFF,
  ROW_ON,
} from '@/daw/components/Controls/SoundBrowser';
import { auditionNote } from '@/daw/audio/auditionNote';
import {
  DRUM_TYPING_OCTAVE,
  typingKeyFor,
} from '@/daw/commands/musicalTypingMap';
import {
  GROOVE_GENRES,
  GROOVES,
  type GrooveItem,
} from '@/daw/data/groovesLibrary';
import { addGrooveClip, grooveInPattern } from '@/daw/drums/addGrooveClip';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import {
  DRUM_KITS,
  DRUM_PADS,
  DrumMachineEngine,
} from '@/daw/instruments/DrumMachineEngine';
import { padLabel } from '@/daw/instruments/drumKits';
import { liveMidiTargetIds } from '@/daw/midi/liveTarget';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import { resolveEditorClip } from '@/daw/model/editorClip';
import { useStore, type Track } from '@/daw/store';
import { useBrowserStore } from '@/daw/shell/inspector/browser/browserStore';
import {
  fromEvents,
  startNotesPreview,
  stopPreview,
} from '@/daw/shell/inspector/browser/preview';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { FoldableDockColumn } from './FoldableDockColumn';
import {
  badgePoint,
  KIT_BADGES,
  KIT_DRUMS,
  KIT_HEIGHT,
  KIT_WIDTH,
} from './drumKitLayout';

// ── Drums: the Instrument tab (milestone 2.9) ──────────────────────────────
//
// The kit as a drummer sees it, after Soundtrap's drum Instrument tab (the
// owner's reference, 2026-10-16): a top-down kit of round pads, each with
// the computer key that plays it (the kit's own octave, DRUM_TYPING_OCTAVE:
// A is the kick), and the sidestick and the open and pedal hats as badges
// on the rims of the drums they're played on. A click plays a pad. The
// menu at the left is the drums' own (owner, 2026-10-22), in the look of
// every MIDI instrument's (SoundBrowser): the kits in its first column
// (Natural, 808, House…; the list keeps the lesson anchor
// drum-kit-selector), the grooves in its second, by genre. A kit picked
// plays the pads; a groove has Preview, to hear it first, and Add, to put
// it on the timeline (addGrooveClip). The kit takes the rest of the tab: the track's
// and the pads' volume and pan knobs went from it (owner, 2026-10-21; the
// track's are its row's, the pads' the drum grid's). Our look, not
// Soundtrap's: neutral rings, the white key badges, Glacial and the 12 px
// floor. The beat itself is edited on the drum grid in Notes.

/** The grooves, by genre, in the Grooves tab's genre order. */
const GROOVE_GROUPS: readonly { genre: string; grooves: GrooveItem[] }[] =
  GROOVE_GENRES.filter((g) => g !== 'All')
    .map((genre) => ({
      genre,
      grooves: GROOVES.filter((g) => g.genre === genre),
    }))
    .filter((group) => group.grooves.length > 0);

const keyOf = (note: number) => typingKeyFor(note, DRUM_TYPING_OCTAVE);

/** An element's size as it resizes; 0 × 0 before it is laid out. */
function useBoxSize(ref: RefObject<HTMLElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

export function DrumPadsView({ trackId }: { trackId: string }) {
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  const [hit, setHit] = useState<number | null>(null);

  const play = useCallback(
    (note: number) => {
      auditionNote(trackId, note, 100);
      setHit(note);
    },
    [trackId],
  );
  useEffect(() => {
    if (hit === null) return;
    const id = window.setTimeout(() => setHit(null), 160);
    return () => window.clearTimeout(id);
  }, [hit]);

  // The kits are the dock's sound column (SoundBrowser), as every MIDI
  // instrument's sounds are.
  const kit = track?.drumKit ?? 'natural';
  const setDrumKit = useStore((s) => s.setDrumKit);
  const [loadingKit, setLoadingKit] = useState<string | null>(null);
  const changeKit = async (kitId: string) => {
    setDrumKit(trackId, kitId);
    // setDrumKit does nothing while a collaborator holds the track.
    const took =
      useStore.getState().tracks.find((t) => t.id === trackId)?.drumKit ===
      kitId;
    if (!took) return;
    const state = trackEngineRegistry.get(trackId);
    if (!(state?.instrument instanceof DrumMachineEngine)) return;
    setLoadingKit(kitId);
    try {
      await state.instrument.setKit(kitId);
    } catch (err) {
      console.error('[DrumPadsView] Failed to load kit:', err);
    } finally {
      setLoadingKit((k) => (k === kitId ? null : k));
    }
  };

  // The grooves: listen first, then add (owner, 2026-10-22). Preview plays
  // one on this track's kit at the song's tempo (the Library's preview, one
  // at a time across the Library and the dock); Add puts it on the timeline
  // at the playhead's bar (addGrooveClip). The groove the drum grid shows
  // is marked.
  const patternName = useStore(
    (s) => resolveEditorClip(s, trackId)?.name ?? undefined,
  );
  const inPattern = grooveInPattern(patternName, GROOVES);
  const previewing = useBrowserStore((s) =>
    s.preview?.itemId.startsWith(previewPrefix(trackId))
      ? s.preview.itemId.slice(previewPrefix(trackId).length)
      : null,
  );
  const togglePreview = (item: GrooveItem) => {
    if (previewing === item.id) {
      stopPreview();
      return;
    }
    const entry = trackEngineRegistry.get(trackId);
    if (!entry) return;
    void startNotesPreview(
      previewPrefix(trackId) + item.id,
      entry.trackEngine,
      async () => {
        const events = await loadGrooveEvents(item.id);
        return events ? fromEvents(events, useStore.getState().bpm) : [];
      },
    );
  };
  // A preview stops when the song plays or records, and when the tab goes.
  useEffect(() => {
    const stopMine = () => {
      const id = useBrowserStore.getState().preview?.itemId;
      if (id?.startsWith(previewPrefix(trackId))) stopPreview();
    };
    const off = useStore.subscribe(
      (s) => s.isPlaying || s.isRecording,
      (on) => {
        if (on) stopMine();
      },
    );
    return () => {
      off();
      stopMine();
    };
  }, [trackId]);
  const [adding, setAdding] = useState<string | null>(null);
  const addGroove = async (item: GrooveItem) => {
    setAdding(item.id);
    try {
      await addGrooveClip(trackId, item);
    } finally {
      setAdding((g) => (g === item.id ? null : g));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Folds to a rail for the kit's room, as every instrument's menu. */}
      <FoldableDockColumn
        panel="sounds"
        name="Menu"
        width={380}
        testId="sound-browser"
      >
        <div data-ds="v2" className="flex min-h-0 flex-1">
          <ul
            aria-label="Drum kits"
            data-testid="drum-kit-list"
            data-tutorial-id="drum-kit-selector"
            className={cn(
              LIST,
              'w-[128px] shrink-0 border-r border-daw-hairline',
            )}
            style={{ scrollbarWidth: 'thin' }}
          >
            {DRUM_KITS.map((k) => {
              const on = k.id === kit;
              return (
                <li key={k.id}>
                  <button
                    type="button"
                    aria-current={on || undefined}
                    data-sound={k.id}
                    onClick={() => void changeKit(k.id)}
                    className={cn(ROW, on ? ROW_ON : ROW_OFF)}
                  >
                    <span className="min-w-0 flex-1 truncate">{k.label}</span>
                    {k.id === loadingKit ? <Spinner /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* Its right padding keeps each row's Add clear of the fold
              handle on the column's edge. */}
          <ul
            aria-label="Grooves"
            data-testid="drum-groove-list"
            data-tutorial-id="drum-grooves"
            className={cn(LIST, 'min-w-0 flex-1 pr-7')}
            style={{ scrollbarWidth: 'thin' }}
          >
            {GROOVE_GROUPS.map((group) => (
              <li key={group.genre}>
                <p
                  className={cn(
                    TYPE_CLASS.label,
                    'px-2 pb-1 pt-2 font-bold text-daw-text-3',
                  )}
                >
                  {group.genre}
                </p>
                <ul className="m-0 list-none p-0">
                  {group.grooves.map((item) => (
                    <li key={item.id}>
                      <GrooveRow
                        groove={item}
                        current={item.id === inPattern}
                        playing={item.id === previewing}
                        adding={item.id === adding}
                        onPreview={() => togglePreview(item)}
                        onAdd={() => void addGroove(item)}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </FoldableDockColumn>
      <div className="relative min-w-0 flex-1">
        <div
          data-testid="drum-pads"
          data-ds="v2"
          className="absolute inset-0 flex min-h-0 p-2"
        >
          {track ? <Kit track={track} hit={hit} onPlay={play} /> : null}
        </div>
      </div>
    </div>
  );
}

/** The shared preview's id for a groove played from this track's menu. */
const previewPrefix = (trackId: string) => `dock-groove:${trackId}:`;

/** A groove: its name and tempo, Preview and Add. */
function GrooveRow({
  groove,
  current,
  playing,
  adding,
  onPreview,
  onAdd,
}: {
  groove: GrooveItem;
  /** The groove the drum grid shows now. */
  current: boolean;
  playing: boolean;
  adding: boolean;
  onPreview(): void;
  onAdd(): void;
}) {
  return (
    <div
      data-groove={groove.id}
      aria-current={current || undefined}
      className={cn(ROW, 'gap-1 pr-0.5', current || playing ? ROW_ON : ROW_OFF)}
    >
      <span className="min-w-0 flex-1 truncate">{groove.name}</span>
      <span className="shrink-0 tabular-nums text-daw-text-3">
        {groove.bpm} BPM
      </span>
      <IconButton
        label={playing ? `Stop ${groove.name}` : `Preview ${groove.name}`}
        icon={playing ? <Square /> : <Play />}
        size="sm"
        variant="ghost"
        aria-pressed={playing}
        data-testid="groove-preview"
        data-hint={playing ? 'Stop the preview' : 'Preview: hear the groove'}
        onClick={onPreview}
      />
      {adding ? (
        <span className="flex size-6 shrink-0 items-center justify-center">
          <Spinner />
        </span>
      ) : (
        <IconButton
          label={`Add ${groove.name} to the timeline`}
          icon={<Plus />}
          size="sm"
          variant="ghost"
          data-testid="groove-add"
          data-hint="Add: put the groove on the timeline at the playhead"
          onClick={onAdd}
        />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <Loader2
      aria-label="Loading"
      className="size-3.5 shrink-0 animate-spin text-daw-text-3 motion-reduce:animate-none"
    />
  );
}

// ── The kit ─────────────────────────────────────────────────────────────────

const EMPTY = new Set<number>();

function Kit({
  track,
  hit,
  onPlay,
}: {
  track: Track;
  hit: number | null;
  onPlay(note: number): void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const area = useBoxSize(areaRef);
  // Notes the student plays now on this kit (a MIDI keyboard, the computer
  // keyboard) light their pads.
  const held = useStore((s) =>
    liveMidiTargetIds(s).includes(track.id) ? s.hwActiveNotes : EMPTY,
  );
  const scale =
    area.width > 0 && area.height > 0
      ? Math.min(area.width / KIT_WIDTH, area.height / KIT_HEIGHT) * 0.96
      : 0;
  const kit = track.drumKit ?? 'natural';
  const nameOf = (note: number) => padLabel(note, kit);
  const lit = (note: number) => hit === note || held.has(note);

  const press = (note: number) => (e: React.PointerEvent) => {
    if (e.button > 0) return;
    onPlay(note);
  };
  // Enter or Space on a focused pad: a click with detail 0.
  const keyed = (note: number) => (e: React.MouseEvent) => {
    if (e.detail === 0) onPlay(note);
  };

  return (
    <div
      ref={areaRef}
      data-testid="drum-kit"
      className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-[var(--daw-radius-md)] bg-daw-bg"
    >
      {scale > 0 ? (
        <div
          role="group"
          aria-label="Drum kit: click a pad to play it"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: KIT_WIDTH * scale, height: KIT_HEIGHT * scale }}
        >
          {KIT_DRUMS.map((drum) => {
            const key = keyOf(drum.note);
            const name = nameOf(drum.note);
            return (
              <button
                key={drum.note}
                type="button"
                data-testid={`drum-pad-${drum.note}`}
                data-lit={lit(drum.note) || undefined}
                aria-label={key ? `${name} (${key})` : name}
                title={name}
                onPointerDown={press(drum.note)}
                onClick={keyed(drum.note)}
                className={cn(
                  'absolute rounded-full border-2',
                  lit(drum.note)
                    ? '!border-daw-text bg-daw-selected'
                    : '!border-daw-text-3 bg-daw-surface-2 hover:bg-daw-hover',
                  TRANSITION,
                  FOCUS_RING,
                )}
                style={{
                  left: (drum.cx - drum.r) * scale,
                  top: (drum.cy - drum.r) * scale,
                  width: drum.r * 2 * scale,
                  height: drum.r * 2 * scale,
                }}
              >
                {/* A drum's head, or a cymbal's rings and bell. */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute rounded-full border !border-daw-outline',
                    drum.kind === 'cymbal' ? 'inset-[12%]' : 'inset-[24%]',
                  )}
                />
                {drum.kind === 'cymbal' ? (
                  <span
                    aria-hidden
                    className="absolute inset-[30%] rounded-full border !border-daw-outline"
                  />
                ) : null}
                {key ? <KeyBadge>{key}</KeyBadge> : null}
              </button>
            );
          })}
          {KIT_BADGES.map((badge) => {
            const key = keyOf(badge.note);
            const name = nameOf(badge.note);
            const { x, y } = badgePoint(badge);
            return (
              <button
                key={badge.note}
                type="button"
                data-testid={`drum-pad-${badge.note}`}
                data-lit={lit(badge.note) || undefined}
                aria-label={key ? `${name} (${key})` : name}
                title={name}
                onPointerDown={press(badge.note)}
                onClick={keyed(badge.note)}
                className={cn(
                  'absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bold',
                  TYPE_CLASS.label,
                  lit(badge.note)
                    ? 'bg-daw-text-2 text-daw-on-primary ring-2 ring-daw-text'
                    : 'bg-daw-primary text-daw-on-primary hover:bg-daw-primary-hover',
                  TRANSITION,
                  FOCUS_RING,
                )}
                style={{ left: x * scale, top: y * scale }}
              >
                {key}
              </button>
            );
          })}
        </div>
      ) : null}
      {/* Every pad by name, for a screen reader or a small window. */}
      <ul className="sr-only">
        {DRUM_PADS.map((pad) => (
          <li key={pad.note}>
            {nameOf(pad.note)}: {keyOf(pad.note) ?? 'no key'}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeyBadge({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-daw-primary font-bold text-daw-on-primary',
        TYPE_CLASS.label,
      )}
    >
      {children}
    </span>
  );
}
