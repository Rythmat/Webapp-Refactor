import React, { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { RATE_LABELS } from '@/daw/audio/pedals/PhaserPedal';
import { useStore } from '@/daw/store';
import type { AudioInputChannel } from '@/daw/store/tracksSlice';
import { TunerDisplay } from './TunerDisplay';
import { RotaryKnob } from './RotaryKnob';
import { BUNDLED_MODELS, fetchBundledModel, type NamModelEntry } from '@/daw/audio/nam/NamModelStore';
import { getTrackAudioState, subscribeEngineReady, getEngineReadyVersion } from '@/daw/hooks/usePlaybackEngine';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { CRYSTAL_PATHS } from './CrystalIcons';
import { getAudioInputs, probeDeviceChannelCount, type AudioInputDevice } from '@/daw/midi/AudioInputEnumerator';

// ── Pedal Block Types & Catalog ─────────────────────────────────────────

type PedalBlockType =
  | 'overdrive' | 'nam-amp'
  | 'chorus' | 'phaser' | 'flanger'
  | 'compressor' | 'eq' | 'wah';

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

const PEDAL_CATALOG: PedalDef[] = [
  { type: 'overdrive', name: 'Overdrive', category: 'Drive', color: '#4ade80',
    params: [{ key: 'drive', label: 'Drive', default: 0.5 }, { key: 'tone', label: 'Tone', default: 0.5 }, { key: 'volume', label: 'Volume', default: 0.7 }] },
  { type: 'nam-amp', name: 'NAM Amp', category: 'Amp', color: '#60a5fa',
    params: [{ key: 'inputLevel', label: 'Input', default: 0.5 }, { key: 'bass', label: 'Bass', default: 0.5 }, { key: 'mid', label: 'Mid', default: 0.5 }, { key: 'treble', label: 'Treble', default: 0.5 }, { key: 'presence', label: 'Presence', default: 0.5 }, { key: 'outputLevel', label: 'Output', default: 0.5 }, { key: 'volume', label: 'Volume', default: 0.7 }] },
  { type: 'compressor', name: 'Compressor', category: 'Dynamics', color: '#f59e0b',
    params: [{ key: 'threshold', label: 'Threshold', default: 0.5 }, { key: 'ratio', label: 'Ratio', default: 0.3 }, { key: 'attack', label: 'Attack', default: 0.2 }, { key: 'release', label: 'Release', default: 0.5 }] },
  { type: 'chorus', name: 'Chorus', category: 'Modulation', color: '#a78bfa',
    params: [{ key: 'rate', label: 'Rate', default: 0.3 }, { key: 'depth', label: 'Depth', default: 0.5 }, { key: 'mix', label: 'Mix', default: 0.5 }] },
  { type: 'phaser', name: 'Phaser', category: 'Modulation', color: '#c084fc',
    params: [{ key: 'rateMode', label: 'Mode', default: 0 }, { key: 'rate', label: 'Hz', default: 0.3 }, { key: 'rateIdx', label: 'Rate', default: 10 }, { key: 'depth', label: 'Depth', default: 0.5 }, { key: 'mix', label: 'Mix', default: 0.5 }] },
  { type: 'flanger', name: 'Flanger', category: 'Modulation', color: '#818cf8',
    params: [{ key: 'rate', label: 'Rate', default: 0.3 }, { key: 'depth', label: 'Depth', default: 0.5 }, { key: 'mix', label: 'Mix', default: 0.5 }] },
  { type: 'eq', name: 'EQ', category: 'EQ', color: '#34d399',
    params: [{ key: 'low', label: 'Low', default: 0.5 }, { key: 'mid', label: 'Mid', default: 0.5 }, { key: 'high', label: 'High', default: 0.5 }] },
  { type: 'wah', name: 'Wah', category: 'Filter', color: '#fb923c',
    params: [
      { key: 'sensitivity', label: 'Sensitivity', default: 0.5 },
      { key: 'attack', label: 'Attack', default: 0.3 },
      { key: 'decay', label: 'Decay', default: 0.5 },
      { key: 'filterType', label: 'Filter', default: 1 },
      { key: 'frequency', label: 'Frequency', default: 0.5 },
      { key: 'level', label: 'Level', default: 0.7 },
      { key: 'freqEnvAmt', label: 'Freq Env', default: 0.5 },
      { key: 'resonance', label: 'Resonance', default: 0.4 },
      { key: 'resEnvAmt', label: 'Res Env', default: 0.2 },
      { key: 'mix', label: 'Mix', default: 0.7 },
    ] },
];

// ── SVG Effect Icons ──────────────────────────────────────────────────────

function PedalIcon({ type, size = 24, color, namModelId }: { type: PedalBlockType; size?: number; color: string; namModelId?: string }) {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'overdrive':
      return <svg {...props}><polyline points="2,16 6,16 9,8 12,18 15,6 18,16 22,16" /></svg>;
    case 'nam-amp': {
      const crystal = namModelId ? CRYSTAL_PATHS[namModelId] : undefined;
      if (crystal) {
        return (
          <svg width={s} height={s} viewBox={crystal.viewBox}>
            <path fill={color} d={crystal.d} />
          </svg>
        );
      }
      return <svg {...props}><polygon points="8,3 16,3 20,9 12,22 4,9" /><polyline points="4,9 20,9" /><polyline points="8,3 12,9 16,3" /><line x1="12" y1="9" x2="12" y2="22" /></svg>;
    }
    case 'compressor':
      return <svg {...props}><polyline points="4,18 10,12 14,14 20,6" /><polyline points="16,6 20,6 20,10" /></svg>;
    case 'chorus':
      return <svg {...props}><path d="M2,12 Q6,6 10,12 Q14,18 18,12 Q20,9 22,12" /><path d="M2,14 Q6,8 10,14 Q14,20 18,14 Q20,11 22,14" opacity="0.5" /></svg>;
    case 'phaser':
      return <svg {...props}><path d="M2,12 C5,4 8,20 12,12 C16,4 19,20 22,12" /></svg>;
    case 'flanger':
      return <svg {...props}><line x1="5" y1="6" x2="5" y2="18" /><line x1="9" y1="8" x2="9" y2="16" /><line x1="13" y1="4" x2="13" y2="20" /><line x1="17" y1="9" x2="17" y2="15" /><line x1="21" y1="7" x2="21" y2="17" /></svg>;
    case 'eq':
      return <svg {...props}><line x1="7" y1="4" x2="7" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="17" y1="4" x2="17" y2="20" /><rect x="5" y="7" width="4" height="3" rx="1" fill={color} stroke="none" /><rect x="10" y="13" width="4" height="3" rx="1" fill={color} stroke="none" /><rect x="15" y="9" width="4" height="3" rx="1" fill={color} stroke="none" /></svg>;
    case 'wah':
      return <svg {...props}><path d="M4,18 L10,6 L20,6" /><path d="M4,18 L20,18 L20,6" /></svg>;
  }
}

