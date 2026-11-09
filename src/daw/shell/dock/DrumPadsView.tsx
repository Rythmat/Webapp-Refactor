import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/components/utilities';
import {
  LIST,
  ROW,
  ROW_OFF,
  ROW_ON,
} from '@/daw/components/Controls/SoundBrowser';
import { auditionNote } from '@/daw/audio/auditionNote';
import { subscribeHeardNotes } from '@/daw/audio/noteEvents';
import {
  DRUM_TYPING_OCTAVE,
  typingKeyFor,
} from '@/daw/commands/musicalTypingMap';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import {
  DRUM_KITS,
  DRUM_PADS,
  DrumMachineEngine,
} from '@/daw/instruments/DrumMachineEngine';
import { padLabel } from '@/daw/instruments/drumKits';
import { liveMidiTargetIds } from '@/daw/midi/liveTarget';
import { useStore, type Track } from '@/daw/store';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { FoldableDockColumn } from './FoldableDockColumn';
import { kitStyles, styleOfKit } from './drumKitStyles';
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
// every MIDI instrument's (SoundBrowser): the styles in its first column
// (Pop & Rock, Hip Hop & Trap, Latin…, drumKitStyles.ts), the kits of the
// style picked in its second (owner, 2026-10-23: the grooves that were
// there moved into the prompt box's generation; the kit list keeps the
// lesson anchor drum-kit-selector). A kit picked plays the pads. A pad
// lights as it's struck: a click,
// a key, or the timeline's notes as they're heard (owner, 2026-10-23). The
// kit takes the rest of the tab: the track's and the pads' volume and pan
// knobs went from it (owner, 2026-10-21; the track's are its row's, the
// pads' the drum grid's). Our look, not
// Soundtrap's: neutral rings, the white key badges, Glacial and the 12 px
// floor. The beat itself is edited on the drum grid in Notes.

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

/** How long a struck pad stays lit, short enough that a groove's 16ths
 *  flash apart. */
const FLASH_MS = 110;

const EMPTY = new Set<number>();

/**
 * The pads lit by hits on a track's engine (noteEvents): each one when it's
 * heard, so the timeline's notes light as they sound, not a look-ahead
 * early. `flash` lights one at once (a click, before its echo comes).
 */
function usePadFlashes(trackId: string) {
  const [lit, setLit] = useState<ReadonlySet<number>>(EMPTY);
  const ends = useRef(new Map<number, number>());
  const flash = useCallback((note: number) => {
    setLit((prev) => (prev.has(note) ? prev : new Set(prev).add(note)));
    window.clearTimeout(ends.current.get(note));
    ends.current.set(
      note,
      window.setTimeout(() => {
        ends.current.delete(note);
        setLit((prev) => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }, FLASH_MS),
    );
  }, []);
  useEffect(() => {
    const off = subscribeHeardNotes(trackId, (event) => {
      if (event.type === 'on' && event.velocity > 0) flash(event.note);
    });
    const timers = ends.current;
    return () => {
      off();
      for (const id of timers.values()) window.clearTimeout(id);
      timers.clear();
      setLit(EMPTY);
    };
  }, [trackId, flash]);
  return { lit, flash };
}

export function DrumPadsView({ trackId }: { trackId: string }) {
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  const { lit: struck, flash } = usePadFlashes(trackId);

  const play = useCallback(
    (note: number) => {
      auditionNote(trackId, note, 100);
      flash(note);
    },
    [trackId, flash],
  );

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

  // The styles, then the kits of the one picked; it opens on the kit's own.
  const styles = useMemo(() => kitStyles(DRUM_KITS), []);
  const [styleId, setStyleId] = useState(
    () => styleOfKit(styles, kit)?.id ?? styles[0]?.id,
  );
  const shown = styles.find((s) => s.id === styleId) ?? styles[0];
  const labelOf = (id: string) =>
    DRUM_KITS.find((k) => k.id === id)?.label ?? id;

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
            aria-label="Drum styles"
            data-testid="drum-style-list"
            className={cn(
              LIST,
              'w-[140px] shrink-0 border-r border-daw-hairline',
            )}
            style={{ scrollbarWidth: 'thin' }}
          >
            {styles.map((st) => {
              const on = st.id === shown?.id;
              return (
                <li key={st.id}>
                  <button
                    type="button"
                    aria-current={on || undefined}
                    data-style={st.id}
                    onClick={() => setStyleId(st.id)}
                    className={cn(ROW, on ? ROW_ON : ROW_OFF)}
                  >
                    <span className="min-w-0 flex-1 truncate">{st.label}</span>
                    {st.kits.includes(kit) ? (
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 rounded-full bg-daw-text-2"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* Its right padding keeps each row clear of the fold handle on
              the column's edge. */}
          <ul
            aria-label={`${shown?.label ?? ''} drum kits`}
            data-testid="drum-kit-list"
            data-tutorial-id="drum-kit-selector"
            className={cn(LIST, 'min-w-0 flex-1 pr-7')}
            style={{ scrollbarWidth: 'thin' }}
          >
            {(shown?.kits ?? []).map((id) => {
              const on = id === kit;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={on || undefined}
                    data-sound={id}
                    onClick={() => void changeKit(id)}
                    className={cn(ROW, on ? ROW_ON : ROW_OFF)}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {labelOf(id)}
                    </span>
                    {id === loadingKit ? <Spinner /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </FoldableDockColumn>
      <div className="relative min-w-0 flex-1">
        <div
          data-testid="drum-pads"
          data-ds="v2"
          className="absolute inset-0 flex min-h-0 p-2"
        >
          {track ? <Kit track={track} struck={struck} onPlay={play} /> : null}
        </div>
      </div>
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

function Kit({
  track,
  struck,
  onPlay,
}: {
  track: Track;
  /** The pads struck just now (usePadFlashes). */
  struck: ReadonlySet<number>;
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
  const lit = (note: number) => struck.has(note) || held.has(note);

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
