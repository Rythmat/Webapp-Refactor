/* eslint-disable react/jsx-sort-props */
/**
 * Capture a part with the band: count in a bar, then the rest of the band
 * loops (with a metronome, if wanted) while a MIDI keyboard is played in.
 * Every pass adds to the take, as overdub; stopped, the take is kept as a
 * new part — filed under the layer's player, played by the layer in the open
 * variation — or played again, or thrown away.
 *
 * Mounted only while capturing, so a band page never asks for MIDI access
 * until a capture starts.
 */

import { Circle, Loader2, Square } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PartNote } from '@/curriculum/engine/parts/part';
import { countIn } from '../parts/metronome';
import {
  type CaptureQuantize,
  QUANTIZE_OPTIONS,
  useLiveCapture,
} from '../parts/useLiveCapture';

export interface Take {
  layerId: string;
  /** The band is looping and keys are being written. */
  recording: boolean;
  notes: PartNote[];
}

interface Props {
  take: Take;
  setTake: (update: (take: Take | null) => Take | null) => void;
  layerName: string;
  /** The sound keys are heard on as they're played. */
  monitorSound: string;
  timeSignature: [number, number];
  tempo: number;
  totalTicks: number;
  player: {
    playing: boolean;
    stop: () => void;
    currentTick: () => number;
    liveOn: (sound: string, midi: number, velocity: number) => Promise<void>;
    liveOff: (midi: number) => void;
  };
  /** Starts the band (all but the captured layer) looping. */
  playBand: (click: boolean) => void;
  onKeep: (notes: PartNote[]) => Promise<void>;
}

export const BandCapture = ({
  take,
  setTake,
  layerName,
  monitorSound,
  timeSignature,
  tempo,
  totalTicks,
  player,
  playBand,
  onKeep,
}: Props) => {
  const [click, setClick] = useState(true);
  const [quantize, setQuantize] = useState<CaptureQuantize>(120);
  const [counting, setCounting] = useState(false);
  const [keeping, setKeeping] = useState(false);

  const midi = useLiveCapture({
    active: take.recording && player.playing,
    length: totalTicks,
    quantize,
    currentTick: player.currentTick,
    onNote: (note) =>
      setTake(
        (t) =>
          t && {
            ...t,
            notes: [...t.notes, note].sort(
              (a, b) => a.tick - b.tick || a.midi - b.midi,
            ),
          },
      ),
    monitorOn: (m, v) => void player.liveOn(monitorSound, m, v),
    monitorOff: player.liveOff,
  });

  /** A bar's count-in, then the band loops and the take records. */
  const record = () => {
    player.stop();
    setCounting(true);
    void countIn(timeSignature, tempo, () => {
      setCounting(false);
      setTake((t) => t && { ...t, recording: true });
      playBand(click);
    });
  };
  const stop = () => {
    player.stop();
    setTake((t) => t && { ...t, recording: false });
  };

  const control =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm';
  const n = take.notes.length;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-rose-400/30 bg-rose-400/[0.06] p-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">
          Capture into {layerName}
          {n > 0 && (
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {n} note{n === 1 ? '' : 's'}
            </span>
          )}
        </span>
        <label className="flex items-center gap-1.5 text-white/70">
          <input
            type="checkbox"
            checked={click}
            onChange={(e) => setClick(e.target.checked)}
            disabled={take.recording || counting}
            className="accent-white"
          />
          Metronome
        </label>
        <label className="flex items-center gap-1.5 text-white/70">
          Quantize
          <select
            value={quantize}
            onChange={(e) =>
              setQuantize(Number(e.target.value) as CaptureQuantize)
            }
            className={control}
          >
            {QUANTIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">
          {midi.error ??
            (midi.inputs.length
              ? `Listening on ${midi.inputs.join(', ')}`
              : 'Plug in a MIDI keyboard.')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {take.recording ? (
          <Button
            size="sm"
            className="bg-rose-500 hover:bg-rose-400"
            onClick={stop}
          >
            <Square /> Stop
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="border-rose-500 text-rose-300"
            onClick={record}
            disabled={counting}
          >
            <Circle className="fill-rose-500 text-rose-500" />
            {counting
              ? 'Counting in…'
              : n
                ? 'Record more (adds to the take)'
                : 'Record'}
          </Button>
        )}
        {!take.recording && n > 0 && (
          <Button
            size="sm"
            disabled={keeping}
            onClick={async () => {
              setKeeping(true);
              try {
                await onKeep(take.notes);
              } finally {
                setKeeping(false);
              }
            }}
          >
            {keeping && <Loader2 className="animate-spin" />} Keep as a new part
          </Button>
        )}
        {!take.recording && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              player.stop();
              setTake(() => null);
            }}
          >
            {n ? 'Discard the take' : 'Cancel'}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {take.recording
            ? 'The band loops; every pass adds to the take. Stop when it’s right.'
            : 'One bar counts in, then the band plays on a loop while you play.'}
        </span>
      </div>
    </div>
  );
};
