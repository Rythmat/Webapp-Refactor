/* eslint-disable react/jsx-sort-props */
/**
 * One band: its layers stacked like tracks in a DAW, each drawn as the notes
 * it plays over the chart, all heard together on one transport. Click a
 * layer to open it below — what it plays, the sound it plays on, and the
 * item's own editor, in place. Assign the band to lesson styles at the foot.
 *
 * What it plays over (the preview chart and key) is saved with the band for
 * the next session, but lessons play their own chords.
 */

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Loader2,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import {
  BAND_INSTRUMENTS,
  type Band,
  type BandInstrument,
  type BandLayer,
  type BandSource,
  layerIdFor,
} from '@/curriculum/engine/band/band';
import { layerSound, realizeBand } from '@/curriculum/engine/band/realize';
import { ALL_ITEMS } from '@/curriculum/engine/band/registry';
import { lineBars } from '@/curriculum/engine/bassLines/bassLine';
import {
  KEYS,
  PROGRESSIONS,
  parseChart,
  progressionById,
  quartersPerBar,
  realizePreset,
} from '@/curriculum/engine/bassLines/harmony';
import { compingBars } from '@/curriculum/engine/chordComping/chordComping';
import { barTicks } from '@/curriculum/engine/meter';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useBassLineList } from '../bassLines/bassLineSession';
import { previewHarmony } from '../chordComping/compingGrid';
import { useCompingList } from '../chordComping/compingSession';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { usePartList } from '../parts/partFiles';
import { usePlayerList } from '../players/playerSession';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../ui/styles';
import { BandAssignments } from './BandAssignments';
import { LaneStrip } from './LaneStrip';
import { LayerItemEditor } from './LayerItemEditor';
import { SampleInstrumentMaker } from './SampleInstrumentMaker';
import { SynthLayerPanel } from './SynthLayerPanel';
import { CAN_WRITE_FILES, downloadBand, saveBand } from './bandFiles';
import { SYNTH_PREFIX, soundGroups, soundLabel } from './bandSounds';
import { type PlayerLayer, useBandPlayer } from './useBandPlayer';

const METERS: [number, number][] = [
  [4, 4],
  [3, 4],
  [6, 8],
  [12, 8],
];

/** Each instrument's colour on the lanes. */
const COLOUR: Record<BandInstrument, string> = {
  drums: '#f59e0b',
  percussion: '#fb923c',
  bass: '#38bdf8',
  keys: '#a78bfa',
  guitar: '#34d399',
  synth: '#f472b6',
  strings: '#facc15',
  horns: '#f87171',
};

/** The library a source kind is chosen from, by name. */
const SOURCE_LABEL: Record<BandSource['kind'], string> = {
  groove: 'Drum groove',
  bassLine: 'Bass line',
  comping: 'Comping pattern',
  part: 'Part',
};

const isDrums = (layer: Pick<BandLayer, 'instrument'>) =>
  layer.instrument === 'drums' || layer.instrument === 'percussion';

/** The layers a band starts a new one from. */
const NEW_LAYERS: {
  label: string;
  instrument: BandInstrument;
  kind: BandSource['kind'];
}[] = [
  { label: 'Drums', instrument: 'drums', kind: 'groove' },
  { label: 'Bass', instrument: 'bass', kind: 'bassLine' },
  { label: 'Keys comping', instrument: 'keys', kind: 'comping' },
  { label: 'Guitar comping', instrument: 'guitar', kind: 'comping' },
  { label: 'Part', instrument: 'keys', kind: 'part' },
];

interface Props {
  band: Band;
  onDuplicate: (band: Band) => void;
}

