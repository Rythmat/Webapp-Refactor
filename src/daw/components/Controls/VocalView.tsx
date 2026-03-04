import React, { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { ChevronDown, X, Mic, Maximize2, Lock, Unlock } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { RATE_LABELS } from '@/daw/audio/pedals/PhaserPedal';
import { useStore } from '@/daw/store';
import type { AudioInputChannel } from '@/daw/store/tracksSlice';
import { TunerDisplay } from './TunerDisplay';
import { RotaryKnob } from './RotaryKnob';
import { PitchMeter } from './PitchMeter';
import { usePitchInfo } from '@/daw/hooks/usePitchInfo';
import { getTrackAudioState, subscribeEngineReady, getEngineReadyVersion } from '@/daw/hooks/usePlaybackEngine';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import { SCALE_TYPES, NOTE_NAMES } from '@/daw/audio/pitch-correction/PitchCorrectionNode';
import { KEY_COLORS, type ColorIndex } from '@prism/engine';
import { getAudioInputs, probeDeviceChannelCount, type AudioInputDevice } from '@/daw/midi/AudioInputEnumerator';

// ── Root note color helpers ──────────────────────────────────────────────

const ROOT_TO_KEY_INDEX: Record<number, ColorIndex> = {
  0: 1, 1: 8, 2: 3, 3: 10, 4: 5, 5: 12, 6: 7, 7: 2, 8: 9, 9: 4, 10: 11, 11: 6,
};

function rootNoteColor(root: number): string {
  const [r, g, b] = KEY_COLORS[ROOT_TO_KEY_INDEX[root] ?? 1];
  return `rgb(${r}, ${g}, ${b})`;
}

function rootNoteGradWhite(root: number): string {
  const [r, g, b] = KEY_COLORS[ROOT_TO_KEY_INDEX[root] ?? 1];
  return `linear-gradient(to bottom, rgb(${r}, ${g}, ${b}), rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}))`;
}

function rootNoteGradBlack(root: number): string {
  const [r, g, b] = KEY_COLORS[ROOT_TO_KEY_INDEX[root] ?? 1];
  return `linear-gradient(to bottom, rgb(${Math.round(r * 0.7)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.7)}), rgb(${Math.round(r * 0.5)}, ${Math.round(g * 0.5)}, ${Math.round(b * 0.5)}))`;
}

// ── Pedal Block Types & Catalog ─────────────────────────────────────────

type PedalBlockType =
  | 'overdrive'
  | 'chorus' | 'phaser' | 'flanger'
  | 'delay' | 'reverb'
  | 'compressor' | 'eq' | 'wah'
  | 'pitch-correction';

interface PedalBlock {
  id: string;
  type: PedalBlockType;
  enabled: boolean;
  params: Record<string, number>;
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
  { type: 'pitch-correction', name: 'Pitch Correction', category: 'Vocal', color: '#ffffff',
    params: [
      { key: 'rootNote', label: 'Root', default: -1 },
      { key: 'scaleType', label: 'Scale', default: 1 },
      { key: 'correction', label: 'Strength', default: 80 },
      { key: 'speed', label: 'Smooth', default: 50 },
      { key: 'humanize', label: 'Human', default: 0 },
      { key: 'shift', label: 'Shift', default: 0.5 },
      { key: 'fine', label: 'Fine', default: 0.5 },
      { key: 'formant', label: 'Formant', default: 0 },
      { key: 'formantFollow', label: 'F. Follow', default: 0 },
      { key: 'mix', label: 'Mix', default: 100 },
      { key: 'activeNotes', label: 'Notes', default: 4095 },
    ] },
  { type: 'overdrive', name: 'Overdrive', category: 'Drive', color: '#4ade80',
    params: [{ key: 'drive', label: 'Drive', default: 0.5 }, { key: 'tone', label: 'Tone', default: 0.5 }, { key: 'volume', label: 'Volume', default: 0.7 }] },
  { type: 'compressor', name: 'Compressor', category: 'Dynamics', color: '#f59e0b',
    params: [{ key: 'threshold', label: 'Threshold', default: 0.5 }, { key: 'ratio', label: 'Ratio', default: 0.3 }, { key: 'attack', label: 'Attack', default: 0.2 }, { key: 'release', label: 'Release', default: 0.5 }] },
  { type: 'chorus', name: 'Chorus', category: 'Modulation', color: '#a78bfa',
    params: [{ key: 'rate', label: 'Rate', default: 0.3 }, { key: 'depth', label: 'Depth', default: 0.5 }, { key: 'mix', label: 'Mix', default: 0.5 }] },
  { type: 'phaser', name: 'Phaser', category: 'Modulation', color: '#c084fc',
    params: [{ key: 'rateMode', label: 'Mode', default: 0 }, { key: 'rate', label: 'Hz', default: 0.3 }, { key: 'rateIdx', label: 'Rate', default: 10 }, { key: 'depth', label: 'Depth', default: 0.5 }, { key: 'mix', label: 'Mix', default: 0.5 }] },
  { type: 'flanger', name: 'Flanger', category: 'Modulation', color: '#818cf8',
    params: [{ key: 'rate', label: 'Rate', default: 0.3 }, { key: 'depth', label: 'Depth', default: 0.5 }, { key: 'mix', label: 'Mix', default: 0.5 }] },
  { type: 'delay', name: 'Delay', category: 'Time', color: '#22d3ee',
    params: [{ key: 'time', label: 'Time', default: 0.4 }, { key: 'feedback', label: 'Feedback', default: 0.3 }, { key: 'mix', label: 'Mix', default: 0.4 }] },
  { type: 'reverb', name: 'Reverb', category: 'Time', color: '#38bdf8',
    params: [{ key: 'size', label: 'Size', default: 0.5 }, { key: 'decay', label: 'Decay', default: 0.5 }, { key: 'mix', label: 'Mix', default: 0.3 }] },
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

function PedalIcon({ type, size = 24, color }: { type: PedalBlockType; size?: number; color: string }) {
  const s = size;
  const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'pitch-correction':
      return <svg {...props}><path d="M12,2 L12,22" /><path d="M8,6 L12,2 L16,6" /><circle cx="8" cy="16" r="3" /><line x1="11" y1="16" x2="11" y2="8" /></svg>;
    case 'overdrive':
      return <svg {...props}><polyline points="2,16 6,16 9,8 12,18 15,6 18,16 22,16" /></svg>;
    case 'compressor':
      return <svg {...props}><polyline points="4,18 10,12 14,14 20,6" /><polyline points="16,6 20,6 20,10" /></svg>;
    case 'chorus':
      return <svg {...props}><path d="M2,12 Q6,6 10,12 Q14,18 18,12 Q20,9 22,12" /><path d="M2,14 Q6,8 10,14 Q14,20 18,14 Q20,11 22,14" opacity="0.5" /></svg>;
    case 'phaser':
      return <svg {...props}><path d="M2,12 C5,4 8,20 12,12 C16,4 19,20 22,12" /></svg>;
    case 'flanger':
      return <svg {...props}><line x1="5" y1="6" x2="5" y2="18" /><line x1="9" y1="8" x2="9" y2="16" /><line x1="13" y1="4" x2="13" y2="20" /><line x1="17" y1="9" x2="17" y2="15" /><line x1="21" y1="7" x2="21" y2="17" /></svg>;
    case 'delay':
      return <svg {...props}><circle cx="6" cy="12" r="2.5" /><circle cx="13" cy="12" r="1.8" opacity="0.6" /><circle cx="19" cy="12" r="1.2" opacity="0.3" /></svg>;
    case 'reverb':
      return <svg {...props}><path d="M12,6 Q18,6 18,12 Q18,18 12,18" fill="none" /><path d="M12,9 Q15,9 15,12 Q15,15 12,15" fill="none" /><line x1="12" y1="10" x2="12" y2="14" /></svg>;
    case 'eq':
      return <svg {...props}><line x1="7" y1="4" x2="7" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="17" y1="4" x2="17" y2="20" /><rect x="5" y="7" width="4" height="3" rx="1" fill={color} stroke="none" /><rect x="10" y="13" width="4" height="3" rx="1" fill={color} stroke="none" /><rect x="15" y="9" width="4" height="3" rx="1" fill={color} stroke="none" /></svg>;
    case 'wah':
      return <svg {...props}><path d="M4,18 L10,6 L20,6" /><path d="M4,18 L20,18 L20,6" /></svg>;
  }
}

// ── Scale intervals for active notes computation ────────────────────────

const SCALE_INTERVALS: number[][] = [
  [0,1,2,3,4,5,6,7,8,9,10,11], // Chromatic
  [0,2,4,5,7,9,11],             // Major
  [0,2,3,5,7,8,10],             // Minor
  [0,2,4,7,9],                  // Pentatonic
  [0,3,5,7,10],                 // Minor Pent
  [0,3,5,6,7,10],               // Blues
  [0,2,3,5,7,9,10],             // Dorian
  [0,2,4,5,7,9,10],             // Mixolydian
  [0,2,3,5,7,8,11],             // Harmonic Minor
];

function scaleToNotesBitmask(rootNote: number, scaleType: number): number {
  const intervals = SCALE_INTERVALS[scaleType] ?? SCALE_INTERVALS[0];
  let mask = 0;
  for (const interval of intervals) {
    mask |= 1 << ((rootNote + interval) % 12);
  }
  return mask;
}

// Piano key layout: index into NOTE_NAMES, isBlack flag, x-position
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
const BLACK_KEYS = [1, 3, 6, 8, 10];        // C# D# F# G# A#
const _BLACK_KEY_OFFSETS: Record<number, number> = { 1: 0.8, 3: 1.8, 6: 3.8, 8: 4.8, 10: 5.8 };

const COF_ROOT_OPTIONS: { name: string; value: number }[] = [
  { name: '—', value: -1 },
  { name: 'C', value: 0 },
  { name: 'G', value: 7 },
  { name: 'D', value: 2 },
  { name: 'A', value: 9 },
  { name: 'E', value: 4 },
  { name: 'B', value: 11 },
  { name: 'F#', value: 6 },
  { name: 'Db', value: 1 },
  { name: 'Ab', value: 8 },
  { name: 'Eb', value: 3 },
  { name: 'Bb', value: 10 },
  { name: 'F', value: 5 },
];

// ── Helpers ──────────────────────────────────────────────────────────────

function getPedalDef(type: PedalBlockType): PedalDef {
  return PEDAL_CATALOG.find((d) => d.type === type) ?? PEDAL_CATALOG[0];
}

function createBlock(type: PedalBlockType): PedalBlock {
  const def = getPedalDef(type);
  const params: Record<string, number> = {};
  for (const p of def.params) params[p.key] = p.default;
  return { id: `${type}-${Date.now()}`, type, enabled: true, params };
}

const DEFAULT_VOCAL_CHAIN: PedalBlock[] = [];

function getAdapter(trackId: string): VocalFxAdapter | null {
  const state = getTrackAudioState(trackId);
  if (state?.instrument instanceof VocalFxAdapter) return state.instrument;
  return null;
}

// ── VocalView ────────────────────────────────────────────────────────────

export function VocalView({ trackId }: { trackId: string }) {
  const monitoring = useStore((s) => s.tracks.find((t) => t.id === trackId)?.monitoring ?? false);
  const audioInputChannel = useStore((s) => s.tracks.find((t) => t.id === trackId)?.audioInputChannel ?? null);
  const globalInputDeviceId = useStore((s) => s.inputDeviceId);
  const bpm = useStore((s) => s.bpm);
  const globalRootNote = useStore((s) => s.rootNote);
  const setGlobalRootNote = useStore((s) => s.setRootNote);
  const rootLocked = useStore((s) => s.rootLocked);
  const toggleRootLock = useStore((s) => s.toggleRootLock);
  const updateTrack = useStore((s) => s.updateTrack);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const meterRafRef = useRef(0);
  const meterBarRef = useRef<HTMLDivElement>(null);

  // Signal chain state
  const storedChain = useStore((s) => s.tracks.find((t) => t.id === trackId)?.vocalChain);
  const [chain, setChain] = useState<PedalBlock[]>(() =>
    storedChain && storedChain.length > 0
      ? storedChain.map((b) => ({
          ...b,
          type: b.type as PedalBlockType,
          id: `${b.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }))
      : DEFAULT_VOCAL_CHAIN,
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [insertSlotIndex, setInsertSlotIndex] = useState<number | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Pitch correction expanded popup
  const [pitchExpanded, setPitchExpanded] = useState(false);

  // Pitch info for PitchMeter
  const pitchInfo = usePitchInfo(trackId);

  // Re-render when instrument finishes async init
  useSyncExternalStore(subscribeEngineReady, getEngineReadyVersion);

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

  // Sync pedal chain to audio engine (fast path avoids rewiring on param-only changes)
  useEffect(() => {
    const adapter = getAdapter(trackId);
    if (!adapter) return;

    const blocks = chain.map((b) => ({
      type: b.type,
      enabled: b.enabled,
      params: b.type === 'phaser' ? { ...b.params, bpm } : b.params,
    }));

    // Fast path: update params only if chain structure hasn't changed
    if (!adapter.updateChainParams(blocks)) {
      // Structure changed — full sync with rewire
      adapter.syncChain(blocks);
    }
  }, [chain, trackId, bpm]);

  // Persist chain to store so it survives VocalView unmount/remount
  useEffect(() => {
    useStore.getState().setVocalChain(trackId, chain.map((b) => ({
      type: b.type,
      enabled: b.enabled,
      params: b.params,
    })));
  }, [chain, trackId]);

  // Sync global rootNote → pitch correction block's rootNote param
  // pcBlockId in deps ensures sync fires when a PC block is added after the root is already set
  const pcBlockId = chain.find((b) => b.type === 'pitch-correction')?.id ?? null;
  useEffect(() => {
    if (globalRootNote === null || !pcBlockId) return;
    const pcBlock = chain.find((b) => b.id === pcBlockId);
    if (!pcBlock) return;
    if ((pcBlock.params.rootNote ?? 0) === globalRootNote) return;
    updateBlockParam(pcBlockId, 'rootNote', globalRootNote);
    updateBlockParam(pcBlockId, 'activeNotes', scaleToNotesBitmask(globalRootNote, pcBlock.params.scaleType ?? 0));
  }, [globalRootNote, pcBlockId]);

  // Input level metering loop
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
  const selectedColor = selectedDef?.color ?? '#ec4899';

  // Active notes bitmask derived from rootNote + scaleType for pitch correction
  const pitchBlock = chain.find((b) => b.type === 'pitch-correction');
  const pitchActiveNotes = pitchBlock
    ? (pitchBlock.params.activeNotes ?? scaleToNotesBitmask(pitchBlock.params.rootNote ?? 0, pitchBlock.params.scaleType ?? 0))
    : 4095;

  // Root-derived accent color for pitch correction controls
  const pitchRootNote = selectedBlock?.type === 'pitch-correction' ? (selectedBlock.params.rootNote ?? -1) : -1;
  const pitchAccentColor = selectedBlock?.type === 'pitch-correction'
    ? (pitchRootNote === -1 ? '#ffffff' : rootNoteColor(pitchRootNote))
    : selectedColor;
  const pitchWhiteGrad = pitchRootNote === -1
    ? 'linear-gradient(to bottom, #e8e8e8, #fff)'
    : rootNoteGradWhite(pitchRootNote);
  const pitchBlackGrad = pitchRootNote === -1
    ? 'linear-gradient(to bottom, #333, #1a1a1a)'
    : rootNoteGradBlack(pitchRootNote);

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

              {/* In: Mic icon + label */}
              <div className="flex flex-col items-center gap-0.5 shrink-0 pl-4 relative" style={{ zIndex: 1 }}>
                <Mic size={22} strokeWidth={1.5} style={{ color: 'var(--color-text-dim)' }} />
                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)' }}>In</span>
              </div>

              {/* Scrollable pedals section — centered */}
              <div className="flex-1 flex items-center justify-center gap-2 px-3 py-5 overflow-x-auto" style={{ zIndex: 1 }}>
                {/* First empty slot */}
                <EmptySlot chainIdx={0} />

                {chain.map((block) => {
                  const def = getPedalDef(block.type);
                  const blockColor = block.type === 'pitch-correction'
                    ? ((block.params.rootNote ?? -1) === -1 ? '#ffffff' : rootNoteColor(block.params.rootNote ?? 0))
                    : def.color;
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
                          border: `2px solid ${blockColor}`,
                          opacity: isDragged ? 0.4 : block.enabled ? 1 : 0.35,
                          boxShadow: isSelected ? `0 0 10px ${blockColor}40` : 'none',
                          transition: 'opacity 150ms ease, box-shadow 150ms ease',
                          zIndex: 1,
                        }}
                      >
                        <PedalIcon type={block.type} size={28} color={blockColor} />
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

              {/* Out label */}
              <div className="flex items-center shrink-0 pr-4 py-5" style={{ zIndex: 1 }}>
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
                {selectedDef.name}
              </span>
              <button
                onClick={() => removeBlock(selectedBlock.id)}
                className="p-1 cursor-pointer rounded-md"
                style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Knobs / Controls */}
            <div className="flex items-center justify-evenly flex-wrap px-4 py-3 flex-1">
              {selectedBlock.type === 'pitch-correction' ? (
                /* ── Pitch Correction — Simple View + Expand ──── */
                <div className="flex items-center gap-4 w-full">
                  {/* Root dropdown + lock */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Root</span>
                      {(selectedBlock.params.rootNote ?? -1) >= 0 && (
                        <button
                          onClick={toggleRootLock}
                          className="flex items-center justify-center cursor-pointer"
                          style={{
                            color: rootLocked ? 'var(--color-accent)' : 'var(--color-text-dim)',
                            border: 'none',
                            background: 'none',
                            padding: 0,
                          }}
                          title={rootLocked ? 'Unlock root note' : 'Lock root note'}
                        >
                          {rootLocked ? <Lock size={9} /> : <Unlock size={9} />}
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedBlock.params.rootNote ?? -1}
                      disabled={rootLocked}
                      onChange={(e) => {
                        const root = Number(e.target.value);
                        updateBlockParam(selectedBlock.id, 'rootNote', root);
                        if (root >= 0) {
                          updateBlockParam(selectedBlock.id, 'activeNotes', scaleToNotesBitmask(root, selectedBlock.params.scaleType ?? 0));
                          setGlobalRootNote(root);
                        } else {
                          updateBlockParam(selectedBlock.id, 'scaleType', 0);
                          updateBlockParam(selectedBlock.id, 'activeNotes', 4095);
                        }
                      }}
                      className="text-[10px] rounded px-2 py-1"
                      style={{
                        backgroundColor: 'var(--color-surface-3)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        cursor: rootLocked ? 'not-allowed' : 'pointer',
                        opacity: rootLocked ? 0.5 : 1,
                      }}
                    >
                      {COF_ROOT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Scale dropdown */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Scale</span>
                    <select
                      value={selectedBlock.params.scaleType ?? 0}
                      onChange={(e) => {
                        const scaleIdx = Number(e.target.value);
                        updateBlockParam(selectedBlock.id, 'scaleType', scaleIdx);
                        const newMask = scaleToNotesBitmask(selectedBlock.params.rootNote ?? 0, scaleIdx);
                        updateBlockParam(selectedBlock.id, 'activeNotes', newMask);
                      }}
                      className="text-[10px] rounded px-2 py-1 cursor-pointer"
                      style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      {SCALE_TYPES.map((label, i) => (
                        <option key={label} value={i}>{label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Strength knob */}
                  <RotaryKnob
                    label="STRENGTH"
                    value={(selectedBlock.params.correction ?? 80) / 100}
                    min={0}
                    max={1}
                    size={52}
                    arcColor={pitchAccentColor}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => updateBlockParam(selectedBlock.id, 'correction', Math.round(v * 100))}
                  />
                  {/* Smooth knob */}
                  <RotaryKnob
                    label="SMOOTH"
                    value={(selectedBlock.params.speed ?? 50) / 100}
                    min={0}
                    max={1}
                    size={52}
                    arcColor={pitchAccentColor}
                    formatValue={(v) => `${((1 - v) * 400).toFixed(0)} ms`}
                    onChange={(v) => updateBlockParam(selectedBlock.id, 'speed', Math.round(v * 100))}
                  />
                  {/* Humanize knob */}
                  <RotaryKnob
                    label="HUMAN"
                    value={(selectedBlock.params.humanize ?? 0) / 100}
                    min={0}
                    max={1}
                    size={52}
                    arcColor={pitchAccentColor}
                    formatValue={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => updateBlockParam(selectedBlock.id, 'humanize', Math.round(v * 100))}
                  />
                  {/* Expand button */}
                  <button
                    onClick={() => setPitchExpanded(true)}
                    className="ml-auto p-1.5 rounded-md cursor-pointer hover:bg-white/10"
                    style={{ color: 'var(--color-text-dim)', border: 'none', background: 'none' }}
                    aria-label="Expand pitch correction"
                  >
                    <Maximize2 size={16} />
                  </button>
                  {/* ── Expanded Dialog ──── */}
                  <Dialog.Root open={pitchExpanded} onOpenChange={setPitchExpanded}>
                    <Dialog.Portal>
                      <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                      <Dialog.Content
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl z-50 outline-none flex flex-col"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backdropFilter: 'blur(32px)',
                          WebkitBackdropFilter: 'blur(32px)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        {/* Dialog header */}
                        <div className="flex items-center gap-2.5 px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#ffffff' }} />
                          <Dialog.Title className="text-[13px] font-medium flex-1 m-0" style={{ color: 'var(--color-text)' }}>
                            Pitch Correction
                          </Dialog.Title>
                          <Dialog.Close asChild>
                            <button
                              className="p-1 cursor-pointer rounded-md hover:bg-white/10"
                              style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}
                            >
                              <X size={14} />
                            </button>
                          </Dialog.Close>
                        </div>
                        {/* Dialog body */}
                        <div className="flex flex-col gap-4 px-5 py-4">
                          {/* PitchMeter */}
                          <PitchMeter pitchInfo={pitchInfo} enabled={selectedBlock.enabled} />

                          {/* Strength + Smooth sliders */}
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-1 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Strength</span>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                                  {Math.round(selectedBlock.params.correction ?? 80)} %
                                </span>
                              </div>
                              <input
                                type="range" min={0} max={100}
                                value={selectedBlock.params.correction ?? 80}
                                onChange={(e) => updateBlockParam(selectedBlock.id, 'correction', Number(e.target.value))}
                                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, ${pitchAccentColor} ${(selectedBlock.params.correction ?? 80)}%, rgba(255,255,255,0.08) ${(selectedBlock.params.correction ?? 80)}%)`,
                                  accentColor: pitchAccentColor,
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Smooth</span>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                                  {((1 - (selectedBlock.params.speed ?? 50) / 100) * 400).toFixed(1)} ms
                                </span>
                              </div>
                              <input
                                type="range" min={0} max={100}
                                value={selectedBlock.params.speed ?? 50}
                                onChange={(e) => updateBlockParam(selectedBlock.id, 'speed', Number(e.target.value))}
                                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, ${pitchAccentColor} ${(selectedBlock.params.speed ?? 50)}%, rgba(255,255,255,0.08) ${(selectedBlock.params.speed ?? 50)}%)`,
                                  accentColor: pitchAccentColor,
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Humanize</span>
                                <span className="text-[10px] font-medium" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                                  {Math.round(selectedBlock.params.humanize ?? 0)} %
                                </span>
                              </div>
                              <input
                                type="range" min={0} max={100}
                                value={selectedBlock.params.humanize ?? 0}
                                onChange={(e) => updateBlockParam(selectedBlock.id, 'humanize', Number(e.target.value))}
                                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, ${pitchAccentColor} ${(selectedBlock.params.humanize ?? 0)}%, rgba(255,255,255,0.08) ${(selectedBlock.params.humanize ?? 0)}%)`,
                                  accentColor: pitchAccentColor,
                                }}
                              />
                            </div>
                          </div>

                          {/* Piano keyboard — Oracle Synth style */}
                          <div style={{ position: 'relative', display: 'flex', height: 100, userSelect: 'none' }}>
                            {/* White keys */}
                            {WHITE_KEYS.map((note) => {
                              const isActive = (pitchActiveNotes & (1 << note)) !== 0;
                              return (
                                <div
                                  key={note}
                                  onClick={() => updateBlockParam(selectedBlock.id, 'activeNotes', pitchActiveNotes ^ (1 << note))}
                                  style={{
                                    flex: 1,
                                    height: '100%',
                                    background: isActive
                                      ? pitchWhiteGrad
                                      : 'linear-gradient(to bottom, #e8e8e8, #fff)',
                                    border: '1px solid #444',
                                    borderRadius: '0 0 4px 4px',
                                    cursor: 'pointer',
                                    transition: 'background 0.05s',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    paddingBottom: 6,
                                    minWidth: 0,
                                  }}
                                >
                                  <span style={{ fontSize: 9, fontWeight: 600, color: isActive ? '#1a1a1a' : '#666', pointerEvents: 'none' }}>
                                    {NOTE_NAMES[note]}
                                  </span>
                                </div>
                              );
                            })}
                            {/* Black keys */}
                            {BLACK_KEYS.map((note) => {
                              const isActive = (pitchActiveNotes & (1 << note)) !== 0;
                              const whiteIdx = WHITE_KEYS.findIndex((w) => w > note) - 1;
                              const offset = ({ 1: 0.65, 3: 0.75, 6: 0.6, 8: 0.7, 10: 0.8 } as Record<number, number>)[note] ?? 0.7;
                              const whiteKeyWidth = 100 / 7;
                              const left = (whiteIdx + offset) * whiteKeyWidth;
                              return (
                                <div
                                  key={note}
                                  onClick={() => updateBlockParam(selectedBlock.id, 'activeNotes', pitchActiveNotes ^ (1 << note))}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: `${left}%`,
                                    width: `${whiteKeyWidth * 0.65}%`,
                                    height: '62%',
                                    background: isActive
                                      ? pitchBlackGrad
                                      : 'linear-gradient(to bottom, #333, #1a1a1a)',
                                    border: '1px solid #000',
                                    borderRadius: '0 0 3px 3px',
                                    cursor: 'pointer',
                                    transition: 'background 0.05s',
                                    zIndex: 2,
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    paddingBottom: 4,
                                  }}
                                >
                                  <span style={{ fontSize: 7, fontWeight: 600, color: isActive ? '#1a1a1a' : 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
                                    {NOTE_NAMES[note]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Root + Scale + Shift */}
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Root</span>
                                {(selectedBlock.params.rootNote ?? -1) >= 0 && (
                                  <button
                                    onClick={toggleRootLock}
                                    className="flex items-center justify-center cursor-pointer"
                                    style={{
                                      color: rootLocked ? 'var(--color-accent)' : 'var(--color-text-dim)',
                                      border: 'none',
                                      background: 'none',
                                      padding: 0,
                                    }}
                                    title={rootLocked ? 'Unlock root note' : 'Lock root note'}
                                  >
                                    {rootLocked ? <Lock size={9} /> : <Unlock size={9} />}
                                  </button>
                                )}
                              </div>
                              <select
                                value={selectedBlock.params.rootNote ?? -1}
                                disabled={rootLocked}
                                onChange={(e) => {
                                  const root = Number(e.target.value);
                                  updateBlockParam(selectedBlock.id, 'rootNote', root);
                                  if (root >= 0) {
                                    updateBlockParam(selectedBlock.id, 'activeNotes', scaleToNotesBitmask(root, selectedBlock.params.scaleType ?? 0));
                                    setGlobalRootNote(root);
                                  } else {
                                    updateBlockParam(selectedBlock.id, 'scaleType', 0);
                                    updateBlockParam(selectedBlock.id, 'activeNotes', 4095);
                                  }
                                }}
                                className="text-[10px] rounded px-2 py-1"
                                style={{
                                  backgroundColor: 'var(--color-surface-3)',
                                  color: 'var(--color-text)',
                                  border: '1px solid var(--color-border)',
                                  cursor: rootLocked ? 'not-allowed' : 'pointer',
                                  opacity: rootLocked ? 0.5 : 1,
                                }}
                              >
                                {COF_ROOT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Scale</span>
                              <select
                                value={selectedBlock.params.scaleType ?? 0}
                                onChange={(e) => {
                                  const scaleIdx = Number(e.target.value);
                                  updateBlockParam(selectedBlock.id, 'scaleType', scaleIdx);
                                  updateBlockParam(selectedBlock.id, 'activeNotes', scaleToNotesBitmask(selectedBlock.params.rootNote ?? 0, scaleIdx));
                                }}
                                className="text-[10px] rounded px-2 py-1 cursor-pointer"
                                style={{ backgroundColor: 'var(--color-surface-3)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                              >
                                {SCALE_TYPES.map((label, i) => (
                                  <option key={label} value={i}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}>Shift</span>
                              <span className="text-[10px] font-medium px-2 py-1" style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round((selectedBlock.params.shift ?? 0.5) * 48 - 24)} st
                              </span>
                            </div>
                          </div>

                          {/* Knobs */}
                          <div className="flex items-center justify-evenly gap-2">
                            <RotaryKnob label="SHIFT" value={selectedBlock.params.shift ?? 0.5} min={0} max={1} size={48} arcColor={pitchAccentColor} formatValue={(v) => `${Math.round(v * 48 - 24)} st`} onChange={(v) => updateBlockParam(selectedBlock.id, 'shift', v)} />
                            <RotaryKnob label="FINE" value={selectedBlock.params.fine ?? 0.5} min={0} max={1} size={48} arcColor={pitchAccentColor} formatValue={(v) => `${Math.round(v * 200 - 100)} ct`} onChange={(v) => updateBlockParam(selectedBlock.id, 'fine', v)} />
                            <RotaryKnob label="FORMANT" value={(selectedBlock.params.formant ?? 0) / 100} min={0} max={1} size={48} arcColor={pitchAccentColor} formatValue={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateBlockParam(selectedBlock.id, 'formant', Math.round(v * 100))} />
                            <RotaryKnob label="F. FOLLOW" value={(selectedBlock.params.formantFollow ?? 0) / 100} min={0} max={1} size={48} arcColor={pitchAccentColor} formatValue={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateBlockParam(selectedBlock.id, 'formantFollow', Math.round(v * 100))} />
                            <RotaryKnob label="MIX" value={(selectedBlock.params.mix ?? 100) / 100} min={0} max={1} size={48} arcColor={pitchAccentColor} formatValue={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateBlockParam(selectedBlock.id, 'mix', Math.round(v * 100))} />
                          </div>
                        </div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog.Root>
                </div>
              ) : selectedBlock.type === 'phaser' ? (
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
