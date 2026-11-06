/* eslint-disable react/jsx-sort-props */
/**
 * Capture a part with the band: count in a bar, then the rest of the band
 * loops (with a metronome, if wanted) while a MIDI keyboard is played in.
 * Every pass adds to the take, as overdub; stopped, the take is kept as a
 * new part — filed under the layer's player, played by the layer in the open
 * variation — or played again, or thrown away. Kept as a player, it goes
 * into one of their part families (player.ts): as the band take the layer
 * plays, as a teaching version a lesson targets, or as both, for the levels
 * it fits.
 *
 * The keyboard itself is the Band editor's (useLiveCapture there): it's
 * heard on the open layer's sound whenever a layer is open, and written into
 * the take while it records.
 */

import { Circle, Loader2, Square } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PartNote } from '@/curriculum/engine/parts/part';
import {
  type FamilyVersion,
  type PartFamily,
  VERSION_USE,
} from '@/curriculum/engine/players/player';
import { countIn } from '../parts/metronome';
import {
  type CaptureQuantize,
  QUANTIZE_OPTIONS,
} from '../parts/useLiveCapture';

export interface Take {
  layerId: string;
  /** The band is looping and keys are being written. */
  recording: boolean;
  notes: PartNote[];
}

/** Where a kept take goes among its player's part families. */
export interface TakeFiling {
  use: FamilyVersion['use'];
  /** One of theirs, by id, or a new one, by name. */
  family: { id: string } | { name: string };
  levels: number[];
}

/** The lesson levels a version can be for. */
const LEVELS = [1, 2, 3];

interface Props {
  take: Take;
  setTake: (update: (take: Take | null) => Take | null) => void;
  layerName: string;
  /** The keyboard: what it's listening on, or why it can't. */
  midi: { inputs: string[]; error: string | null };
  quantize: CaptureQuantize;
  setQuantize: (q: CaptureQuantize) => void;
  timeSignature: [number, number];
  tempo: number;
  player: { stop: () => void };
  /** Starts the band (all but the captured layer) looping. */
  playBand: (click: boolean) => void;
  /** The layer's player's families, when it has a player to file under. */
  filing?: {
    playerName: string;
    families: readonly PartFamily[];
    /** A new family's name to start from: 'Cumbia keys comping'. */
    newName: string;
    /** The open variation's level, ticked to start. */
    level?: number;
  };
  onKeep: (notes: PartNote[], filing?: TakeFiling) => Promise<void>;
}

export const BandCapture = ({
  take,
  setTake,
  layerName,
  midi,
  quantize,
  setQuantize,
  timeSignature,
  tempo,
  player,
  playBand,
  filing,
  onKeep,
}: Props) => {
  const [click, setClick] = useState(true);
  const [counting, setCounting] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [use, setUse] = useState<FamilyVersion['use']>('band');
  /** A family's id, or '' for a new one. */
  const [familyId, setFamilyId] = useState('');
  const [newName, setNewName] = useState(filing?.newName ?? '');
  const [levels, setLevels] = useState<number[]>(
    filing?.level ? [filing.level] : [],
  );
  const filed = (): TakeFiling | undefined =>
    filing && {
      use,
      family: familyId
        ? { id: familyId }
        : { name: newName.trim() || filing.newName },
      levels,
    };

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
      {filing && !take.recording && n > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
          Keep as {filing.playerName}&rsquo;s
          <select
            value={use}
            onChange={(e) => setUse(e.target.value as FamilyVersion['use'])}
            className={control}
            aria-label="What the take is for"
          >
            {(['band', 'teaching', 'both'] as const).map((u) => (
              <option key={u} value={u}>
                {VERSION_USE[u]}
              </option>
            ))}
          </select>
          in
          <select
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            className={control}
            aria-label="Part family"
          >
            <option value="">A new family…</option>
            {filing.families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.versions.length})
              </option>
            ))}
          </select>
          {!familyId && (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={filing.newName}
              className={`${control} w-56`}
              aria-label="New family name"
            />
          )}
          for level
          {LEVELS.map((lvl) => (
            <label key={lvl} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={levels.includes(lvl)}
                onChange={(e) =>
                  setLevels((ls) =>
                    e.target.checked
                      ? [...ls, lvl].sort((a, b) => a - b)
                      : ls.filter((l) => l !== lvl),
                  )
                }
                className="accent-white"
              />
              L{lvl}
            </label>
          ))}
          <span className="text-xs text-muted-foreground">
            {use === 'teaching'
              ? `${layerName} keeps playing what it plays; this is filed for lessons to teach.`
              : `${layerName} plays it in this variation.`}
          </span>
        </div>
      )}
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
                await onKeep(take.notes, filed());
              } finally {
                setKeeping(false);
              }
            }}
          >
            {keeping && <Loader2 className="animate-spin" />}
            {use === 'teaching' && filing
              ? 'Keep as a teaching version'
              : 'Keep as a new part'}
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