function InputIcon({ size = 24, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  );
}


const GEM_COLORS: Record<string, string> = {
  // Guitar — Clean
  'nam-clean-twin':        '#f0f0f0', // Quartz — clear/white
  'nam-marshall-jcm-clean':'#f5a623', // Amber — warm amber
  'nam-magnatone-59':      '#48d1cc', // Aquamarine — sea blue-green
  'nam-roland-jc120':      '#a8c8e8', // Celestite — pale sky blue
  'nam-vox-ac30':          '#50c878', // Emerald — vivid green
  // Guitar — Crunch
  'nam-crunch-plexi':      '#f0a040', // Sunstone — golden orange
  'nam-vox-ac15':          '#e85d2f', // Fire Opal — fiery orange-red
  'nam-marshall-jcm800':   '#e0115f', // Ruby — deep red
  // Guitar — Hi Gain
  'nam-high-gain':         '#b8860b', // Tiger's Eye — golden brown
  'nam-mesa-mark-iv':      '#9966cc', // Amethyst — purple
  'nam-engl-savage':       '#3fb094', // Amazonite — teal green
  'nam-friedman-be':       '#4a4a52', // Obsidian — dark gray
  'nam-soldano-slo':       '#2850a8', // Sapphire — deep blue
  'nam-orange-rockerverb': '#f4a0b0', // Rose Quartz — soft pink
  // Bass — Clean
  'nam-ampeg-svt':         '#b9f2ff', // Diamond — brilliant pale blue-white
  'nam-gk-800rb':          '#2d68c4', // Azurite — deep azure blue
  'nam-mesa-subway':       '#c4c4d0', // Moonstone — pale silvery
  // Bass — Crunch
  'nam-ampeg-v4':          '#2650a0', // Lapis Lazuli — royal blue
  'nam-markbass-lm3':      '#cda434', // Pyrite — brassy gold
  'nam-fender-bassman':    '#9b2335', // Garnet — dark red
  'nam-aguilar-th500':     '#daa520', // Goldstone — warm gold
  // Bass — Hi Gain
  'nam-darkglass-b7k':     '#882222', // Bloodstone — dark red-brown
  'nam-svt-cranked':       '#0bda51', // Malachite — bright green
};