export const BandEditor = ({ band: initial, onDuplicate }: Props) => {
  const [draft, setDraft] = useState<Band>(initial);
  const [saved, setSaved] = useState<Band>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(
    initial.layers[0]?.id ?? null,
  );
  const [editingItem, setEditingItem] = useState(false);
  /** The layer a sound is being sampled for. */
  const [sampling, setSampling] = useState<string | null>(null);
  /** The open synth layer's live engine, while its synth panel is open. */
  const [synth, setSynth] = useState<{
    layerId: string;
    engine: SynthEngine;
  } | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);

  const grooves = useGrooveList();
  const lines = useBassLineList();
  const patterns = useCompingList();
  const parts = usePartList();
  const players = usePlayerList();

  const set = (patch: Partial<Band>) => setDraft((b) => ({ ...b, ...patch }));
  const setLayer = (id: string, patch: Partial<BandLayer>) =>
    setDraft((b) => ({
      ...b,
      layers: b.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  // ── the chart it plays over ──
  const ts = draft.timeSignature;
  const preview = draft.preview ?? {};
  const progression = progressionById(
    preview.progression ?? (ts[0] === 3 ? 'turnaround' : PROGRESSIONS[0].id),
  );
  const keyPc = preview.key ?? 0;
  const typed = preview.chart?.trim() ? parseChart(preview.chart) : null;
  const chartBars = useMemo(
    () => (typed?.bars.length ? typed.bars : realizePreset(progression, keyPc)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview.chart, progression, keyPc],
  );

  // The longest layer, so a long groove or line is heard in full.
  const longestBars = Math.max(
    1,
    ...draft.layers.map((l) => {
      const { source } = l;
      if (source.kind === 'groove')
        return grooves.find((g) => g.id === source.id)?.bars ?? 1;
      if (source.kind === 'bassLine') {
        const line = lines.find((x) => x.id === source.id);
        return line ? lineBars(line) : 1;
      }
      if (source.kind === 'comping') {
        const pattern = patterns.find((x) => x.id === source.id);
        return pattern ? compingBars(pattern) : 1;
      }
      return parts.find((p) => p.id === source.id)?.bars ?? 1;
    }),
  );
  const harmony = useMemo(
    () => previewHarmony(chartBars, ts, longestBars * quartersPerBar(ts)),
    [chartBars, ts, longestBars],
  );
  const bars = harmony?.bars ?? longestBars;
  const totalTicks = bars * barTicks(ts);

  // ── what every layer plays ──
  // The item lists are read so an edit to an item, saved in its own editor,
  // is heard here at once.
  const realized = useMemo(
    () =>
      harmony
        ? realizeBand(
            draft,
            ALL_ITEMS,
            { chordAt: harmony.chordAt, bars, timeSignature: ts },
            { includeMuted: true },
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, harmony, bars, ts, grooves, lines, patterns, parts],
  );
  const notesOf = new Map(realized.map((r) => [r.layer.id, r.notes]));
  const playerLayers: PlayerLayer[] = draft.layers.map((l) => ({
    id: l.id,
    sound: layerSound(l, ALL_ITEMS),
    notes: notesOf.get(l.id) ?? [],
    volume: l.volume ?? 1,
    muted: Boolean(l.muted),
  }));

  const player = useBandPlayer();
  const notesKey = JSON.stringify(
    playerLayers.map((l) => [l.id, l.sound, l.notes.length, totalTicks]),
  );
  // An edit while playing is heard on the next pass; a level at once.
  useEffect(() => {
    if (player.playing)
      void player.play(playerLayers, { bpm: draft.tempo, totalTicks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesKey, realized, draft.tempo]);
  const mixKey = JSON.stringify(
    playerLayers.map((l) => [l.id, l.volume, l.muted]),
  );
  useEffect(() => {
    player.mix(playerLayers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixKey]);

  const toggle = () =>
    player.playing
      ? player.stop()
      : void player.play(playerLayers, { bpm: draft.tempo, totalTicks });

  // ── layers ──
  const addLayer = (spec: (typeof NEW_LAYERS)[number]) => {
    const first =
      spec.kind === 'groove'
        ? (grooves.find(
            (g) => g.status === 'live' && g.timeSignature.join() === ts.join(),
          )?.id ?? grooves[0]?.id)
        : spec.kind === 'bassLine'
          ? lines[0]?.id
          : spec.kind === 'comping'
            ? patterns[0]?.id
            : parts.find((p) => p.instrument !== 'drums')?.id;
    if (!first) {
      setError(
        `There is no ${SOURCE_LABEL[spec.kind].toLowerCase()} yet to add.`,
      );
      return;
    }
    const id = layerIdFor(draft, spec.label.toLowerCase().replace(/\s+/g, '-'));
    const layer: BandLayer = {
      id,
      name: spec.label,
      instrument: spec.instrument,
      source: { kind: spec.kind, id: first } as BandSource,
    };
    set({ layers: [...draft.layers, layer] });
    setSelected(id);
    setEditingItem(false);
  };
  const move = (id: string, by: -1 | 1) => {
    const i = draft.layers.findIndex((l) => l.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= draft.layers.length) return;
    const layers = [...draft.layers];
    [layers[i], layers[j]] = [layers[j], layers[i]];
    set({ layers });
  };
  const remove = (id: string) => {
    set({ layers: draft.layers.filter((l) => l.id !== id) });
    if (selected === id) setSelected(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveBand(draft);
      setSaved(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const layer = draft.layers.find((l) => l.id === selected) ?? null;
  const itemsFor = (kind: BandSource['kind']) =>
    kind === 'groove'
      ? grooves.map((g) => ({ id: g.id, name: g.name, status: g.status }))
      : kind === 'bassLine'
        ? lines.map((l) => ({ id: l.id, name: l.name, status: l.status }))
        : kind === 'comping'
          ? patterns.map((c) => ({ id: c.id, name: c.name, status: c.status }))
          : parts.map((p) => ({ id: p.id, name: p.name, status: p.status }));
  const input =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm';
  const playhead = player.playing
    ? (player.position % totalTicks) / totalTicks
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={AdminRoutes.bands()}
          className="text-muted-foreground hover:text-white"
          aria-label="All bands"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <input
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none"
          aria-label="Band name"
        />
        <ConsoleBadge tone={draft.status === 'live' ? 'success' : 'warning'}>
          {draft.status === 'live' ? 'Published' : 'Draft'}
        </ConsoleBadge>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            set({ status: draft.status === 'live' ? 'draft' : 'live' })
          }
        >
          {draft.status === 'live' ? 'Unpublish' : 'Publish'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDuplicate(draft)}>
          <Copy /> Duplicate
        </Button>
        {CAN_WRITE_FILES ? (
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!dirty || saving}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => downloadBand(draft)}
          >
            <Download /> Export
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}

      {/* ── what it is, and what it plays over ── */}
      <div className={cn(CONSOLE_PANEL, 'flex flex-wrap items-end gap-4 p-3')}>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Genre</span>
          <input
            value={draft.genre ?? ''}
            onChange={(e) => set({ genre: e.target.value || undefined })}
            className={cn(input, 'w-28')}
            placeholder="latin"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Style</span>
          <input
            value={draft.style ?? ''}
            onChange={(e) => set({ style: e.target.value || undefined })}
            className={cn(input, 'w-36')}
            placeholder="Cumbia"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Meter</span>
          <select
            value={ts.join('/')}
            onChange={(e) =>
              set({
                timeSignature: e.target.value.split('/').map(Number) as [
                  number,
                  number,
                ],
              })
            }
            className={input}
          >
            {METERS.map((m) => (
              <option key={m.join('/')} value={m.join('/')}>
                {m.join('/')}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Tempo</span>
          <input
            type="number"
            min={40}
            max={240}
            value={draft.tempo}
            onChange={(e) => set({ tempo: Number(e.target.value) || 96 })}
            className={cn(input, 'w-20 tabular-nums')}
          />
        </label>
        <div className="mx-1 h-10 w-px bg-white/10" />
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Plays over</span>
          <select
            value={progression.id}
            onChange={(e) =>
              set({
                preview: {
                  ...preview,
                  progression: e.target.value,
                  chart: undefined,
                },
              })
            }
            className={input}
            disabled={Boolean(typed?.bars.length)}
          >
            {[...new Set(PROGRESSIONS.map((p) => p.group))].map((group) => (
              <optgroup key={group} label={group}>
                {PROGRESSIONS.filter((p) => p.group === group).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Key</span>
          <select
            value={keyPc}
            onChange={(e) =>
              set({ preview: { ...preview, key: Number(e.target.value) } })
            }
            className={input}
            disabled={Boolean(typed?.bars.length)}
          >
            {KEYS.map((k) => (
              <option key={k.pc} value={k.pc}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-64 flex-1 flex-col gap-1">
          <span className={CONSOLE_LABEL}>Or type a chart</span>
          <input
            value={preview.chart ?? ''}
            onChange={(e) =>
              set({
                preview: { ...preview, chart: e.target.value || undefined },
              })
            }
            className={input}
            placeholder="| Am | Dm | E7 | Am |"
          />
          {typed && typed.bad.length > 0 && (
            <span className="text-xs text-amber-300">
              Not chords: {typed.bad.join(', ')}
            </span>
          )}
        </label>
      </div>

      {/* ── transport ── */}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={toggle} disabled={!draft.layers.length}>
          {player.loading ? (
            <Loader2 className="animate-spin" />
          ) : player.playing ? (
            <Square />
          ) : (
            <Play />
          )}
          {player.playing ? 'Stop' : 'Play the band'}
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {bars} bar{bars === 1 ? '' : 's'} · {ts.join('/')} · {draft.tempo} bpm
        </span>
      </div>

      {/* ── the lanes ── */}
      <div className="overflow-hidden rounded-lg border border-white/[0.08]">
        {draft.layers.length === 0 && (
          <p className="px-4 py-6 text-sm italic text-muted-foreground">
            No layers yet. Add drums, bass, comping or a part below.
          </p>
        )}
        {draft.layers.map((l, i) => {
          const isSelected = l.id === selected;
          const solo = player.solo === l.id;
          return (
            <div
              key={l.id}
              className={cn(
                'flex items-stretch',
                i > 0 && 'border-t border-white/[0.06]',
                isSelected && 'bg-white/[0.04]',
              )}
            >
              <div className="flex w-64 shrink-0 flex-col justify-center gap-1 border-r border-white/[0.06] px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(l.id);
                    setEditingItem(false);
                  }}
                  className="flex items-center gap-2 text-left"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: COLOUR[l.instrument] }}
                  />
                  <span className="truncate text-sm font-medium">{l.name}</span>
                  {l.player && (
                    <span className="truncate text-xs text-muted-foreground">
                      {players.find((p) => p.id === l.player)?.name ?? l.player}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setLayer(l.id, { muted: !l.muted || undefined })
                    }
                    className={cn(
                      'rounded px-1.5 text-[11px] font-semibold',
                      l.muted ? 'bg-amber-400/80 text-black' : 'bg-white/10',
                    )}
                    aria-pressed={Boolean(l.muted)}
                    title="Mute"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => player.setSolo(solo ? null : l.id)}
                    className={cn(
                      'rounded px-1.5 text-[11px] font-semibold',
                      solo ? 'bg-sky-400/80 text-black' : 'bg-white/10',
                    )}
                    aria-pressed={solo}
                    title="Solo"
                  >
                    S
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={l.volume ?? 1}
                    onChange={(e) =>
                      setLayer(l.id, { volume: Number(e.target.value) })
                    }
                    className="w-24"
                    aria-label={`${l.name} level`}
                  />
                  <span className="ml-auto truncate text-[11px] text-muted-foreground">
                    {SOURCE_LABEL[l.source.kind]}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="relative min-w-0 flex-1 px-1 py-1 text-white"
                onClick={() => {
                  setSelected(l.id);
                  setEditingItem(false);
                }}
                aria-label={`Open ${l.name}`}
              >
                <LaneStrip
                  notes={notesOf.get(l.id) ?? []}
                  totalTicks={totalTicks}
                  barTicks={barTicks(ts)}
                  drums={l.source.kind === 'groove'}
                  muted={Boolean(l.muted) || (player.solo !== null && !solo)}
                  colour={COLOUR[l.instrument]}
                />
                {playhead !== null && (
                  <span
                    className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
                    style={{ left: `${playhead * 100}%` }}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Add a layer:</span>
        {NEW_LAYERS.map((spec) => (
          <Button
            key={spec.label}
            size="sm"
            variant="secondary"
            onClick={() => addLayer(spec)}
          >
            <Plus /> {spec.label}
          </Button>
        ))}
      </div>

      {/* ── the open layer ── */}
      {layer && (
        <div className={cn(CONSOLE_PANEL, 'flex flex-col gap-3 p-3')}>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className={CONSOLE_LABEL}>Layer</span>
              <input
                value={layer.name}
                onChange={(e) => setLayer(layer.id, { name: e.target.value })}
                className={cn(input, 'w-44')}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={CONSOLE_LABEL}>Played by</span>
              <select
                value={layer.player ?? ''}
                onChange={(e) =>
                  setLayer(layer.id, { player: e.target.value || undefined })
                }
                className={input}
              >
                <option value="">No player</option>
                {players
                  .filter((p) => p.instrument === layer.instrument)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={CONSOLE_LABEL}>Instrument</span>
              <select
                value={layer.instrument}
                onChange={(e) =>
                  setLayer(layer.id, {
                    instrument: e.target.value as BandInstrument,
                    // A sound picked for another instrument would not fit.
                    sound: undefined,
                  })
                }
                className={input}
              >
                {BAND_INSTRUMENTS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={CONSOLE_LABEL}>
                {SOURCE_LABEL[layer.source.kind]}
              </span>
              <select
                value={layer.source.id}
                onChange={(e) => {
                  setLayer(layer.id, {
                    source: {
                      kind: layer.source.kind,
                      id: e.target.value,
                    } as BandSource,
                  });
                  setEditingItem(false);
                }}
                className={cn(input, 'max-w-[16rem]')}
              >
                {(() => {
                  const all = itemsFor(layer.source.kind);
                  const by = players.find((p) => p.id === layer.player);
                  const theirs = by
                    ? all.filter((item) =>
                        by.items.some(
                          (i) =>
                            i.kind === layer.source.kind && i.id === item.id,
                        ),
                      )
                    : [];
                  const option = (item: (typeof all)[number]) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.status === 'live' ? '' : ' (draft)'}
                    </option>
                  );
                  return by ? (
                    <>
                      <optgroup label={`${by.name} plays`}>
                        {theirs.map(option)}
                      </optgroup>
                      <optgroup label="Everything else">
                        {all.filter((i) => !theirs.includes(i)).map(option)}
                      </optgroup>
                    </>
                  ) : (
                    all.map(option)
                  );
                })()}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={CONSOLE_LABEL}>Sound</span>
              <select
                value={layer.sound ?? ''}
                onChange={(e) =>
                  setLayer(layer.id, { sound: e.target.value || undefined })
                }
                className={cn(input, 'max-w-[16rem]')}
              >
                <option value="">
                  As in lessons (
                  {soundLabel(
                    layerSound({ ...layer, sound: undefined }, ALL_ITEMS),
                    layer.instrument,
                  )}
                  )
                </option>
                {soundGroups(layer.instrument).map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((o) => (
                      <option key={`${group.label}:${o.value}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Move up"
                onClick={() => move(layer.id, -1)}
              >
                <ChevronUp />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Move down"
                onClick={() => move(layer.id, 1)}
              >
                <ChevronDown />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove ${layer.name}`}
                onClick={() => remove(layer.id)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
          {editingItem ? (
            <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Editing the {SOURCE_LABEL[layer.source.kind].toLowerCase()}{' '}
                itself: a save is heard in every band and lesson that plays it.
                Duplicate makes this band its own copy.
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setEditingItem(false)}
                >
                  Close
                </Button>
              </div>
              <LayerItemEditor
                source={layer.source}
                onReplace={(source) => setLayer(layer.id, { source })}
              />
            </div>
          ) : synth?.layerId === layer.id ? (
            <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                The synth on {layer.name}: play the band to hear it as you turn
                it.
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setSynth(null)}
                >
                  Close
                </Button>
              </div>
              <SynthLayerPanel
                engine={synth.engine}
                patch={layer.sound?.slice(SYNTH_PREFIX.length)}
                onPatch={(name) => {
                  const sound = `${SYNTH_PREFIX}${name}`;
                  // The voice already plays it: keep it, rename the sound.
                  player.renameSound(layer.id, sound);
                  setLayer(layer.id, { sound });
                }}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  // The item's editor previews on its own transport.
                  player.stop();
                  setEditingItem(true);
                }}
              >
                Edit the {SOURCE_LABEL[layer.source.kind].toLowerCase()}
              </Button>
              {layer.sound?.startsWith(SYNTH_PREFIX) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const engine = await player.synthEngine(
                      playerLayers.find((l) => l.id === layer.id)!,
                    );
                    if (engine) setSynth({ layerId: layer.id, engine });
                    else setError('The synth could not start.');
                  }}
                >
                  Open the synth
                </Button>
              ) : (
                !isDrums(layer) && (
                  <span className="text-xs text-muted-foreground">
                    Pick an Oracle Synth sound to design it here.
                  </span>
                )
              )}
              {isDrums(layer) ? (
                <span className="text-xs text-muted-foreground">
                  Drum sounds: upload samples in the groove&rsquo;s Kit, then
                  pick the kit as the sound.
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSampling(layer.id)}
                >
                  Make a sound from samples
                </Button>
              )}
            </div>
          )}
          {sampling === layer.id && (
            <SampleInstrumentMaker
              instrument={layer.instrument}
              onMade={(sound) => {
                setLayer(layer.id, { sound });
                setSampling(null);
              }}
              onCancel={() => setSampling(null)}
            />
          )}
        </div>
      )}

      {/* ── where it plays ── */}
      <div className={cn(CONSOLE_PANEL, 'flex flex-col gap-2 p-3')}>
        <div className={CONSOLE_LABEL}>Plays in lessons</div>
        <BandAssignments band={saved} dirty={dirty} />
      </div>
    </div>
  );
};
