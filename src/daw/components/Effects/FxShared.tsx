/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Maximize2, ChevronDown } from 'lucide-react';
import type { EqBandType } from '@/daw/audio/EffectChain';

// ── Constants ────────────────────────────────────────────────────────────

export const BAND_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export const SECTION_STYLE = {
  backgroundColor: 'var(--color-surface-2)',
  border: '1px solid rgba(255,255,255,0.04)',
} as const;

export const VIZ_SPRING = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 30,
};

// ── Section Header ──────────────────────────────────────────────────────

export function SectionHeader({
  title,
  enabled,
  onToggle,
  onRemove,
  onPopOut,
  expanded,
  onExpand,
  rightLabel,
  rightIcon,
}: {
  title: string;
  enabled: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  onPopOut?: () => void;
  expanded?: boolean;
  onExpand?: () => void;
  rightLabel?: string;
  rightIcon?: 'gear';
}) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <button
        onClick={onToggle}
        className="w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer"
        style={{
          backgroundColor: enabled
            ? 'var(--color-accent)'
            : 'var(--color-surface-3)',
          border: 'none',
        }}
      />
      <span
        className="text-[10px] font-semibold uppercase tracking-wider shrink-0"
        style={{ color: 'var(--color-text)' }}
      >
        {title}
      </span>
      <div
        className="flex-1"
        style={{ height: 1, backgroundColor: 'var(--color-border)' }}
      />
      {rightLabel && (
        <span
          className="text-[8px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {rightLabel}
        </span>
      )}
      {rightIcon === 'gear' && (
        <Settings
          size={10}
          strokeWidth={1.5}
          style={{ color: 'var(--color-text-dim)' }}
        />
      )}
      {onExpand && (
        <button
          onClick={onExpand}
          className="w-4 h-4 flex items-center justify-center rounded-sm cursor-pointer transition-transform"
          style={{
            color: 'var(--color-text-dim)',
            border: 'none',
            background: 'none',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          title={expanded ? 'Collapse bands' : 'Expand bands'}
        >
          <ChevronDown size={10} strokeWidth={2} />
        </button>
      )}
      {onPopOut && (
        <button
          onClick={onPopOut}
          className="w-4 h-4 flex items-center justify-center rounded-sm cursor-pointer"
          style={{
            color: 'var(--color-text-dim)',
            border: 'none',
            background: 'none',
          }}
          title="Open in full screen"
        >
          <Maximize2 size={10} strokeWidth={2} />
        </button>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="w-4 h-4 flex items-center justify-center rounded-sm cursor-pointer"
          style={{
            color: 'var(--color-text-dim)',
            border: 'none',
            background: 'none',
          }}
          title="Remove effect"
        >
          <X size={10} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

// ── Studio/Creative Toggle ──────────────────────────────────────────────

export function StudioCreativeToggle({
  mode,
  onChange,
}: {
  mode: 'studio' | 'creative';
  onChange: (m: 'studio' | 'creative') => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="text-[8px] font-semibold uppercase tracking-wider cursor-pointer"
        style={{
          color:
            mode === 'studio' ? 'var(--color-text)' : 'var(--color-text-dim)',
        }}
        onClick={() => onChange('studio')}
      >
        Studio
      </span>
      <button
        onClick={() => onChange(mode === 'studio' ? 'creative' : 'studio')}
        className="w-7 h-3.5 rounded-full flex items-center px-0.5 cursor-pointer"
        style={{
          backgroundColor:
            mode === 'creative'
              ? 'var(--color-accent)'
              : 'var(--color-surface-3)',
          border: 'none',
        }}
      >
        <motion.div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: 'var(--color-text)' }}
          animate={{ x: mode === 'creative' ? 12 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
      <span
        className="text-[8px] font-semibold uppercase tracking-wider cursor-pointer"
        style={{
          color:
            mode === 'creative' ? 'var(--color-text)' : 'var(--color-text-dim)',
        }}
        onClick={() => onChange('creative')}
      >
        Creative
      </span>
    </div>
  );
}

// ── Auto Checkbox ───────────────────────────────────────────────────────

export function AutoCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1 mt-1 cursor-pointer"
      style={{ border: 'none', background: 'none', padding: 0 }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor: checked
            ? 'var(--color-accent)'
            : 'var(--color-surface-3)',
        }}
      />
      <span
        className="text-[7px] font-semibold uppercase"
        style={{ color: 'var(--color-text-dim)' }}
      >
        Auto
      </span>
    </button>
  );
}

// ── EQ Band Tab ─────────────────────────────────────────────────────────

export function BandTab({
  index,
  color,
  active,
  onClick,
}: {
  index: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-semibold cursor-pointer"
      style={{
        backgroundColor: active ? color : 'transparent',
        color: active ? '#fff' : 'var(--color-text-dim)',
        border: active ? 'none' : '1px solid var(--color-border)',
        opacity: active ? 1 : 0.6,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: active ? '#fff' : 'var(--color-surface-3)' }}
      />
      Band {index}
    </button>
  );
}

// ── EQ Curve Type Selector ──────────────────────────────────────────────

const EQ_TYPES: EqBandType[] = [
  'lowcut',
  'lowshelf',
  'peaking',
  'highshelf',
  'highcut',
];

function CurveTypeIcon({ type, color }: { type: EqBandType; color: string }) {
  const w = 16;
  const h = 10;
  const paths: Record<EqBandType, string> = {
    lowcut: `M1 ${h - 1} Q4 ${h - 1} 7 4 Q10 1 ${w - 1} 1`,
    lowshelf: `M1 ${h - 2} Q5 ${h - 2} 7 ${h / 2} Q9 2 ${w - 1} 2`,
    peaking: `M1 ${h / 2} Q5 1 8 1 Q11 1 ${w - 1} ${h / 2}`,
    highshelf: `M1 2 Q5 2 7 ${h / 2} Q9 ${h - 2} ${w - 1} ${h - 2}`,
    highcut: `M1 1 Q6 1 9 4 Q12 ${h - 1} ${w - 1} ${h - 1}`,
  };
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path
        d={paths[type]}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CurveTypeSelector({
  type,
  onChange,
  color,
}: {
  type: EqBandType;
  onChange: (t: EqBandType) => void;
  color?: string;
}) {
  const cycle = () => {
    const idx = EQ_TYPES.indexOf(type);
    onChange(EQ_TYPES[(idx + 1) % EQ_TYPES.length]);
  };

  return (
    <button
      onClick={cycle}
      className="p-1 rounded cursor-pointer flex items-center justify-center"
      style={{
        backgroundColor: color ? `${color}18` : 'var(--color-surface-3)',
        border: 'none',
      }}
    >
      <CurveTypeIcon type={type} color={color || 'rgba(255,255,255,0.3)'} />
    </button>
  );
}

// ── Inline Visualizer ───────────────────────────────────────────────────

export function InlineViz({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={VIZ_SPRING}
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="p-2.5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
