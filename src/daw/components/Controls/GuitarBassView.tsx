/* eslint-disable tailwindcss/classnames-order, tailwindcss/enforces-shorthand */
import { KEY_COLORS } from '@/daw/prism-engine/data/keyColors';
import type { ColorIndex } from '@/daw/prism-engine/types';
import { ROOT_TO_KEY_INDEX } from '@/daw/components/Library/insightConstants';
import { monitorsInput } from '@/daw/model/monitoring';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useStore } from '@/daw/store';
import type { AudioInputChannel } from '@/daw/store/tracksSlice';
import { FoldableDockColumn } from '@/daw/shell/dock/FoldableDockColumn';
import { TunerDisplay } from './TunerDisplay';
import { COLOR } from '@/daw/ui/tokens';
import {
  paramsForKey,
  PITCH_CORRECTION_DEFAULTS,
} from './PitchCorrectionControls';
import { AudioEffectPicker } from '@/daw/shell/dock/AudioEffectPicker';
import { AudioTrackFx } from '@/daw/shell/dock/AudioFxCards';
import { withAmp, withOneAmp } from '@/daw/shell/dock/audioChain';
import type { AudioEffectItem } from '@/daw/data/audioEffects';
import { useEffectiveKey } from '@/daw/harmony/effectiveKey';
import {
  ControlGestureContext,
  useSaveOnRelease,
} from '@/daw/hooks/useContinuousControl';
import { withoutHistory } from '@/daw/store/history';
import { applyPedalChain, pedalBlocksOf } from '@/daw/audio/applyPedalChain';
import {
  getTrackAudioState,
  subscribeEngineReady,
} from '@/daw/hooks/usePlaybackEngine';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { CRYSTAL_PATHS } from './CrystalIcons';
import { getAudioInputs } from '@/daw/midi/AudioInputEnumerator';

// ── Pedal Block Types & Catalog ─────────────────────────────────────────

/** An Audio track's chain: its amp and pitch correction (audioEffects). */
type PedalBlockType = 'nam-amp' | 'pitch-correction';

interface PedalBlock {
  id: string;
  type: PedalBlockType;
  enabled: boolean;
  params: Record<string, number>;
  namModelId?: string | null;
}

interface PedalParamDef {
  key: string;
  label: string;
  default: number;
}

interface PedalDef {
  type: PedalBlockType;
  name: string;
  category: string;
  color: string;
  params: PedalParamDef[];
}

/** The amp's blue, for a model with no gem colour. */
const AMP_BLUE = '#60a5fa';

const PEDAL_CATALOG: PedalDef[] = [
  // An audio track's only (the Add audio effect picker): not in the guitar
  // and bass Pedals list. Its card is AudioFxCards'.
  {
    type: 'pitch-correction',
    name: 'Pitch Correction',
    category: 'Pitch',
    color: COLOR.text.value,
    params: Object.entries(PITCH_CORRECTION_DEFAULTS).map(([key, value]) => ({
      key,
      label: key,
      default: value,
    })),
  },
  {
    type: 'nam-amp',
    name: 'Amp',
    category: 'Amp',
    color: AMP_BLUE,
    params: [
      { key: 'inputLevel', label: 'Input', default: 0.5 },
      { key: 'bass', label: 'Bass', default: 0.5 },
      { key: 'mid', label: 'Mid', default: 0.5 },
      { key: 'treble', label: 'Treble', default: 0.5 },
      { key: 'presence', label: 'Presence', default: 0.5 },
      { key: 'outputLevel', label: 'Output', default: 0.5 },
      { key: 'volume', label: 'Volume', default: 0.7 },
    ],
  },
];

// ── SVG Effect Icons ──────────────────────────────────────────────────────

