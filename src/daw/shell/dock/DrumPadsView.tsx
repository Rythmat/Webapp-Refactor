import { ChevronLeft, ChevronRight, Keyboard, Loader2 } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { cn } from '@/components/utilities';
import { auditionNote } from '@/daw/audio/auditionNote';
import {
  DRUM_TYPING_OCTAVE,
  typingKeyFor,
} from '@/daw/commands/musicalTypingMap';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { previewTrack } from '@/daw/engine/trackReconciler';
import { useContinuousControl } from '@/daw/hooks/useContinuousControl';
import {
  useTrackPanControl,
  useTrackVolumeControl,
} from '@/daw/hooks/useMixControls';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import {
  DRUM_KITS,
  DRUM_PADS,
  DrumMachineEngine,
} from '@/daw/instruments/DrumMachineEngine';
import { padLabel } from '@/daw/instruments/drumKits';
import { liveMidiTargetIds } from '@/daw/midi/liveTarget';
import { useStore, type Track } from '@/daw/store';
import { formatGain } from '@/daw/ui/format';
import { IconButton } from '@/daw/ui/IconButton';
import { Knob } from '@/daw/ui/Knob';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
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
// on the rims of the drums they're played on. A click plays a pad and picks
// it for the pad knobs. Above the kit (beside it when the dock is short, as
// on a Chromebook, so the kit keeps the height): the kit's menu with ‹ ›,
// the track's volume and pan, the picked pad's volume and pan, and the
// computer keyboard's switch. Our look, not Soundtrap's: neutral rings, the
// white key badges, Glacial and the 12 px floor. The beat itself is edited
// on the drum grid in Notes. The kit menu keeps the lesson anchor
// drum-kit-selector. A pad mix drag plays through the track's engine and
// writes the pads it changed once, on release, as one undo step (as the
// drum grid's own pad knobs do).

type DrumPads = NonNullable<Track['drumPads']>;

/** Below this height the controls go beside the kit instead of above it. */
const SIDE_CONTROLS_BELOW_PX = 240;

const TYPING_KEYS = shortcutKeys('typing.on');

const panText = (pan: number) =>
  Math.abs(pan) < 0.005
    ? 'Center'
    : `${pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(pan) * 100)}`;

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
  const rootRef = useRef<HTMLDivElement>(null);
  const root = useBoxSize(rootRef);
  const side = root.height > 0 && root.height < SIDE_CONTROLS_BELOW_PX;
  const [picked, setPicked] = useState(36);
  const [hit, setHit] = useState<number | null>(null);

  const play = useCallback(
    (note: number) => {
      auditionNote(trackId, note, 100);
      setPicked(note);
      setHit(note);
    },
    [trackId],
  );
  useEffect(() => {
    if (hit === null) return;
    const id = window.setTimeout(() => setHit(null), 160);
    return () => window.clearTimeout(id);
  }, [hit]);

  return (
    <div
      ref={rootRef}
      data-testid="drum-pads"
      data-ds="v2"
      data-layout={side ? 'side' : 'top'}
      className={cn(
        'flex h-full min-h-0 gap-2 p-2',
        side ? 'flex-row' : 'flex-col',
      )}
    >
      {track ? (
        <>
          <KitControls track={track} picked={picked} side={side} />
          <Kit track={track} picked={picked} hit={hit} onPlay={play} />
        </>
      ) : null}
    </div>
  );
}

// ── The controls ────────────────────────────────────────────────────────────

function KitControls({
  track,
  picked,
  side,
}: {
  track: Track;
  picked: number;
  side: boolean;
}) {
  return (
    <div
      data-testid="drum-kit-controls"
      className={cn(
        'flex shrink-0 gap-x-4 gap-y-2',
        side
          ? 'w-60 flex-col justify-center'
          : 'flex-wrap items-center justify-between px-1',
      )}
    >
      <KitPicker track={track} />
      <div className="flex items-start gap-4">
        <TrackKnobs track={track} />
        <PadKnobs track={track} note={picked} />
      </div>
      <TypingSwitch />
    </div>
  );
}

function KitPicker({ track }: { track: Track }) {
  const kit = track.drumKit ?? 'natural';
  const setDrumKit = useStore((s) => s.setDrumKit);
  const [loading, setLoading] = useState(false);
  const index = Math.max(
    0,
    DRUM_KITS.findIndex((k) => k.id === kit),
  );

  const changeKit = async (kitId: string) => {
    setDrumKit(track.id, kitId);
    // setDrumKit does nothing while a collaborator holds the track.
    const took =
      useStore.getState().tracks.find((t) => t.id === track.id)?.drumKit ===
      kitId;
    if (!took) return;
    const state = trackEngineRegistry.get(track.id);
    if (!(state?.instrument instanceof DrumMachineEngine)) return;
    setLoading(true);
    try {
      await state.instrument.setKit(kitId);
    } catch (err) {
      console.error('[DrumPadsView] Failed to load kit:', err);
    } finally {
      setLoading(false);
    }
  };
  const step = (by: number) => {
    const next = DRUM_KITS[(index + by + DRUM_KITS.length) % DRUM_KITS.length];
    if (next) void changeKit(next.id);
  };

  return (
    <div className="flex items-center gap-1">
      <IconButton
        label="Previous kit"
        icon={<ChevronLeft />}
        size="md"
        onClick={() => step(-1)}
      />
      <div data-tutorial-id="drum-kit-selector">
        <Select
          label="Drum kit"
          value={kit}
          onValueChange={(next) => void changeKit(next)}
          options={DRUM_KITS.map((k) => ({ value: k.id, label: k.label }))}
          className="w-36"
        />
      </div>
      <IconButton
        label="Next kit"
        icon={<ChevronRight />}
        size="md"
        onClick={() => step(1)}
      />
      {loading ? (
        <Loader2
          aria-label="Loading the kit"
          className="size-4 animate-spin text-daw-text-3 motion-reduce:animate-none"
        />
      ) : null}
    </div>
  );
}

function KnobGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-0.5">
      <span className={cn(TYPE_CLASS.micro, 'truncate text-daw-text-3')}>
        {title}
      </span>
      <div className="flex items-start gap-2">{children}</div>
    </div>
  );
}

/** The whole kit's level and place: the track's volume and pan. */
function TrackKnobs({ track }: { track: Track }) {
  const volume = useTrackVolumeControl(track);
  const pan = useTrackPanControl(track);
  return (
    <KnobGroup title="Kit">
      <div onPointerDownCapture={volume.begin}>
        <Knob
          label="Volume"
          size="sm"
          min={0}
          max={1}
          step={0.01}
          resetValue={0.8}
          value={volume.value}
          format={(v) => formatGain(v)}
          onChange={volume.change}
          onCommit={volume.end}
          showValue={false}
        />
      </div>
      <div onPointerDownCapture={pan.begin}>
        <Knob
          label="Pan"
          size="sm"
          min={-1}
          max={1}
          step={0.01}
          resetValue={0}
          bipolar
          value={pan.value}
          format={panText}
          onChange={pan.change}
          onCommit={pan.end}
          showValue={false}
        />
      </div>
    </KnobGroup>
  );
}

/** The picked pad's level and place in the kit (the track's drumPads). */
function PadKnobs({ track, note }: { track: Track; note: number }) {
  const updateDrumPad = useStore((s) => s.updateDrumPad);
  const mix = useContinuousControl<DrumPads | undefined>({
    value: track.drumPads,
    preview: (drumPads) => previewTrack(track.id, { drumPads }),
    commit: (next, start) => {
      if (!next) return;
      for (const [pad, params] of Object.entries(next)) {
        if (params !== start?.[Number(pad)]) {
          updateDrumPad(track.id, Number(pad), params);
        }
      }
    },
    label: 'Change drum mix',
  });
  const latest = useRef(mix.value);
  latest.current = mix.value;
  const change = mix.change;
  const setPad = (params: Partial<DrumPads[number]>) => {
    const current = latest.current;
    const prev = current?.[note] ?? { volume: 0.8, pan: 0 };
    const next = { ...current, [note]: { ...prev, ...params } };
    latest.current = next;
    change(next);
  };
  const name = padLabel(note, track.drumKit ?? 'natural');
  const state = mix.value?.[note];
  return (
    <KnobGroup title={name}>
      <div onPointerDownCapture={mix.begin}>
        <Knob
          label="Volume"
          size="sm"
          min={0}
          max={1}
          step={0.01}
          resetValue={0.8}
          value={state?.volume ?? 0.8}
          format={(v) => formatGain(v)}
          onChange={(v) => setPad({ volume: v })}
          onCommit={mix.end}
          showValue={false}
        />
      </div>
      <div onPointerDownCapture={mix.begin}>
        <Knob
          label="Pan"
          size="sm"
          min={-1}
          max={1}
          step={0.01}
          resetValue={0}
          bipolar
          value={state?.pan ?? 0}
          format={panText}
          onChange={(v) => setPad({ pan: v })}
          onCommit={mix.end}
          showValue={false}
        />
      </div>
    </KnobGroup>
  );
}

/** The computer keyboard's switch: with it on, the letters play the kit. */
function TypingSwitch() {
  const on = useMusicalTypingStore((s) => s.enabled);
  const setEnabled = useMusicalTypingStore((s) => s.setEnabled);
  return (
    <Toggle
      label="Play the kit from the computer keyboard (the letters on the pads)"
      icon={<Keyboard />}
      pressed={on}
      onPressedChange={setEnabled}
      shortcut={TYPING_KEYS.label}
      aria-keyshortcuts={TYPING_KEYS.aria}
      data-testid="drum-kit-typing"
      className="self-start"
    >
      Keys
    </Toggle>
  );
}

// ── The kit ─────────────────────────────────────────────────────────────────

const EMPTY = new Set<number>();

function Kit({
  track,
  picked,
  hit,
  onPlay,
}: {
  track: Track;
  picked: number;
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
                    : drum.note === picked
                      ? '!border-daw-text bg-daw-surface-2 hover:bg-daw-hover'
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
                    : badge.note === picked
                      ? 'bg-daw-primary text-daw-on-primary ring-2 ring-daw-text-2'
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
