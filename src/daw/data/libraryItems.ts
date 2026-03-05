import type { EffectSlotType } from '@/daw/audio/EffectChain';
import type { TrackType, InstrumentType } from '@/daw/store/tracksSlice';

// ── Library Categories ──────────────────────────────────────────────────

export type LibraryCategory = 'Audio Effects' | 'MIDI Effects' | 'Templates';

export const LIBRARY_CATEGORIES: LibraryCategory[] = ['Templates'];

// ── Drag Payload ────────────────────────────────────────────────────────

export type DragPayload =
  | { kind: 'audio-effect'; effectType: EffectSlotType }
  | { kind: 'instrument'; instrumentType: InstrumentType }
  | { kind: 'midi-effect'; effectId: string }
  | {
      kind: 'template';
      trackType: TrackType;
      instrument: InstrumentType;
      name: string;
    }
  | { kind: 'project-template'; templateId: string }
  | { kind: 'drum-sample'; url: string; name: string }
  | {
      kind: 'midi-loop';
      url: string;
      name: string;
      bpm?: number;
      key?: string;
      instrument?: InstrumentType;
    };

// ── Library Item ────────────────────────────────────────────────────────

export interface LibraryItem {
  id: string;
  label: string;
  category: LibraryCategory;
  icon: string;
  color: string;
  dragPayload: DragPayload;
  disabled?: boolean;
}

// ── Catalog ─────────────────────────────────────────────────────────────

export const LIBRARY_ITEMS: LibraryItem[] = [
  // Project Templates
  {
    id: 'project-rock',
    label: 'Rock',
    category: 'Templates',
    icon: 'Flame',
    color: '#f94144',
    dragPayload: { kind: 'project-template', templateId: 'project-rock' },
  },
  {
    id: 'project-rnb',
    label: 'R&B',
    category: 'Templates',
    icon: 'Music',
    color: '#8b5cf6',
    dragPayload: { kind: 'project-template', templateId: 'project-rnb' },
  },
  {
    id: 'project-pop',
    label: 'Pop',
    category: 'Templates',
    icon: 'Sparkles',
    color: '#f9c74f',
    dragPayload: { kind: 'project-template', templateId: 'project-pop' },
  },
  {
    id: 'project-indie',
    label: 'Indie',
    category: 'Templates',
    icon: 'AudioWaveform',
    color: '#43aa8b',
    dragPayload: { kind: 'project-template', templateId: 'project-indie' },
  },
];

export const DRAG_MIME = 'application/x-prism-library';

export function searchLibraryItems(query: string): LibraryItem[] {
  const lower = query.toLowerCase();
  return LIBRARY_ITEMS.filter((i) => i.label.toLowerCase().includes(lower));
}

// ── FX-specific derived lookups ───────────────────────────────────────────
// Used by EffectsPanel and FxBrowser for quick lookups by EffectSlotType.

/** FX catalog — used by FxBrowser and EffectsPanel */
export const FX_CATALOG: LibraryItem[] = [
  // Audio Effects
  {
    id: 'fx-compressor',
    label: 'Compressor',
    category: 'Audio Effects',
    icon: 'Gauge',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'compressor' },
  },
  {
    id: 'fx-gate',
    label: 'Gate',
    category: 'Audio Effects',
    icon: 'ShieldCheck',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'gate' },
  },
  {
    id: 'fx-eq',
    label: 'EQ',
    category: 'Audio Effects',
    icon: 'SlidersHorizontal',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'eq' },
  },
  {
    id: 'fx-reverb',
    label: 'Reverb',
    category: 'Audio Effects',
    icon: 'Waves',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'reverb' },
  },
  {
    id: 'fx-delay',
    label: 'Delay',
    category: 'Audio Effects',
    icon: 'Timer',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'delay' },
  },
  {
    id: 'fx-presence',
    label: 'Presence',
    category: 'Audio Effects',
    icon: 'Sparkles',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'presence' },
  },
  {
    id: 'fx-de-esser',
    label: 'De-Esser',
    category: 'Audio Effects',
    icon: 'AudioLines',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'de-esser' },
  },
  {
    id: 'fx-saturator',
    label: 'Saturator',
    category: 'Audio Effects',
    icon: 'Flame',
    color: '#7ecfcf',
    dragPayload: { kind: 'audio-effect', effectType: 'saturator' },
  },
  // MIDI Effects
  {
    id: 'midi-arp',
    label: 'Arpeggiator',
    category: 'MIDI Effects',
    icon: 'Zap',
    color: '#6b6b80',
    dragPayload: { kind: 'midi-effect', effectId: 'arpeggiator' },
    disabled: true,
  },
  {
    id: 'midi-chord',
    label: 'Chord',
    category: 'MIDI Effects',
    icon: 'Layers',
    color: '#6b6b80',
    dragPayload: { kind: 'midi-effect', effectId: 'chord' },
    disabled: true,
  },
  {
    id: 'midi-scale',
    label: 'Scale',
    category: 'MIDI Effects',
    icon: 'TrendingUp',
    color: '#6b6b80',
    dragPayload: { kind: 'midi-effect', effectId: 'scale' },
    disabled: true,
  },
];

/** Effect type → color */
export const FX_COLOR: Record<string, string> = {};
/** Effect type → display label */
export const FX_LABEL: Record<string, string> = {};
/** Effect type → category */
export const FX_CATEGORY: Record<string, string> = {};

for (const item of FX_CATALOG) {
  if (item.dragPayload.kind === 'audio-effect') {
    const key = item.dragPayload.effectType;
    FX_COLOR[key] = item.color;
    FX_LABEL[key] = item.label;
    FX_CATEGORY[key] = item.category;
  }
}
