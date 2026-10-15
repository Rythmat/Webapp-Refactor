/* eslint-disable react/jsx-sort-props */
/**
 * One band: its layers stacked like tracks in a DAW, each drawn as the notes
 * it plays over the chart, all heard together on one transport. Click a
 * layer to open it below — what it plays, the sound it plays on, and the
 * item's own editor, in place: the pencil on a lane (or a double-click on
 * its notes) goes straight to that editor. A sampled sound reopens the same
 * way, to add samples. Assign the band to lesson styles at the foot.
 *
 * A genre's band plays every style its lessons teach as variations: the tabs
 * above the lanes. The members — who plays, on what sound, how loud — are
 * the band's; what each plays, and the meter and tempo, are the open
 * variation's. A member the variation gives nothing plays as the lesson does.
 *
 * What it plays over (the preview chart and key) is saved with the band for
 * the next session, but lessons play their own chords.
 */

import {
  ArrowLeft,
  ChevronDown,
  Circle,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import {
  LESSON_STYLES,
  type LessonStyle,
} from '@/curriculum/data/lessonStyles';
import {
  BAND_INSTRUMENTS,
  type Band,
  type BandInstrument,
  type BandLayer,
  type BandMember,
  type BandSource,
  type BandVariation,
  bandIdFrom,
  bandSources,
  bandVariation,
  layerIdFor,
} from '@/curriculum/engine/band/band';
import { layerSound, realizeBand } from '@/curriculum/engine/band/realize';
import { ALL_ITEMS } from '@/curriculum/engine/band/registry';
import { lineBars } from '@/curriculum/engine/bassLines/bassLine';
import {
  chordSymbol,
  KEYS,
  PROGRESSIONS,
  parseChart,
  progressionById,
  quartersPerBar,
  realizePreset,
} from '@/curriculum/engine/bassLines/harmony';
import { compingBars } from '@/curriculum/engine/chordComping/chordComping';
import { preloadStudioGroove } from '@/curriculum/engine/drumGrooves/registry';
import { barTicks } from '@/curriculum/engine/meter';
import {
  blankPart,
  type InstrumentPart,
  type PartInstrument,
  type PartNote,
  uniquePartId,
} from '@/curriculum/engine/parts/part';
import { getSampleInstrument } from '@/daw/instruments/sampleInstruments';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useBassLineList } from '../bassLines/bassLineSession';
import { previewHarmony } from '../chordComping/compingGrid';
import { useCompingList } from '../chordComping/compingSession';
import { useUnsavedChanges } from '../content/mirror/UnsavedChangesGuard';
import { useGrooveList } from '../drumGrooves/grooveSession';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { usePartList } from '../parts/partFiles';
import { fileItem } from '../players/playerFiles';
import { usePlayerList } from '../players/playerSession';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../ui/styles';
import { BandAssignments } from './BandAssignments';
import { BandCapture, type Take } from './BandCapture';
import { LaneStrip } from './LaneStrip';
import { LayerItemEditor } from './LayerItemEditor';
import { SampleInstrumentMaker } from './SampleInstrumentMaker';
import { SynthLayerPanel } from './SynthLayerPanel';
import { CAN_WRITE_FILES, downloadBand, saveBand } from './bandFiles';
import { usePairingList } from './bandSession';
import {
  SAMPLE_PREFIX,
  SYNTH_PREFIX,
  soundGroups,
  soundLabel,
} from './bandSounds';
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

/** Where each kind of item is edited on its own. */
const LIBRARY_HREF: Record<BandSource['kind'], (id: string) => string> = {
  groove: (id) => AdminRoutes.drumGroove({ id }),
  bassLine: (id) => AdminRoutes.bassLine({ id }),
  comping: (id) => AdminRoutes.chordCompingPattern({ id }),
  part: (id) => AdminRoutes.part({ id }),
};

/** The kinds of item a layer on an instrument can play: its own, or a part. */
const kindsFor = (instrument: BandInstrument): BandSource['kind'][] =>
  instrument === 'drums' || instrument === 'percussion'
    ? ['groove', 'part']
    : instrument === 'bass'
      ? ['bassLine', 'part']
      : ['comping', 'part'];

/** Whether a part, by the instrument it was written for, suits a layer. */
const partFits = (partInstrument: string | undefined, layer: BandInstrument) =>
  partInstrument === 'drums'
    ? layer === 'drums' || layer === 'percussion'
    : partInstrument === 'bass'
      ? layer === 'bass'
      : partInstrument === 'guitar'
        ? layer === 'guitar'
        : // A piano part suits any pitched layer but the bass.
          !['drums', 'percussion', 'bass'].includes(layer);