function PedalIcon({
  type,
  size = 24,
  color,
  namModelId,
}: {
  type: PedalBlockType;
  size?: number;
  color: string;
  namModelId?: string;
}) {
  const s = size;
  const props = {
    width: s,
    height: s,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (type) {
    case 'pitch-correction':
      // Its icon from public/icons, painted in `color`.
      return (
        <span
          aria-hidden
          className="block shrink-0"
          style={{
            width: s,
            height: s,
            backgroundColor: color,
            maskImage: 'url(/icons/pitch-correction-icon.svg)',
            WebkitMaskImage: 'url(/icons/pitch-correction-icon.svg)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />
      );
    case 'nam-amp': {
      const crystal = namModelId ? CRYSTAL_PATHS[namModelId] : undefined;
      if (crystal) {
        return (
          <svg width={s} height={s} viewBox={crystal.viewBox}>
            <path fill={color} d={crystal.d} />
          </svg>
        );
      }
      return (
        <svg {...props}>
          <polygon points="8,3 16,3 20,9 12,22 4,9" />
          <polyline points="4,9 20,9" />
          <polyline points="8,3 12,9 16,3" />
          <line x1="12" y1="9" x2="12" y2="22" />
        </svg>
      );
    }
  }
}

const GEM_COLORS: Record<string, string> = {
  // Guitar — Clean
  'nam-clean-twin': '#f0f0f0', // Quartz — clear/white
  'nam-marshall-jcm-clean': '#f5a623', // Amber — warm amber
  'nam-magnatone-59': '#48d1cc', // Aquamarine — sea blue-green
  'nam-roland-jc120': '#a8c8e8', // Celestite — pale sky blue
  'nam-vox-ac30': '#50c878', // Emerald — vivid green
  // Guitar — Crunch
  'nam-crunch-plexi': '#f0a040', // Sunstone — golden orange
  'nam-vox-ac15': '#e85d2f', // Fire Opal — fiery orange-red
  'nam-marshall-jcm800': '#e0115f', // Ruby — deep red
  // Guitar — Hi Gain
  'nam-high-gain': '#b8860b', // Tiger's Eye — golden brown
  'nam-mesa-mark-iv': '#9966cc', // Amethyst — purple
  'nam-engl-savage': '#3fb094', // Amazonite — teal green
  'nam-friedman-be': '#4a4a52', // Obsidian — dark gray
  'nam-soldano-slo': '#2850a8', // Sapphire — deep blue
  'nam-orange-rockerverb': '#f4a0b0', // Rose Quartz — soft pink
  // Bass — Clean
  'nam-ampeg-svt': '#b9f2ff', // Diamond — brilliant pale blue-white
  'nam-gk-800rb': '#2d68c4', // Azurite — deep azure blue
  'nam-mesa-subway': '#c4c4d0', // Moonstone — pale silvery
  // Bass — Crunch
  'nam-ampeg-v4': '#2650a0', // Lapis Lazuli — royal blue
  'nam-markbass-lm3': '#cda434', // Pyrite — brassy gold
  'nam-fender-bassman': '#9b2335', // Garnet — dark red
  'nam-aguilar-th500': '#daa520', // Goldstone — warm gold
  // Bass — Hi Gain
  'nam-darkglass-b7k': '#882222', // Bloodstone — dark red-brown
  'nam-svt-cranked': '#0bda51', // Malachite — bright green
};

/** An amp model's gem colour; the amp's blue for a model with none. */
const gemColor = (modelId: string | null | undefined) =>
  GEM_COLORS[modelId ?? ''] ?? AMP_BLUE;

/**
 * The song's key centre's colour (the Insight panel's: KEY_COLORS by the
 * key's tonic), or null while no key is set.
 */
export function keyCentreColor(rootNote: number | null): string | null {
  if (rootNote === null) return null;
  const [r, g, b] = KEY_COLORS[ROOT_TO_KEY_INDEX[rootNote] as ColorIndex];
  return `rgb(${r}, ${g}, ${b})`;
}

function getPedalDef(type: PedalBlockType): PedalDef {
  return PEDAL_CATALOG.find((d) => d.type === type) ?? PEDAL_CATALOG[0];
}

function createBlock(type: PedalBlockType): PedalBlock {
  const def = getPedalDef(type);
  const params: Record<string, number> = {};
  for (const p of def.params) params[p.key] = p.default;
  return {
    id: `${type}-${Date.now()}`,
    type,
    enabled: true,
    params,
    namModelId: type === 'nam-amp' ? null : undefined,
  };
}

// ── Helper: get adapter if ready ────────────────────────────────────────

// The engine registers a track's adapter before its init resolves and hands
// it to the track engine after, right before it notifies engine-ready, so
// reading it from the track engine means built and ready.
/** The chain as the track stores it: the view's blocks without their ids. */
function storedGuitarChain(chain: PedalBlock[]) {
  return chain.map((b) => ({
    type: b.type,
    enabled: b.enabled,
    params: b.params,
    namModelId: b.namModelId,
  }));
}

/** A fresh id for a block taken from the stored chain. */
function freshBlockId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function getAdapter(trackId: string): GuitarFxAdapter | null {
  const instrument = getTrackAudioState(trackId)?.trackEngine.getInstrument();
  return instrument instanceof GuitarFxAdapter ? instrument : null;
}

// Input 1, for a track with no saved channel (an older save, a cloud open, a
// track that came from a collaborator): the channel label already shows it,
// and the input stays connected instead of being dropped.
const DEFAULT_INPUT_CHANNEL: AudioInputChannel = { mode: 'mono', channel: 0 };

// ── GuitarBassView ──────────────────────────────────────────────────────
//
// An Audio track's dock (the only live-input track since the Guitar, Bass
// and Voice tracks folded into it, 2026-10-22): its input picked in the
// track list, so the Tuner has the left column; then one row of cards
// (AudioTrackFx): its own chain, an amp and pitch correction the engine
// plays its live input and every clip through, and its effects. Its chain
// starts empty, so it records and monitors clean.

export function GuitarBassView({ trackId }: { trackId: string }) {
  const audioInputChannel = useStore(
    (s) => s.tracks.find((t) => t.id === trackId)?.audioInputChannel ?? null,
  );
  // The channel the input uses (the track list's input menu picks it).
  const inputChannel = audioInputChannel ?? DEFAULT_INPUT_CHANNEL;
  const globalInputDeviceId = useStore((s) => s.inputDeviceId);
  const bpm = useStore((s) => s.bpm);
  const [tunerActive, setTunerActive] = useState(false);
  // The amps in the chain wear the key centre's colour (owner, 2026-10-22);
  // each model's own gem colour while no key is set. The picker keeps the
  // gem colours, so its models stay told apart.
  const keyColor = keyCentreColor(useStore((s) => s.rootNote));
  const ampColor = (id: string | null | undefined) => keyColor ?? gemColor(id);

  // Signal chain state — restore from store if available (survives unmount/remount)
  const storedChain = useStore(
    (s) => s.tracks.find((t) => t.id === trackId)?.guitarChain,
  );
  // An audio track's chain holds one amp at a time (audioChain.ts): one
  // that arrives with more keeps its first, and the view saves it so.
  const [chain, setChain] = useState<PedalBlock[]>(() =>
    withOneAmp(
      (storedChain ?? []).map((b) => ({
        ...b,
        type: b.type as PedalBlockType,
        id: freshBlockId(b.type),
        namModelId: b.namModelId,
      })),
    ),
  );

  // This track's adapter, once the engine has built it. The engine starts on
  // the first click or key press, usually after this view mounted (always
  // after a reload), so the engine-facing effects below depend on it and
  // apply the device, chain and amp model when it arrives. Another track's
  // instrument finishing its init leaves it unchanged, so nothing re-applies
  // then (a chain sync rewires, and a model restore downloads the model).
  const adapter = useSyncExternalStore(subscribeEngineReady, () =>
    getAdapter(trackId),
  );

  // With no input chosen yet, the first one the browser lists.
  useEffect(() => {
    const enumerate = () => {
      getAudioInputs().then((list) => {
        if (!useStore.getState().inputDeviceId && list.length > 0) {
          useStore.getState().setInputDevice(list[0].id, 2);
        }
      });
    };
    enumerate();
    navigator.mediaDevices.addEventListener('devicechange', enumerate);
    return () =>
      navigator.mediaDevices.removeEventListener('devicechange', enumerate);
  }, []);

  // Connect adapter to per-track input device + channel (falls back to system default)
  // The channel goes first: the adapter keeps it for a stream still opening,
  // so a slow open can't land an older channel over a newer pick.
  useEffect(() => {
    if (!adapter) return;
    if (!globalInputDeviceId) {
      adapter.setDevice(null);
      return;
    }
    adapter.setChannelConfig(inputChannel);
    adapter
      .setDevice(globalInputDeviceId)
      .catch((err) => console.warn('[LiveInput] Could not open input:', err));
  }, [adapter, globalInputDeviceId, inputChannel]);

  // Mute monitoring when tuner is active to prevent feedback
  // (main monitoring sync is handled centrally in usePlaybackEngine)
  useEffect(() => {
    if (!tunerActive) return;
    adapter?.setMonitoring(false);
    return () => {
      const track = useStore.getState().tracks.find((t) => t.id === trackId);
      adapter?.setMonitoring(track ? monitorsInput(track) : false);
    };
  }, [trackId, tunerActive, adapter]);

  // Play the view's chain through the adapter, on every edit (a knob's every
  // move), as applyPedalChain does for the engine: parameters update the
  // pedals in place, a pedal added, removed or moved rebuilds the chain
  // (live-input-05), and the amp's model loads once per adapter and model.
  // The engine has applied the stored chain already, so the view opening on
  // it changes nothing.
  useEffect(() => {
    if (!adapter) return;
    void applyPedalChain(adapter, pedalBlocksOf(storedGuitarChain(chain), bpm));
  }, [adapter, chain, bpm]);

  // The stored chain changed from outside the view (undo, redo, a
  // collaborator): the view takes it up, as the engine already has. A
  // block keeps its id while a block of its type stays in its slot.
  const seenStoredChain = useRef(JSON.stringify(storedChain ?? null));
  useEffect(() => {
    const json = JSON.stringify(storedChain ?? null);
    if (json === seenStoredChain.current) return;
    seenStoredChain.current = json;
    if (!storedChain) return;
    setChain((prev) => {
      if (JSON.stringify(storedGuitarChain(prev)) === json) return prev;
      return withOneAmp(
        storedChain.map((b, i) => ({
          ...b,
          type: b.type as PedalBlockType,
          id: prev[i]?.type === b.type ? prev[i].id : freshBlockId(b.type),
        })),
      );
    });
  }, [storedChain]);

  // Persist chain to store so it survives the view's unmount/remount: at
  // once after a click, and once on release after a knob drag, which the
  // pedals follow as it moves.
  const chainGesture = useSaveOnRelease({
    value: chain,
    isSaved: (c) =>
      JSON.stringify(storedGuitarChain(c)) ===
      JSON.stringify(
        useStore.getState().tracks.find((t) => t.id === trackId)?.guitarChain,
      ),
    save: (c) => {
      const write = () =>
        useStore.getState().setGuitarChain(trackId, storedGuitarChain(c));
      // A track that never had a chain gets the view's first one: filling
      // it in is bookkeeping, not an edit to undo.
      const had = useStore
        .getState()
        .tracks.find((t) => t.id === trackId)?.guitarChain;
      if (had === undefined) withoutHistory(write);
      else write();
    },
    label: 'Change pedal',
  });

  // ── Chain manipulation callbacks ──────────────────────────────────────

  const updateBlockParam = useCallback(
    (blockId: string, key: string, value: number) => {
      setChain((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, params: { ...b.params, [key]: value } }
            : b,
        ),
      );
    },
    [],
  );

  const toggleBlock = useCallback((blockId: string) => {
    setChain((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, enabled: !b.enabled } : b)),
    );
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setChain((prev) => prev.filter((b) => b.id !== blockId));
  }, []);

  // ── The Add audio effect picker ───────────────────────────────────────
  // Open on the chain index it adds at; null: shut.
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const effectiveKey = useEffectiveKey();
  const pickAudioEffect = useCallback(
    (item: AudioEffectItem) => {
      const at = pickerSlot;
      setPickerSlot(null);
      if (item.kind === 'amp') {
        // One amp at a time: the amp there takes the model (another pick
        // swaps it), and the chain's sync loads it in the background
        // (applyPedalChain). From the latest chain, not this render's.
        setChain((prev) =>
          withAmp(prev, item.id, () => createBlock('nam-amp')),
        );
        return;
      }
      if (chain.some((b) => b.type === 'pitch-correction')) return;
      // Tuned to the song's key when it has one; first in the chain unless
      // a slot says otherwise, so it hears the voice before anything else.
      const block = createBlock('pitch-correction');
      if (effectiveKey) {
        Object.assign(
          block.params,
          paramsForKey(effectiveKey.rootPc, effectiveKey.mode),
        );
      }
      setChain((prev) => {
        const copy = [...prev];
        copy.splice(Math.min(at ?? 0, copy.length), 0, block);
        return copy;
      });
    },
    [chain, pickerSlot, effectiveKey],
  );

  return (
    <ControlGestureContext.Provider value={chainGesture}>
      <div className="flex h-full">
        {/* ── Input Section ──────────────────────────────────── */}
        {/* A plain audio track picks its input in the track list (its
            row's input menu), so its dock gives the column to the Tuner. */}
        <FoldableDockColumn
          panel="tuner"
          name="Tuner"
          width={240}
          testId="audio-tuner-section"
        >
          <div className="h-full p-2">
            <TunerDisplay
              panel
              deviceId={globalInputDeviceId}
              instrumentType="guitar"
              onActiveChange={setTunerActive}
            />
          </div>
        </FoldableDockColumn>

        {/* ── Signal Chain ─────────────────────────────────────── */}
        {/* A plain audio track's chain is drawn as the dock's Effects are:
            effect cards and an Add audio effect card (AudioFxCards). */}
        <AudioTrackFx
          trackId={trackId}
          chain={chain}
          onToggle={toggleBlock}
          onRemove={removeBlock}
          onParam={updateBlockParam}
          onAddAudio={() => setPickerSlot(0)}
          ampColor={ampColor}
          renderAmpIcon={(id, size) => (
            <PedalIcon
              type="nam-amp"
              size={size}
              color={ampColor(id)}
              namModelId={id ?? undefined}
            />
          )}
        />
      </div>
      <AudioEffectPicker
        open={pickerSlot !== null}
        onOpenChange={(open) => {
          if (!open) setPickerSlot(null);
        }}
        ampModelId={chain.find((b) => b.type === 'nam-amp')?.namModelId ?? null}
        hasPitchCorrection={chain.some((b) => b.type === 'pitch-correction')}
        onPick={pickAudioEffect}
        renderIcon={(item) =>
          item.kind === 'amp' ? (
            <PedalIcon
              type="nam-amp"
              size={44}
              color={gemColor(item.id)}
              namModelId={item.id}
            />
          ) : (
            // Its art is inset in its frame: a size up, to sit with the gems.
            <PedalIcon
              type="pitch-correction"
              size={56}
              color={COLOR.text.value}
            />
          )
        }
      />
    </ControlGestureContext.Provider>
  );
}