const AMP_CATEGORY_LABELS: Record<string, string> = {
  clean: 'Clean',
  crunch: 'Crunch',
  hi_gain: 'Hi Gain',
};

function getPedalDef(type: PedalBlockType): PedalDef {
  return PEDAL_CATALOG.find((d) => d.type === type) ?? PEDAL_CATALOG[0];
}

function createBlock(type: PedalBlockType): PedalBlock {
  const def = getPedalDef(type);
  const params: Record<string, number> = {};
  for (const p of def.params) params[p.key] = p.default;
  return { id: `${type}-${Date.now()}`, type, enabled: true, params, namModelId: type === 'nam-amp' ? null : undefined };
}

const DEFAULT_CHAIN: PedalBlock[] = [
  { id: 'amp-1', type: 'nam-amp', enabled: true, params: { inputLevel: 0.5, bass: 0.5, mid: 0.5, treble: 0.5, presence: 0.5, outputLevel: 0.5, volume: 0.7 }, namModelId: null },
];

// ── Helper: get adapter if ready ────────────────────────────────────────

function getAdapter(trackId: string): GuitarFxAdapter | null {
  const state = getTrackAudioState(trackId);
  if (state?.instrument instanceof GuitarFxAdapter) return state.instrument;
  return null;
}

// ── GuitarBassView ──────────────────────────────────────────────────────

