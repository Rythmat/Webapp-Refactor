import { Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { auditionNote } from '@/daw/audio/auditionNote';
import { previewTrack } from '@/daw/engine/trackReconciler';
import { useContinuousControl } from '@/daw/hooks/useContinuousControl';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import {
  DRUM_KITS,
  DRUM_PADS,
  DrumMachineEngine,
} from '@/daw/instruments/DrumMachineEngine';
import { padLabel } from '@/daw/instruments/drumKits';
import { useStore, type Track } from '@/daw/store';
import { formatValue } from '@/daw/ui/format';
import { Knob } from '@/daw/ui/Knob';
import { Select } from '@/daw/ui/Select';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── Drums: the Instrument tab (milestone 2.9) ──────────────────────────────
//
// The kit and its pads, as Soundtrap's drum Instrument tab is (anatomy §6):
// the kit to play, and a pad per drum that plays it, with the drum's volume
// and pan beside it. The beat itself is edited on the drum grid in Notes.
// The kit menu keeps the lesson anchor drum-kit-selector. A pad mix drag
// plays through the track's engine and writes the pads it changed once, on
// release, as one undo step (as the drum grid's own pad knobs do).

type DrumPads = NonNullable<Track['drumPads']>;

const panText = (pan: number) =>
  Math.abs(pan) < 0.005
    ? 'C'
    : `${pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(pan) * 100)}`;

export function DrumPadsView({ trackId }: { trackId: string }) {
  const kit = useStore(
    (s) => s.tracks.find((t) => t.id === trackId)?.drumKit ?? 'natural',
  );
  const pads = useStore(
    (s) => s.tracks.find((t) => t.id === trackId)?.drumPads,
  );
  const setDrumKit = useStore((s) => s.setDrumKit);
  const updateDrumPad = useStore((s) => s.updateDrumPad);
  const [loading, setLoading] = useState(false);
  const [hit, setHit] = useState<number | null>(null);

  const mix = useContinuousControl<DrumPads | undefined>({
    value: pads,
    preview: (drumPads) => previewTrack(trackId, { drumPads }),
    commit: (next, start) => {
      if (!next) return;
      for (const [note, pad] of Object.entries(next)) {
        if (pad !== start?.[Number(note)]) {
          updateDrumPad(trackId, Number(note), pad);
        }
      }
    },
    label: 'Change drum mix',
  });
  const latest = useRef(mix.value);
  latest.current = mix.value;
  const change = mix.change;
  const setPad = useCallback(
    (note: number, params: Partial<DrumPads[number]>) => {
      const current = latest.current;
      const prev = current?.[note] ?? { volume: 0.8, pan: 0 };
      const next = { ...current, [note]: { ...prev, ...params } };
      latest.current = next;
      change(next);
    },
    [change],
  );

  const changeKit = useCallback(
    async (kitId: string) => {
      setDrumKit(trackId, kitId);
      // setDrumKit does nothing while a collaborator holds the track.
      const took =
        useStore.getState().tracks.find((t) => t.id === trackId)?.drumKit ===
        kitId;
      if (!took) return;
      const state = trackEngineRegistry.get(trackId);
      if (!(state?.instrument instanceof DrumMachineEngine)) return;
      setLoading(true);
      try {
        await state.instrument.setKit(kitId);
      } catch (err) {
        console.error('[DrumPadsView] Failed to load kit:', err);
      } finally {
        setLoading(false);
      }
    },
    [trackId, setDrumKit],
  );

  const play = (note: number) => {
    auditionNote(trackId, note, 100);
    setHit(note);
    window.setTimeout(() => setHit((h) => (h === note ? null : h)), 160);
  };

  return (
    <div
      data-testid="drum-pads"
      data-ds="v2"
      className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto px-3 py-2"
      style={{ scrollbarWidth: 'thin' }}
    >
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>Kit</span>
        <div data-tutorial-id="drum-kit-selector">
          <Select
            label="Drum kit"
            value={kit}
            onValueChange={(next) => void changeKit(next)}
            options={DRUM_KITS.map((k) => ({ value: k.id, label: k.label }))}
            className="w-44"
          />
        </div>
        {loading ? (
          <Loader2
            aria-label="Loading the kit"
            className="size-4 animate-spin text-daw-text-3 motion-reduce:animate-none"
          />
        ) : null}
        <span className={cn(TYPE_CLASS.label, 'ml-auto text-daw-text-3')}>
          Click a pad to hear it. Program the beat in Notes.
        </span>
      </div>
      <ul
        aria-label="Pads"
        className="grid min-h-0 gap-1.5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))' }}
      >
        {DRUM_PADS.map((pad) => {
          // Kick first, as a drummer reads a kit (the grid lists them
          // bottom-up).
          const name = padLabel(pad.note, kit);
          const state = mix.value?.[pad.note];
          const volume = state?.volume ?? 0.8;
          const pan = state?.pan ?? 0;
          return (
            <li
              key={pad.note}
              data-testid={`drum-pad-${pad.note}`}
              className="flex h-14 items-center gap-1.5 rounded-[var(--daw-radius-sm)] border border-daw-hairline bg-daw-surface-2 pr-1.5"
            >
              <button
                type="button"
                aria-label={`Play ${name}`}
                onPointerDown={(e) => {
                  if (e.button > 0) return;
                  play(pad.note);
                }}
                onClick={(e) => {
                  // Enter or Space on the focused pad.
                  if (e.detail === 0) play(pad.note);
                }}
                className={cn(
                  'flex h-full min-w-0 flex-1 flex-col items-start justify-center rounded-l-[var(--daw-radius-sm)] px-2 text-left hover:bg-daw-hover',
                  hit === pad.note && 'bg-daw-selected',
                  TRANSITION,
                  FOCUS_RING,
                )}
              >
                <span
                  className={cn(
                    TYPE_CLASS.body,
                    'w-full truncate font-bold text-daw-text',
                  )}
                >
                  {name}
                </span>
                <span className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>
                  {pad.shortLabel}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <div onPointerDownCapture={mix.begin}>
                  <Knob
                    label={`${name} volume`}
                    size="sm"
                    min={0}
                    max={1}
                    step={0.01}
                    resetValue={0.8}
                    value={volume}
                    format={(v) => formatValue(v * 100, 1)}
                    onChange={(v) => setPad(pad.note, { volume: v })}
                    onCommit={mix.end}
                    showValue={false}
                    hideLabel
                  />
                </div>
                <div onPointerDownCapture={mix.begin}>
                  <Knob
                    label={`${name} pan`}
                    size="sm"
                    min={-1}
                    max={1}
                    step={0.01}
                    resetValue={0}
                    bipolar
                    value={pan}
                    format={panText}
                    onChange={(v) => setPad(pad.note, { pan: v })}
                    onCommit={mix.end}
                    showValue={false}
                    hideLabel
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
