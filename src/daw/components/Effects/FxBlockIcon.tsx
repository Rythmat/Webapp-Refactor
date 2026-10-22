import type { EffectSlotType } from '@/daw/audio/EffectChain';

// ── Effect icons (SVG, matching GuitarBassView's pedals) ───────────────────
//
// One per effect type: the dock's chain, the Mix view's racks and the Add
// effect picker draw them. Kept apart from EffectsPanel so the
// picker, which is part of the editor's first load, doesn't bring the
// dock's effect controls with it.

export function FxBlockIcon({
  type,
  size = 28,
  color,
}: {
  type: EffectSlotType;
  size?: number;
  color: string;
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
    case 'compressor':
      return (
        <svg {...props}>
          <polyline points="4,18 10,12 14,14 20,6" />
          <polyline points="16,6 20,6 20,10" />
        </svg>
      );
    case 'gate':
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <line x1="9" y1="4" x2="9" y2="20" />
          <line x1="15" y1="4" x2="15" y2="20" />
        </svg>
      );
    case 'eq':
      return (
        <svg {...props}>
          <line x1="7" y1="4" x2="7" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="17" y1="4" x2="17" y2="20" />
          <rect
            x="5"
            y="7"
            width="4"
            height="3"
            rx="1"
            fill={color}
            stroke="none"
          />
          <rect
            x="10"
            y="13"
            width="4"
            height="3"
            rx="1"
            fill={color}
            stroke="none"
          />
          <rect
            x="15"
            y="9"
            width="4"
            height="3"
            rx="1"
            fill={color}
            stroke="none"
          />
        </svg>
      );
    case 'reverb':
      return (
        <svg {...props}>
          <path d="M12,6 Q18,6 18,12 Q18,18 12,18" />
          <path d="M12,9 Q15,9 15,12 Q15,15 12,15" />
          <line x1="12" y1="10" x2="12" y2="14" />
        </svg>
      );
    case 'delay':
      return (
        <svg {...props}>
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="13" cy="12" r="1.8" opacity="0.6" />
          <circle cx="19" cy="12" r="1.2" opacity="0.3" />
        </svg>
      );
    case 'presence':
      return (
        <svg {...props}>
          <path d="M4,16 Q8,16 12,8 Q16,16 20,16" />
        </svg>
      );
    case 'de-esser':
      return (
        <svg {...props}>
          <path d="M2,12 C5,4 8,20 12,12 C16,4 19,20 22,12" />
        </svg>
      );
    case 'saturator':
      return (
        <svg {...props}>
          <polyline points="2,16 6,16 9,8 12,18 15,6 18,16 22,16" />
        </svg>
      );
    case 'multiband':
      return (
        <svg {...props}>
          {/* Three bands, each squeezed from top and bottom (up+down comp) */}
          <line x1="6" y1="7" x2="6" y2="17" />
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="18" y1="9" x2="18" y2="15" />
          <polyline points="3,4 6,7 9,4" />
          <polyline points="3,20 6,17 9,20" />
          <polyline points="15,4 18,9 21,4" />
          <polyline points="15,20 18,15 21,20" />
        </svg>
      );
    case 'ducker':
      return (
        <svg {...props}>
          {/* A pumping envelope: level dips on each trigger, then recovers */}
          <path d="M2,8 L5,8 L6,17 L9,9 L10,17 L13,9 L14,17 L17,9 L18,8 L22,8" />
        </svg>
      );
    // The guitar pedals (2026-10-22), drawn as GuitarBassView's pedals are.
    case 'overdrive':
      return (
        <svg {...props}>
          <polyline points="2,16 6,16 9,8 12,18 15,6 18,16 22,16" />
          <line x1="2" y1="20" x2="22" y2="20" opacity="0.5" />
        </svg>
      );
    case 'amp':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="13" r="3.5" />
          <line x1="6" y1="8" x2="9" y2="8" />
        </svg>
      );
    case 'chorus':
      return (
        <svg {...props}>
          <path d="M2,12 Q6,6 10,12 Q14,18 18,12 Q20,9 22,12" />
          <path d="M2,14 Q6,8 10,14 Q14,20 18,14 Q20,11 22,14" opacity="0.5" />
        </svg>
      );
    case 'phaser':
      return (
        <svg {...props}>
          <path d="M2,12 C5,4 8,20 12,12 C16,4 19,20 22,12" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      );
    case 'flanger':
      return (
        <svg {...props}>
          <line x1="5" y1="6" x2="5" y2="18" />
          <line x1="9" y1="8" x2="9" y2="16" />
          <line x1="13" y1="4" x2="13" y2="20" />
          <line x1="17" y1="9" x2="17" y2="15" />
          <line x1="21" y1="7" x2="21" y2="17" />
        </svg>
      );
    case 'wah':
      return (
        <svg {...props}>
          <path d="M4,18 L10,6 L20,6" />
          <path d="M4,18 L20,18 L20,6" />
        </svg>
      );
  }
}