export function GuitarBassView({
  trackId,
  instrument,
}: {
  trackId: string;
  instrument: 'guitar-fx' | 'bass-fx';
}) {
  const instrumentFilter = instrument === 'bass-fx' ? 'bass' : 'guitar';
  const filteredModels = BUNDLED_MODELS.filter((m) => m.forInstrument === instrumentFilter);
  const monitoring = useStore((s) => s.tracks.find((t) => t.id === trackId)?.monitoring ?? false);
  const audioInputChannel = useStore((s) => s.tracks.find((t) => t.id === trackId)?.audioInputChannel ?? null);
  const globalInputDeviceId = useStore((s) => s.inputDeviceId);
  const bpm = useStore((s) => s.bpm);
  const updateTrack = useStore((s) => s.updateTrack);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const meterRafRef = useRef(0);
  const meterBarRef = useRef<HTMLDivElement>(null);

  // Signal chain state
  const [chain, setChain] = useState<PedalBlock[]>(DEFAULT_CHAIN);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('amp-1');
  const [insertSlotIndex, setInsertSlotIndex] = useState<number | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Re-render when instrument finishes async init
  const readyVersion = useSyncExternalStore(subscribeEngineReady, getEngineReadyVersion);

  // Enumerate audio input devices — auto-select first device globally if none configured
  useEffect(() => {
    const enumerate = () => {
      getAudioInputs().then((list) => {
        setDevices(list);
        if (!useStore.getState().inputDeviceId && list.length > 0) {
          useStore.getState().setInputDevice(list[0].id, 2);
        }
      });
    };
    enumerate();
    navigator.mediaDevices.addEventListener('devicechange', enumerate);
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate);
  }, []);

  // Connect adapter to per-track input device + channel (falls back to system default)
  useEffect(() => {
    const adapter = getAdapter(trackId);
    if (!adapter) return;
    if (!globalInputDeviceId || !audioInputChannel) {
      adapter.setDevice(null);
      return;
    }
    adapter.setDevice(globalInputDeviceId).then(() => {
      adapter.setChannelConfig(audioInputChannel);
    });
  }, [trackId, globalInputDeviceId, audioInputChannel]);

  // Sync monitoring to adapter
  useEffect(() => {
    const adapter = getAdapter(trackId);
    adapter?.setMonitoring(monitoring);
  }, [trackId, monitoring]);

  // Auto-load first bundled NAM model
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    const ampBlock = chain.find((b) => b.type === 'nam-amp');
    if (autoLoadedRef.current || (ampBlock?.namModelId)) return;
    const adapter = getAdapter(trackId);
    if (!adapter) return;
    const entry = filteredModels[0];
    if (!entry?.url) return;
    autoLoadedRef.current = true;
    fetchBundledModel(entry.url)
      .then(async (model) => {
        await adapter.loadNamModel(model);
        setChain((prev) => prev.map((b) => b.type === 'nam-amp' && !b.namModelId ? { ...b, namModelId: entry.id } : b));
        adapter.setAmpSimMode('nam');
      })
      .catch((err) => {
        console.warn('[NAM] Auto-load failed:', err);
        autoLoadedRef.current = false;
      });
  }, [trackId, chain, readyVersion, instrumentFilter]);

  // Sync full pedal chain to audio engine
  useEffect(() => {
    const adapter = getAdapter(trackId);
    if (!adapter) return;

    adapter.syncChain(chain.map((b) => ({
      type: b.type,
      enabled: b.enabled,
      params: b.type === 'phaser' ? { ...b.params, bpm } : b.params,
      namModelId: b.namModelId,
    })));
  }, [chain, trackId, bpm]);

  // Input level metering loop — direct DOM updates, throttled to ~15fps
  useEffect(() => {
    let lastUpdate = 0;
    const tick = (now: number) => {
      if (now - lastUpdate >= 66) {
        const adapter = getAdapter(trackId);
        if (adapter && meterBarRef.current) {
          const rms = adapter.getInputLevel();
          const pct = Math.min(100, Math.round(rms * 400));
          meterBarRef.current.style.width = `${pct}%`;
          meterBarRef.current.style.backgroundColor = pct > 90 ? '#ef4444' : 'var(--color-accent)';
        }
        lastUpdate = now;
      }
      meterRafRef.current = requestAnimationFrame(tick);
    };
    meterRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(meterRafRef.current);
  }, [trackId]);

  // ── Chain manipulation callbacks ──────────────────────────────────────

  const updateBlockParam = useCallback((blockId: string, key: string, value: number) => {
    setChain((prev) => prev.map((b) => b.id === blockId ? { ...b, params: { ...b.params, [key]: value } } : b));
  }, []);

  const toggleBlock = useCallback((blockId: string) => {
    setChain((prev) => prev.map((b) => b.id === blockId ? { ...b, enabled: !b.enabled } : b));
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setChain((prev) => prev.filter((b) => b.id !== blockId));
    setSelectedBlockId((prev) => prev === blockId ? null : prev);
  }, []);

  const addBlock = useCallback((type: PedalBlockType) => {
    const block = createBlock(type);
    setChain((prev) => {
      if (insertSlotIndex !== null) {
        const copy = [...prev];
        copy.splice(insertSlotIndex, 0, block);
        return copy;
      }
      const ampIdx = prev.findIndex((b) => b.type === 'nam-amp');
      if (ampIdx >= 0) {
        const copy = [...prev];
        copy.splice(ampIdx, 0, block);
        return copy;
      }
      return [...prev, block];
    });
    setSelectedBlockId(block.id);
    setInsertSlotIndex(null);
  }, [insertSlotIndex]);

  const reorderBlock = useCallback((fromIdx: number, toIdx: number) => {
    setChain((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy;
    });
  }, []);

  const handleSelectNamModel = useCallback(async (entry: NamModelEntry, blockId: string) => {
    if (!entry.url) return;
    const model = await fetchBundledModel(entry.url);
    const adapter = getAdapter(trackId);
    if (!adapter) return;
    await adapter.loadNamModel(model);
    setChain((prev) => prev.map((b) => b.id === blockId ? { ...b, namModelId: entry.id } : b));
  }, [trackId]);

  // ── Input channel helpers ─────────────────────────────────────────────

  const channelOptions: { label: string; config: AudioInputChannel }[] = [
    { label: '1', config: { mode: 'mono', channel: 0 } },
    { label: '2', config: { mode: 'mono', channel: 1 } },
    { label: '1-2', config: { mode: 'stereo', left: 0, right: 1 } },
  ];

  const channelLabel = audioInputChannel
    ? audioInputChannel.mode === 'stereo' ? '1-2'
      : audioInputChannel.channel === 0 ? '1' : '2'
    : '1';

  const selectedDeviceLabel = devices.find((d) => d.id === globalInputDeviceId)?.label
    ?? (globalInputDeviceId ? globalInputDeviceId.slice(0, 8) : 'No Input Device');

  const handleSelectDevice = useCallback(async (deviceId: string) => {
    setShowDeviceMenu(false);
    try {
      const detected = await probeDeviceChannelCount(deviceId);
      useStore.getState().setInputDevice(deviceId, detected);
    } catch {
      useStore.getState().setInputDevice(deviceId, 2);
    }
    updateTrack(trackId, {
      audioInputChannel: audioInputChannel ?? { mode: 'mono', channel: 0 },
      recordArmed: true,
      monitoring: true,
    });
  }, [trackId, updateTrack, audioInputChannel]);

  const handleSelectChannel = useCallback((config: AudioInputChannel) => {
    setShowChannelMenu(false);
    updateTrack(trackId, { audioInputChannel: config });
  }, [trackId, updateTrack]);

  const configsMatch = (a: AudioInputChannel | null, b: AudioInputChannel | null): boolean => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (a.mode !== b.mode) return false;
    if (a.mode === 'mono' && b.mode === 'mono') return a.channel === b.channel;
    if (a.mode === 'stereo' && b.mode === 'stereo') return a.left === b.left && a.right === b.right;
    return false;
  };

  // ── Derived values ────────────────────────────────────────────────────

  const selectedBlock = chain.find((b) => b.id === selectedBlockId) ?? null;
  const selectedDef = selectedBlock ? getPedalDef(selectedBlock.type) : null;
  const selectedColor = selectedBlock?.type === 'nam-amp'
    ? (GEM_COLORS[selectedBlock.namModelId ?? ''] ?? selectedDef?.color ?? '#60a5fa')
    : (selectedDef?.color ?? '#60a5fa');

  return (
    <div className="flex h-full">
      {/* ── Input Section ──────────────────────────────────── */}
      <div className="w-[240px] shrink-0 p-4 flex flex-col gap-3 border-r" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
          Input
        </span>

        {/* Device dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowDeviceMenu((v) => !v)}
            className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span className="text-xs truncate" style={{ color: 'var(--color-text)' }}>
              {selectedDeviceLabel}
            </span>
            <ChevronDown size={14} className="shrink-0 ml-2" style={{ color: 'var(--color-text-dim)' }} />
          </div>
          {showDeviceMenu && (
            <div
              className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
              style={{
                top: '100%',
                marginTop: 2,
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {devices.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDevice(d.id)}
                  className="px-3 py-1.5 text-xs cursor-pointer hover:bg-white/10 truncate"
                  style={{ color: d.id === globalInputDeviceId ? 'var(--color-accent)' : 'var(--color-text)' }}
                >
                  {d.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel dropdown */}
        {globalInputDeviceId && (
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowChannelMenu((v) => !v)}
              className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--color-text)' }}>
                {channelLabel}
              </span>
              <ChevronDown size={14} style={{ color: 'var(--color-text-dim)' }} />
            </div>
            {showChannelMenu && (
              <div
                className="absolute left-0 right-0 rounded-lg overflow-hidden z-50"
                style={{
                  top: '100%',
                  marginTop: 2,
                  backgroundColor: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {channelOptions.map((opt) => (
                  <div
                    key={opt.label}
                    onClick={() => handleSelectChannel(opt.config)}
                    className="px-3 py-1.5 text-xs cursor-pointer hover:bg-white/10"
                    style={{
                      color: configsMatch(opt.config, audioInputChannel) ? 'var(--color-accent)' : 'var(--color-text)',
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input level */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-dim)' }}>
            Input Level
          </span>
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-3)' }}>
            <div
              ref={meterBarRef}
              className="h-full rounded-full"
              style={{ width: '0%', backgroundColor: 'var(--color-accent)' }}
            />
          </div>
        </div>

        {/* Tuner */}
        <TunerDisplay deviceId={globalInputDeviceId} />

      </div>

      {/* ── Amps Column ────────────────────────────────────── */}
      <div
        className="w-[150px] shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="px-3 py-2 shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
            Amps
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const ampBlock = chain.find((b) => b.type === 'nam-amp');
            const selectedModelId = ampBlock?.namModelId ?? null;
            const groups = new Map<string, typeof filteredModels>();
            for (const entry of filteredModels) {
              const list = groups.get(entry.toneType) ?? [];
              list.push(entry);
              groups.set(entry.toneType, list);
            }
            return Array.from(groups.entries()).map(([tone, entries], gi) => (
              <div key={tone}>
                {gi > 0 && <div className="mx-3" style={{ borderTop: '1px solid var(--color-border)' }} />}
                <div
                  className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {AMP_CATEGORY_LABELS[tone] ?? tone}
                </div>
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      const amp = chain.find((b) => b.type === 'nam-amp');
                      if (amp) {
                        handleSelectNamModel(entry, amp.id);
                        setSelectedBlockId(amp.id);
                      }
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-1.5 cursor-pointer hover:bg-white/10"
                    style={{ border: 'none', background: 'none' }}
                  >
                    <PedalIcon type="nam-amp" size={16} color={GEM_COLORS[entry.id] ?? '#60a5fa'} namModelId={entry.id} />
                    <span
                      className="text-[11px]"
                      style={{ color: entry.id === selectedModelId ? 'var(--color-accent)' : 'var(--color-text)' }}
                    >
                      {entry.name}
                    </span>
                  </button>
                ))}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ── Pedals Column ──────────────────────────────────── */}
      <div
        className="w-[130px] shrink-0 flex flex-col border-r"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="px-3 py-2 shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
            Pedals
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const categories = new Map<string, PedalDef[]>();
            for (const def of PEDAL_CATALOG) {
              if (def.type === 'nam-amp') continue;
              const list = categories.get(def.category) ?? [];
              list.push(def);
              categories.set(def.category, list);
            }
            return Array.from(categories.entries()).map(([category, defs], ci) => (
              <div key={category}>
                {ci > 0 && <div className="mx-3" style={{ borderTop: '1px solid var(--color-border)' }} />}
                <div
                  className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  {category}
                </div>
                {defs.map((def) => (
                  <button
                    key={def.type}
                    onClick={() => addBlock(def.type)}
                    className="flex items-center gap-2 w-full text-left px-3 py-1.5 cursor-pointer hover:bg-white/10"
                    style={{ border: 'none', background: 'none' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: def.color }}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--color-text)' }}>
                      {def.name}
                    </span>
                  </button>
                ))}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* ── Signal Chain ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chain row */}
        {(() => {
          const pedalBlocks = chain.filter((b) => b.type !== 'nam-amp');
          const ampBlock = chain.find((b) => b.type === 'nam-amp') ?? null;
          const ampDef = ampBlock ? getPedalDef(ampBlock.type) : null;
          const ampColor = GEM_COLORS[ampBlock?.namModelId ?? ''] ?? ampDef?.color ?? '#60a5fa';
          const ampSelected = ampBlock?.id === selectedBlockId;
          const ampChainIdx = chain.findIndex((b) => b.type === 'nam-amp');

          // Empty slot for inserting a pedal at a specific chain index
          const EmptySlot = ({ chainIdx }: { chainIdx: number }) => (
            <div
              onClick={() => setInsertSlotIndex((prev) => prev === chainIdx ? null : chainIdx)}
              onDragOver={(e) => { e.preventDefault(); setDragOverSlot(chainIdx); }}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSlot(null);
                if (!draggedBlockId) return;
                const fromIdx = chain.findIndex((b) => b.id === draggedBlockId);
                if (fromIdx < 0) return;
                const toIdx = chainIdx > fromIdx ? chainIdx - 1 : chainIdx;
                if (fromIdx !== toIdx) reorderBlock(fromIdx, toIdx);
                setDraggedBlockId(null);
              }}
              className="relative flex items-center justify-center shrink-0 cursor-pointer rounded-xl"
              style={{
                width: 40,
                height: 68,
                border: insertSlotIndex === chainIdx || dragOverSlot === chainIdx
                  ? '2px solid var(--color-accent)'
                  : '2px dashed rgba(255,255,255,0.15)',
                backgroundColor: dragOverSlot === chainIdx ? 'rgba(126,207,207,0.08)' : 'transparent',
                transition: 'border-color 150ms ease, background-color 150ms ease',
                zIndex: 1,
              }}
            >
              <span style={{ color: insertSlotIndex === chainIdx ? 'var(--color-accent)' : 'rgba(255,255,255,0.25)', fontSize: 18 }}>+</span>
            </div>
          );

          return (
            <div
              className="relative flex items-center border-b flex-1 min-h-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Continuous line from In to Out */}
              <div
                className="absolute"
                style={{
                  top: '50%',
                  left: 16,
                  right: 16,
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  zIndex: 0,
                }}
              />

              {/* In: Guitar icon in a block matching pedal style */}
              <div className="flex flex-col items-center shrink-0 pl-4 relative" style={{ zIndex: 1 }}>
                <div
                  className="flex flex-col items-center justify-center rounded-xl"
                  style={{
                    width: 68,
                    height: 68,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <InputIcon size={28} />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-dim)' }}>In</span>
              </div>

              {/* Scrollable pedals section — centered */}
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-5 overflow-x-auto" style={{ zIndex: 1 }}>
                {/* First empty slot */}
                <EmptySlot chainIdx={pedalBlocks.length === 0 ? (ampChainIdx >= 0 ? ampChainIdx : chain.length) : chain.indexOf(pedalBlocks[0])} />

                {pedalBlocks.map((block) => {
                  const def = getPedalDef(block.type);
                  const isSelected = block.id === selectedBlockId;
                  const isDragged = block.id === draggedBlockId;
                  const chainIdx = chain.indexOf(block);
                  return (
                    <React.Fragment key={block.id}>
                      <div
                        draggable
                        onDragStart={() => setDraggedBlockId(block.id)}
                        onDragEnd={() => { setDraggedBlockId(null); setDragOverSlot(null); }}
                        onClick={() => setSelectedBlockId(block.id)}
                        className="relative flex flex-col items-center justify-center shrink-0 cursor-grab rounded-xl"
                        style={{
                          width: 68,
                          height: 68,
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: `2px solid ${def.color}`,
                          opacity: isDragged ? 0.4 : block.enabled ? 1 : 0.35,
                          boxShadow: isSelected ? `0 0 10px ${def.color}40` : 'none',
                          transition: 'opacity 150ms ease, box-shadow 150ms ease',
                          zIndex: 1,
                        }}
                      >
                        <PedalIcon type={block.type} size={28} color={def.color} />
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleBlock(block.id); }}
                          className="absolute cursor-pointer rounded-full"
                          style={{
                            bottom: 5, left: '50%', transform: 'translateX(-50%)',
                            width: 7, height: 7,
                            backgroundColor: block.enabled ? '#22c55e' : 'rgba(255,255,255,0.12)',
                            boxShadow: block.enabled ? '0 0 4px #22c55e80' : 'none',
                          }}
                        />
                      </div>
                      {/* Empty slot after this pedal */}
                      <EmptySlot chainIdx={chainIdx + 1} />
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Sticky amp + out */}
              <div className="flex items-center gap-2 shrink-0 pr-4 py-5" style={{ zIndex: 1 }}>
                {/* Amp tile */}
                {ampBlock && ampDef && (
                  <div
                    onClick={() => setSelectedBlockId(ampBlock.id)}
                    className="relative flex flex-col items-center justify-center shrink-0 cursor-pointer rounded-xl"
                    style={{
                      width: 68,
                      height: 68,
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: `2px solid ${ampColor}`,
                      opacity: ampBlock.enabled ? 1 : 0.35,
                      boxShadow: ampSelected ? `0 0 10px ${ampColor}40` : 'none',
                      transition: 'opacity 150ms ease, box-shadow 150ms ease',
                      zIndex: 1,
                    }}
                  >
                    <PedalIcon type={ampBlock.type} size={28} color={ampColor} namModelId={ampBlock.namModelId ?? undefined} />
                    <div
                      onClick={(e) => { e.stopPropagation(); toggleBlock(ampBlock.id); }}
                      className="absolute cursor-pointer rounded-full"
                      style={{
                        bottom: 5, left: '50%', transform: 'translateX(-50%)',
                        width: 7, height: 7,
                        backgroundColor: ampBlock.enabled ? '#22c55e' : 'rgba(255,255,255,0.12)',
                        boxShadow: ampBlock.enabled ? '0 0 4px #22c55e80' : 'none',
                      }}
                    />
                  </div>
                )}
                {/* Out label */}
                <span className="text-[9px] font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--color-text-dim)' }}>Out</span>
              </div>
            </div>
          );
        })()}

        {/* Controls panel for selected block */}
        {selectedBlock && selectedDef && (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--color-surface)' }}>
            {/* Header */}
            <div
              className="flex items-center gap-2.5 px-4 py-1.5 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedColor }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>
                {selectedDef.category}
              </span>
              <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--color-text)' }}>
                {selectedBlock.type === 'nam-amp'
                  ? (BUNDLED_MODELS.find((m) => m.id === selectedBlock.namModelId)?.name ?? 'NAM Amp')
                  : selectedDef.name}
              </span>
              {selectedBlock.type !== 'nam-amp' && (
                <button
                  onClick={() => removeBlock(selectedBlock.id)}
                  className="p-1 cursor-pointer rounded-md"
                  style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Knobs */}
            <div className="flex items-center justify-evenly flex-wrap px-4 py-3 flex-1">
              {selectedBlock.type === 'phaser' ? (
                <>
                  {/* Hz / Rate toggle pill */}
                  <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>
                      Mode
                    </span>
                    <div
                      className="flex rounded-md overflow-hidden"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      {['Hz', 'Rate'].map((label, idx) => (
                        <button
                          key={label}
                          onClick={() => updateBlockParam(selectedBlock.id, 'rateMode', idx)}
                          className="px-3 py-1 text-[10px] font-semibold cursor-pointer"
                          style={{
                            background: (selectedBlock.params.rateMode ?? 0) === idx ? selectedColor : 'transparent',
                            color: (selectedBlock.params.rateMode ?? 0) === idx ? '#000' : 'var(--color-text-dim)',
                            border: 'none',
                            transition: 'background 150ms ease, color 150ms ease',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional: Hz knob or Rate selector */}
                  {(selectedBlock.params.rateMode ?? 0) === 0 ? (
                    <RotaryKnob
                      key="rate"
                      label="Hz"
                      value={selectedBlock.params.rate ?? 0.3}
                      min={0}
                      max={1}
                      onChange={(v) => updateBlockParam(selectedBlock.id, 'rate', v)}
                      size={52}
                      arcColor={selectedColor}
                      formatValue={(v) => (0.01 + v * 39.99).toFixed(2)}
                    />
                  ) : (
                    <RotaryKnob
                      key="rateIdx"
                      label="Rate"
                      value={(selectedBlock.params.rateIdx ?? 10) / 21}
                      min={0}
                      max={1}
                      onChange={(v) => updateBlockParam(selectedBlock.id, 'rateIdx', Math.round(v * 21))}
                      size={52}
                      arcColor={selectedColor}
                      formatValue={(v) => RATE_LABELS[Math.round(v * 21)] ?? '1/3'}
                    />
                  )}

                  {/* Depth + Mix knobs (always shown) */}
                  <RotaryKnob
                    key="depth"
                    label="Depth"
                    value={selectedBlock.params.depth ?? 0.5}
                    min={0}
                    max={1}
                    onChange={(v) => updateBlockParam(selectedBlock.id, 'depth', v)}
                    size={52}
                    arcColor={selectedColor}
                    formatValue={(v) => v.toFixed(2)}
                  />
                  <RotaryKnob
                    key="mix"
                    label="Mix"
                    value={selectedBlock.params.mix ?? 0.5}
                    min={0}
                    max={1}
                    onChange={(v) => updateBlockParam(selectedBlock.id, 'mix', v)}
                    size={52}
                    arcColor={selectedColor}
                    formatValue={(v) => v.toFixed(2)}
                  />
                </>
              ) : selectedBlock.type === 'wah' ? (
                <>
                  {/* LP / BP / HP toggle pill */}
                  <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 72 }}>
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>
                      Filter
                    </span>
                    <div
                      className="flex rounded-md overflow-hidden"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      {['LP', 'BP', 'HP'].map((label, idx) => (
                        <button
                          key={label}
                          onClick={() => updateBlockParam(selectedBlock.id, 'filterType', idx)}
                          className="px-2.5 py-1 text-[10px] font-semibold cursor-pointer"
                          style={{
                            background: Math.round(selectedBlock.params.filterType ?? 1) === idx ? selectedColor : 'transparent',
                            color: Math.round(selectedBlock.params.filterType ?? 1) === idx ? '#000' : 'var(--color-text-dim)',
                            border: 'none',
                            transition: 'background 150ms ease, color 150ms ease',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* All other wah knobs */}
                  {selectedDef.params.filter((p) => p.key !== 'filterType').map((p) => (
                    <RotaryKnob
                      key={p.key}
                      label={p.label}
                      value={selectedBlock.params[p.key] ?? p.default}
                      min={0}
                      max={1}
                      onChange={(v) => updateBlockParam(selectedBlock.id, p.key, v)}
                      size={52}
                      arcColor={selectedColor}
                      formatValue={(v) => v.toFixed(2)}
                    />
                  ))}
                </>
              ) : (
                selectedDef.params.map((p) => (
                  <RotaryKnob
                    key={p.key}
                    label={p.label}
                    value={selectedBlock.params[p.key] ?? p.default}
                    min={0}
                    max={1}
                    onChange={(v) => updateBlockParam(selectedBlock.id, p.key, v)}
                    size={52}
                    arcColor={selectedColor}
                    formatValue={(v) => v.toFixed(2)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedBlock && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
              {chain.length === 0 ? 'Add your first effect' : 'Select a block to edit'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

