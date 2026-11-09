import type { KeyboardEvent } from 'react';
import type { StudentLanguage } from '../types';
import {
  INTENSITIES,
  PRIMARY_IDS,
  primaryLabel,
  shadeOf,
  type Intensity,
  type PrimaryId,
  type WheelPick,
} from './feelings';

// Plutchik's wheel, drawn in code: eight petals clockwise from Joy at the top,
// each three rings deep — intense at the centre, mild at the rim — after the
// owner's reference. The feeling's own name sits on its middle ring; every
// ring is a target, so a tap picks a feeling and its strength at once.

const R_HOLE = 20;
/** Ring edges by intensity: 3 innermost, 1 at the rim. */
const RING: Record<Intensity, [number, number]> = {
  3: [R_HOLE, 46],
  2: [46, 75],
  1: [75, 104],
};
const SPAN = 360 / PRIMARY_IDS.length;
const GAP = 1.4;

const polar = (r: number, deg: number): [number, number] => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(rad), r * Math.sin(rad)];
};

const sector = (r0: number, r1: number, a0: number, a1: number): string => {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  return [
    `M${x0.toFixed(2)} ${y0.toFixed(2)}`,
    `A${r1} ${r1} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A${r0} ${r0} 0 0 0 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    'Z',
  ].join(' ');
};

const pickText = (en: string, es: string | undefined, lang: StudentLanguage) =>
  lang === 'es' && es ? es : en;

export interface FeelingsWheelProps {
  language?: StudentLanguage;
  /** What is picked (input) — highlighted. */
  picks?: readonly WheelPick[];
  /** Makes every segment a button. Absent: a picture (projector, preview). */
  onPick?: (pick: WheelPick) => void;
  /**
   * The class view: students per feeling. Petals fade with fewer, and each
   * shows its count.
   */
  counts?: Partial<Record<PrimaryId, number>>;
  disabled?: boolean;
  className?: string;
}

export const FeelingsWheel = ({
  language = 'en',
  picks = [],
  onPick,
  counts,
  disabled,
  className,
}: FeelingsWheelProps) => {
  const max = counts
    ? Math.max(1, ...PRIMARY_IDS.map((p) => counts[p] ?? 0))
    : 0;
  const isPicked = (p: PrimaryId, i: Intensity) =>
    picks.some((x) => x.primary === p && x.intensity === i);

  const onKey = (e: KeyboardEvent, pick: WheelPick) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick?.(pick);
    }
  };

  return (
    <svg
      viewBox="-108 -108 216 216"
      className={className}
      role={onPick ? 'group' : 'img'}
      aria-label={onPick ? 'Feelings wheel' : 'The feelings wheel'}
    >
      {PRIMARY_IDS.map((primary, i) => {
        const a0 = i * SPAN - SPAN / 2 + GAP / 2;
        const a1 = i * SPAN + SPAN / 2 - GAP / 2;
        const count = counts?.[primary] ?? 0;
        const fade = counts ? 0.22 + 0.78 * (count / max) : 1;
        const name = primaryLabel(primary);
        const [lx, ly] = polar((RING[2][0] + RING[2][1]) / 2, i * SPAN);
        return (
          <g key={primary} opacity={fade}>
            {INTENSITIES.map((intensity) => {
              const [r0, r1] = RING[intensity];
              const shade = shadeOf(primary, intensity);
              const picked = isPicked(primary, intensity);
              const label = pickText(shade.label.en, shade.label.es, language);
              const interactive = onPick && !disabled;
              return (
                <path
                  key={intensity}
                  d={sector(r0 + 0.7, r1 - 0.7, a0, a1)}
                  fill={shade.color}
                  stroke={picked ? '#FFFFFF' : 'none'}
                  strokeWidth={picked ? 3 : 0}
                  className={
                    interactive
                      ? 'cursor-pointer outline-none transition-[filter] hover:brightness-110 focus-visible:brightness-125'
                      : undefined
                  }
                  {...(interactive
                    ? {
                        role: 'button',
                        tabIndex: 0,
                        'aria-pressed': picked,
                        'aria-label': label,
                        onClick: () => onPick({ primary, intensity }),
                        onKeyDown: (e: KeyboardEvent) =>
                          onKey(e, { primary, intensity }),
                      }
                    : {})}
                />
              );
            })}
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fontWeight={600}
              fill="#1C1C1F"
              pointerEvents="none"
            >
              {pickText(name.en, name.es, language)}
            </text>
            {counts && count > 0 && (
              <text
                x={polar(RING[3][0] + 13, i * SPAN)[0]}
                y={polar(RING[3][0] + 13, i * SPAN)[1]}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
                fill="#1C1C1F"
                pointerEvents="none"
              >
                {count}
              </text>
            )}
          </g>
        );
      })}
      <circle r={R_HOLE - 1} fill="#141416" />
    </svg>
  );
};
