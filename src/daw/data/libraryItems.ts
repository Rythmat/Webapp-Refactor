import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { COLOR } from '@/daw/ui/tokens';

// ── Library Categories ──────────────────────────────────────────────────

export type LibraryCategory = 'Audio Effects';

// ── Drag Payload ────────────────────────────────────────────────────────

export type DragPayload =
  /** An effect in an FX list (what a click adds; never dragged). */
  | { kind: 'audio-effect'; effectType: EffectSlotType }
  /** A Library row (milestone 2.14): its item id (shell/inspector/browser). */
  | { kind: 'library-item'; itemId: string };

/** The data type a drag from the Library carries. */
export const DRAG_MIME = 'application/x-prism-library';

// ── Library Item ────────────────────────────────────────────────────────

export interface LibraryItem {
  id: string;
  label: string;
  category: LibraryCategory;
  icon: string;
  color: string;
  dragPayload: DragPayload;
}

// ── FX-specific derived lookups ───────────────────────────────────────────
// Used by EffectsPanel and the Effects library for quick lookups by EffectSlotType.

/** FX catalog: the audio effects a rack can add (the Effects library, EffectsPanel). */
export const FX_CATALOG: LibraryItem[] = [
  // Audio Effects
  {
    id: 'fx-compressor',
    label: 'Compressor',
    category: 'Audio Effects',
    icon: 'Gauge',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'compressor' },
  },
  {
    id: 'fx-gate',
    label: 'Gate',
    category: 'Audio Effects',
    icon: 'ShieldCheck',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'gate' },
  },
  {
    id: 'fx-eq',
    label: 'EQ',
    category: 'Audio Effects',
    icon: 'SlidersHorizontal',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'eq' },
  },
  {
    id: 'fx-reverb',
    label: 'Reverb',
    category: 'Audio Effects',
    icon: 'Waves',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'reverb' },
  },
  {
    id: 'fx-delay',
    label: 'Delay',
    category: 'Audio Effects',
    icon: 'Timer',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'delay' },
  },
  {
    id: 'fx-presence',
    label: 'Presence',
    category: 'Audio Effects',
    icon: 'Sparkles',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'presence' },
  },
  {
    id: 'fx-de-esser',
    label: 'De-Esser',
    category: 'Audio Effects',
    icon: 'AudioLines',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'de-esser' },
  },
  {
    id: 'fx-saturator',
    label: 'Saturator',
    category: 'Audio Effects',
    icon: 'Flame',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'saturator' },
  },
  {
    id: 'fx-multiband',
    label: 'OTT',
    category: 'Audio Effects',
    icon: 'BarChart3',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'multiband' },
  },
  {
    id: 'fx-ducker',
    label: 'Sidechain',
    category: 'Audio Effects',
    icon: 'Activity',
    color: COLOR.accent.value,
    dragPayload: { kind: 'audio-effect', effectType: 'ducker' },
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