/** The part instrument a layer's take is written for. */
const PART_INSTRUMENT_OF: Record<BandInstrument, PartInstrument> = {
  drums: 'drums',
  percussion: 'drums',
  bass: 'bass',
  guitar: 'guitar',
  keys: 'piano',
  synth: 'piano',
  strings: 'piano',
  horns: 'piano',
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
  /** The layer a sound is being sampled for, and whether it edits its own. */
  const [sampling, setSampling] = useState<{
    layerId: string;
    edit: boolean;
  } | null>(null);
  /** The open layer's panel, scrolled to when its editor opens. */
  const panelRef = useRef<HTMLDivElement>(null);
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

  const pairings = usePairingList();

  const set = (patch: Partial<Band>) => setDraft((b) => ({ ...b, ...patch }));
  const setLayer = (id: string, patch: Partial<BandMember>) =>
    setDraft((b) => ({
      ...b,
      layers: b.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  // ── variations ──
  const variations = draft.variations ?? [];
  const [variationId, setVariationId] = useState(initial.variations?.[0]?.id);
  const variation =
    variations.find((v) => v.id === variationId) ?? variations[0];
  const setVariation = (patch: Partial<BandVariation>) =>
    variation &&
    setDraft((b) => ({
      ...b,
      variations: b.variations?.map((v) =>
        v.id === variation.id ? { ...v, ...patch } : v,
      ),
    }));
  /** What a member plays in the open variation; nothing = as in the lesson. */
  const sourceOf = (l: BandMember): BandSource | undefined =>
    variation ? variation.plays[l.id] : l.source;
  const setSource = (memberId: string, source: BandSource | undefined) => {
    if (!variation) {
      if (source) setLayer(memberId, { source });
      return;
    }
    const plays = { ...variation.plays };
    if (source) plays[memberId] = source;
    else delete plays[memberId];
    setVariation({ plays });
  };
  const variationIdFor = (name: string) => {
    const base = bandIdFrom(name);
    const taken = new Set(variations.map((v) => v.id));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    return id;
  };
  /** The genre's styles, for a variation's "made for". */
  const genreStyles = LESSON_STYLES.filter(
    (st) => !draft.genre || st.genre === draft.genre,
  );
  /**
   * One variation per style the genre teaches: the members' items go to the
   * style the band already plays in lessons (else the first); the rest start
   * as the lessons play.
   */
  const addVariations = () => {
    const own = Object.fromEntries(
      draft.layers.flatMap((l) => (l.source ? [[l.id, l.source]] : [])),
    );
    const paired = pairings.find((p) => p.band === draft.id)?.id;
    const styles: (LessonStyle | undefined)[] = genreStyles.length
      ? genreStyles
      : [undefined];
    const home = styles.find((st) => st?.id === paired) ?? styles[0];
    const list: BandVariation[] = styles.map((st) => ({
      id: st ? st.id.slice(st.genre.length + 1) : 'main',
      name: st ? `L${st.level} · ${st.name}` : draft.name,
      ...(st ? { style: st.id } : {}),
      plays: st === home ? own : {},
    }));
    set({
      layers: draft.layers.map(({ source: _source, ...m }) => m),
      variations: list,
    });
    setVariationId(list[styles.indexOf(home)].id);
  };
  const newVariation = () => {
    const name = variation ? `${variation.name} copy` : 'New variation';
    const next: BandVariation = {
      ...(variation ?? { plays: {} }),
      id: variationIdFor(name),
      name,
      style: undefined,
    };
    set({ variations: [...variations, next] });
    setVariationId(next.id);
  };
  const removeVariation = () => {
    if (!variation || variations.length < 2) return;
    const rest = variations.filter((v) => v.id !== variation.id);
    set({ variations: rest });
    setVariationId(rest[0].id);
  };
  /** The band as the open variation plays it. */
  const playable = bandVariation(draft, variation?.id);
  const tempo = playable.tempo;

  // ── the chart it plays over ──
  const ts = playable.timeSignature;
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
    ...playable.layers.map((l) => {
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

  // The Studio's imported grooves load on demand: the ones the layers name are
  // loaded before they play, and the band re-reads them once they are.
  const grooveIds = [
    ...new Set(
      bandSources(draft)
        .filter((src) => src.kind === 'groove')
        .map((src) => src.id),
    ),
  ].join(',');
  const [studioLoaded, setStudioLoaded] = useState(0);
  useEffect(() => {
    let alive = true;
    void Promise.all(
      grooveIds.split(',').filter(Boolean).map(preloadStudioGroove),
    ).then(() => alive && setStudioLoaded((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [grooveIds]);

  // ── what every layer plays ──
  // The item lists are read so an edit to an item, saved in its own editor,
  // is heard here at once.
  const realized = useMemo(
    () =>
      harmony
        ? realizeBand(
            playable,
            ALL_ITEMS,
            {
              chordAt: harmony.chordAt,
              bars,
              timeSignature: ts,
              genre: draft.genre,
            },
            { includeMuted: true },
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, harmony, bars, ts, grooves, lines, patterns, parts, studioLoaded],
  );
  const notesOf = new Map(realized.map((r) => [r.layer.id, r.notes]));
  const playerLayers: PlayerLayer[] = playable.layers.map((l) => ({
    id: l.id,
    sound: layerSound(l, ALL_ITEMS),
    notes: notesOf.get(l.id) ?? [],
    volume: l.volume ?? 1,
    muted: Boolean(l.muted),
  }));

  const player = useBandPlayer();

  // ── capturing a part with the band ──
  const store = useInstrumentStore();
  const [take, setTakeState] = useState<Take | null>(null);
  const setTake = (update: (t: Take | null) => Take | null) =>
    setTakeState(update);
  /** The click the band plays while a take records, if wanted. */
  const [takeClick, setTakeClick] = useState(false);
  /** The band without the layer being captured: its own part sits out. */
  const backingLayers = take
    ? playerLayers.filter((l) => l.id !== take.layerId)
    : playerLayers;
  const playBand = (click = take?.recording ? takeClick : false) =>
    void player.play(backingLayers, {
      bpm: tempo,
      totalTicks,
      click: click ? ts : undefined,
    });

  const notesKey = JSON.stringify(
    backingLayers.map((l) => [l.id, l.sound, l.notes.length, totalTicks]),
  );
  // An edit while playing is heard on the next pass; a level at once.
  useEffect(() => {
    if (player.playing) playBand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesKey, realized, tempo]);
  const mixKey = JSON.stringify(
    playerLayers.map((l) => [l.id, l.volume, l.muted]),
  );
  useEffect(() => {
    player.mix(playerLayers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixKey]);

  const toggle = () => {
    if (player.playing) {
      player.stop();
      setTake((t) => t && { ...t, recording: false });
    } else playBand(false);
  };

  /** The sound a layer's take is heard on while it's played in. */
  const monitorSoundOf = (l: BandMember) =>
    playerLayers.find((x) => x.id === l.id)?.sound ??
    l.sound ??
    blankPart('take', 'take', PART_INSTRUMENT_OF[l.instrument]).sound;

  /**
   * Keeps a take as a new part: the band's meter, tempo, length, key and
   * chords; filed under the layer's player; played by the layer in the open
   * variation; opened in its editor to tidy and publish.
   */
  const keepTake = async (l: BandMember, notes: PartNote[]) => {
    const who = players.find((p) => p.id === l.player);
    const count =
      (who?.items.filter((i) => i.kind === 'part').length ?? parts.length) + 1;
    const name = `${who?.name ?? l.name} · ${variation?.name ?? draft.name} take ${count}`;
    // A typed chart is in its first chord's key; a preset, in the key picked.
    const first = typed?.bars[0]?.[0];
    const tonic = first && !first.nc ? first.root : keyPc;
    const minor = first
      ? /^m(?!aj)/.test(first.quality)
      : Boolean(progression.minor);
    const part: InstrumentPart = {
      ...blankPart(
        uniquePartId(name, new Set(parts.map((x) => x.id))),
        name,
        PART_INSTRUMENT_OF[l.instrument],
      ),
      ...(draft.genre ? { genre: draft.genre } : {}),
      key: { tonic, mode: minor ? 'aeolian' : 'ionian' },
      timeSignature: ts,
      bars,
      tempo,
      sound: monitorSoundOf(l),
      chordSymbols: Array.from({ length: bars }, (_, b) => {
        const chord = chartBars[b % chartBars.length]?.[0];
        return chord ? chordSymbol(chord) : '';
      }),
      notes,
    };
    try {
      await store.save('instrument_part', part);
      if (l.player) await fileItem({ kind: 'part', id: part.id }, l.player);
      setSource(l.id, { kind: 'part', id: part.id });
      setTake(() => null);
      editLayer(l.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

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
    const source = { kind: spec.kind, id: first } as BandSource;
    const member: BandMember = {
      id,
      name: spec.label,
      instrument: spec.instrument,
    };
    // With variations it plays its item in the open one only.
    setDraft((b) => ({
      ...b,
      layers: [...b.layers, variation ? member : { ...member, source }],
      variations: b.variations?.map((v) =>
        v.id === variation?.id
          ? { ...v, plays: { ...v.plays, [id]: source } }
          : v,
      ),
    }));
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
    set({
      layers: draft.layers.filter((l) => l.id !== id),
      variations: draft.variations?.map((v) => ({
        ...v,
        plays: Object.fromEntries(
          Object.entries(v.plays).filter(([member]) => member !== id),
        ),
      })),
    });
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

  const itemsFor = (kind: BandSource['kind']) =>
    kind === 'groove'
      ? grooves.map((g) => ({ id: g.id, name: g.name, status: g.status }))
      : kind === 'bassLine'
        ? lines.map((l) => ({ id: l.id, name: l.name, status: l.status }))
        : kind === 'comping'
          ? patterns.map((c) => ({ id: c.id, name: c.name, status: c.status }))
          : parts.map((p) => ({ id: p.id, name: p.name, status: p.status }));
  const layer = draft.layers.find((l) => l.id === selected) ?? null;
  /** What the open layer plays in the open variation. */
  const layerSource = layer ? sourceOf(layer) : undefined;

  const itemName = layerSource
    ? itemsFor(layerSource.kind).find((i) => i.id === layerSource.id)?.name
    : undefined;
  /** The open layer's sampled sound, which "Edit the sound" reopens. */
  const sampleSound = layer?.sound?.startsWith(SAMPLE_PREFIX)
    ? getSampleInstrument(layer.sound.slice(SAMPLE_PREFIX.length))
    : undefined;

  /** Opens a layer's item in its own editor, below, and goes there. */
  const editLayer = (id: string) => {
    setSelected(id);
    setSynth(null);
    setSampling(null);
    // The item's editor previews on its own transport.
    player.stop();
    setEditingItem(true);
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };
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
        {/* A band with variations plays a style in each. */}
        {!variations.length && (
          <label className="flex flex-col gap-1">
            <span className={CONSOLE_LABEL}>Style</span>
            <input
              value={draft.style ?? ''}
              onChange={(e) => set({ style: e.target.value || undefined })}
              className={cn(input, 'w-36')}
              placeholder="Cumbia"
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Meter</span>
          <select
            value={ts.join('/')}
            onChange={(e) => {
              const timeSignature = e.target.value.split('/').map(Number) as [
                number,
                number,
              ];
              if (variation) setVariation({ timeSignature });
              else set({ timeSignature });
            }}
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
            value={tempo}
            onChange={(e) => {
              const next = Number(e.target.value) || 96;
              if (variation) setVariation({ tempo: next });
              else set({ tempo: next });
            }}
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

      {/* ── its variations ── */}
      <div className={cn(CONSOLE_PANEL, 'flex flex-col gap-2 p-3')}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(CONSOLE_LABEL, 'mr-1')}>Variations</span>
          {variations.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVariationId(v.id);
                setEditingItem(false);
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs',
                v.id === variation?.id
                  ? 'bg-white font-semibold text-black'
                  : 'bg-white/10 hover:bg-white/20',
              )}
              aria-pressed={v.id === variation?.id}
            >
              {v.name}
            </button>
          ))}
          {variations.length ? (
            <Button size="sm" variant="ghost" onClick={newVariation}>
              <Plus /> New variation
            </Button>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                One arrangement for now.
              </span>
              <Button size="sm" variant="secondary" onClick={addVariations}>
                <Plus /> A variation for every{' '}
                {genreStyles.length && draft.genre
                  ? `${genreStyles[0].genreName} style`
                  : 'style'}
              </Button>
            </>
          )}
        </div>
        {variation && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className={CONSOLE_LABEL}>Name</span>
              <input
                value={variation.name}
                onChange={(e) => setVariation({ name: e.target.value })}
                className={cn(input, 'w-56')}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={CONSOLE_LABEL}>Made for</span>
              <select
                value={variation.style ?? ''}
                onChange={(e) =>
                  setVariation({ style: e.target.value || undefined })
                }
                className={input}
              >
                <option value="">No lesson style</option>
                {genreStyles.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.genreName} L{st.level} · {st.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="max-w-xl flex-1 text-xs text-muted-foreground">
              {(() => {
                const given = Object.keys(variation.plays).length;
                const members = `${given} of ${draft.layers.length} members play their own item here; the rest play as the lesson does.`;
                if (!variation.style)
                  return `${members} Exceptions below can name it.`;
                const paired =
                  pairings.find((p) => p.id === variation.style)?.band ===
                  draft.id;
                return paired
                  ? `${members} Its lessons play it.`
                  : `${members} Its lessons play it once this band is used for the style below.`;
              })()}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={removeVariation}
              disabled={variations.length < 2}
            >
              <Trash2 /> Remove variation
            </Button>
          </div>
        )}
      </div>

      {/* ── transport ── */}
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={toggle} disabled={!playable.layers.length}>
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
          {bars} bar{bars === 1 ? '' : 's'} · {ts.join('/')} · {tempo} bpm
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
          const src = sourceOf(l);
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
                  <button
                    type="button"
                    onClick={() => editLayer(l.id)}
                    disabled={!src}
                    className="ml-auto flex shrink-0 items-center gap-1 rounded bg-white/10 px-1.5 text-[11px] font-semibold hover:bg-white/20 disabled:opacity-40"
                    title={
                      src
                        ? `Edit the notes of this ${SOURCE_LABEL[src.kind].toLowerCase()}`
                        : 'Plays as in the lesson here: pick what it plays first'
                    }
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="relative min-w-0 flex-1 px-1 py-1 text-white"
                onClick={() => {
                  setSelected(l.id);
                  setEditingItem(false);
                }}
                onDoubleClick={() => src && editLayer(l.id)}
                title="Click to open · double-click to edit its notes"
                aria-label={`Open ${l.name}`}
              >
                {take?.layerId === l.id ? (
                  <LaneStrip
                    notes={take.notes.map((n) => ({
                      note: n.midi,
                      onset: n.tick,
                      duration: n.duration,
                      velocity: n.velocity,
                      part: 'chords' as const,
                    }))}
                    totalTicks={totalTicks}
                    barTicks={barTicks(ts)}
                    drums={false}
                    muted={false}
                    colour="#fb7185"
                  />
                ) : src ? (
                  <LaneStrip
                    notes={notesOf.get(l.id) ?? []}
                    totalTicks={totalTicks}
                    barTicks={barTicks(ts)}
                    drums={src.kind === 'groove'}
                    muted={Boolean(l.muted) || (player.solo !== null && !solo)}
                    colour={COLOUR[l.instrument]}
                  />
                ) : (
                  <span className="flex h-full items-center px-3 text-xs italic text-muted-foreground">
                    As in the lesson: its own backing plays this part (silent
                    here). Open it to pick what it plays.
                  </span>
                )}
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
        <div
          ref={panelRef}
          className={cn(CONSOLE_PANEL, 'flex scroll-mt-4 flex-col gap-3 p-3')}
        >
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
              <span className={CONSOLE_LABEL}>What it plays</span>
              <select
                value={
                  layerSource ? `${layerSource.kind}:${layerSource.id}` : ''
                }
                onChange={(e) => {
                  const at = e.target.value.indexOf(':');
                  setSource(
                    layer.id,
                    at < 0
                      ? undefined
                      : ({
                          kind: e.target.value.slice(0, at),
                          id: e.target.value.slice(at + 1),
                        } as BandSource),
                  );
                  setEditingItem(false);
                }}
                className={cn(input, 'max-w-[20rem]')}
              >
                {(() => {
                  const kinds = kindsFor(layer.instrument);
                  // The layer may still name a kind its instrument no longer
                  // takes; keep it listed so the picker shows what it plays.
                  if (layerSource && !kinds.includes(layerSource.kind))
                    kinds.unshift(layerSource.kind);
                  const by = players.find((p) => p.id === layer.player);
                  const isTheirs = (kind: BandSource['kind'], id: string) =>
                    !!by?.items.some((i) => i.kind === kind && i.id === id);
                  const option = (
                    kind: BandSource['kind'],
                    item: { id: string; name: string; status: string },
                    withKind: boolean,
                  ) => (
                    <option
                      key={`${kind}:${item.id}`}
                      value={`${kind}:${item.id}`}
                    >
                      {item.name}
                      {withKind ? ` · ${SOURCE_LABEL[kind].toLowerCase()}` : ''}
                      {item.status === 'live' ? '' : ' (draft)'}
                    </option>
                  );
                  return (
                    <>
                      {variation && (
                        <option value="">
                          As in the lesson (its own backing)
                        </option>
                      )}
                      {by && (
                        <optgroup label={`${by.name} plays`}>
                          {kinds.flatMap((kind) =>
                            itemsFor(kind)
                              .filter((item) => isTheirs(kind, item.id))
                              .map((item) =>
                                option(kind, item, kinds.length > 1),
                              ),
                          )}
                        </optgroup>
                      )}
                      {kinds.map((kind) => (
                        <optgroup
                          key={kind}
                          label={`${by ? 'Other ' : 'All '}${SOURCE_LABEL[kind].toLowerCase()}s`}
                        >
                          {itemsFor(kind)
                            .filter((item) => !isTheirs(kind, item.id))
                            .filter(
                              (item) =>
                                kind !== 'part' ||
                                partFits(
                                  parts.find((pt) => pt.id === item.id)
                                    ?.instrument,
                                  layer.instrument,
                                ),
                            )
                            .map((item) => option(kind, item, false))}
                        </optgroup>
                      ))}
                    </>
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
                  {layerSource
                    ? soundLabel(
                        layerSound(
                          { ...layer, source: layerSource, sound: undefined },
                          ALL_ITEMS,
                        ),
                        layer.instrument,
                      )
                    : 'its item’s sound'}
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
          {editingItem && layerSource ? (
            <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Editing the {SOURCE_LABEL[layerSource.kind].toLowerCase()}{' '}
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
                source={layerSource}
                onReplace={(source) => {
                  setSource(layer.id, source);
                  // The copy belongs to whoever plays the layer.
                  if (layer.player)
                    void fileItem(source, layer.player).catch(() => undefined);
                }}
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
              {layerSource ? (
                <>
                  <Button size="sm" onClick={() => editLayer(layer.id)}>
                    <Pencil /> Edit the{' '}
                    {SOURCE_LABEL[layerSource.kind].toLowerCase()}
                    {itemName ? `: ${itemName}` : ''}
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={LIBRARY_HREF[layerSource.kind](layerSource.id)}>
                      <ExternalLink /> Open in its library
                    </Link>
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  In {variation?.name} this plays as the lesson does. Pick what
                  it plays above to give it an item of its own.
                </span>
              )}
              {CAN_WRITE_FILES && !take && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-500/60 text-rose-200"
                  onClick={() => {
                    player.stop();
                    setEditingItem(false);
                    setTake(() => ({
                      layerId: layer.id,
                      recording: false,
                      notes: [],
                    }));
                  }}
                  title="Play a new part in on a MIDI keyboard while the band plays"
                >
                  <Circle className="fill-rose-500 text-rose-500" /> Capture a
                  part with the band
                </Button>
              )}
              {layer.sound?.startsWith(SYNTH_PREFIX) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const playing = playerLayers.find((l) => l.id === layer.id);
                    const engine = playing
                      ? await player.synthEngine(playing)
                      : null;
                    if (engine) setSynth({ layerId: layer.id, engine });
                    else
                      setError(
                        'The synth starts on a layer that plays something in this variation.',
                      );
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
                <>
                  {sampleSound && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setSampling({ layerId: layer.id, edit: true })
                      }
                    >
                      <Pencil /> Edit the sound: {sampleSound.name} (
                      {Object.keys(sampleSound.samples).length} samples)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setSampling({ layerId: layer.id, edit: false })
                    }
                  >
                    <Plus /> New sound from samples
                  </Button>
                </>
              )}
            </div>
          )}
          {take?.layerId === layer.id && (
            <BandCapture
              take={take}
              setTake={setTake}
              layerName={layer.name}
              monitorSound={monitorSoundOf(layer)}
              timeSignature={ts}
              tempo={tempo}
              totalTicks={totalTicks}
              player={player}
              playBand={(click) => {
                setTakeClick(click);
                playBand(click);
              }}
              onKeep={(notes) => keepTake(layer, notes)}
            />
          )}
          {sampling?.layerId === layer.id && (
            <SampleInstrumentMaker
              // Editing one sound, then making another, starts fresh.
              key={`${layer.id}:${sampling.edit}`}
              instrument={layer.instrument}
              editing={sampling.edit ? sampleSound : undefined}
              onMade={(sound) => {
                if (sound === layer.sound) player.reloadSound(sound);
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
