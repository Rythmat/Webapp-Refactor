import { useReducedMotion } from 'framer-motion';
import type { KeyboardEvent, ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// ── The whole chain, drawn ─────────────────────────────────────────────────
// A mic, a mixing desk, a power amp and a PA speaker, with the desk's second
// output going to an interface and a laptop for the recording. Each cable is
// labelled with the level it carries. Gear or cables can be made pressable, for
// a screen that asks which is which: each is then a button, so a keyboard and a
// screen reader can answer too. Wide, it reads left to right; on a phone, down.

export type GearId =
  | 'mic'
  | 'desk'
  | 'amp'
  | 'speaker'
  | 'interface'
  | 'laptop';
export type CableId = 'xlr' | 'line' | 'speakerCable' | 'recLine' | 'usb';

interface Point {
  x: number;
  y: number;
}
interface Anchor extends Point {
  /** Which way the cable leaves. */
  dx: number;
  dy: number;
}

const GEAR_NAMES: Readonly<Record<GearId, string>> = {
  mic: 'Mic',
  desk: 'Mixing desk',
  amp: 'Power amp',
  speaker: 'PA speaker',
  interface: 'Interface',
  laptop: 'Laptop',
};

/** What a cable is called when it's pressed: both line cables are one answer. */
const CABLE_TERM: Readonly<Record<CableId, string>> = {
  xlr: 'xlr',
  line: 'line',
  speakerCable: 'speakerCable',
  recLine: 'line',
  usb: 'usb',
};

const CABLE_NAMES: Readonly<Record<CableId, string>> = {
  xlr: 'Cable from the mic to the desk',
  line: 'Cable from the desk to the power amp',
  speakerCable: 'Cable from the power amp to the speaker',
  recLine: 'Cable from the desk to the interface',
  usb: 'Cable from the interface to the laptop',
};

interface Layout {
  width: number;
  height: number;
  label: number;
  at: Readonly<Record<GearId, Point>>;
  /** Where a box's name goes, if not under it: wherever no cable runs. */
  names: Partial<Record<GearId, 'above' | 'left'>>;
  /** Where each cable leaves one box and arrives at the next. */
  cables: Readonly<Record<CableId, readonly [Anchor, Anchor]>>;
}

const a = (x: number, y: number, dx: number, dy: number): Anchor => ({
  x,
  y,
  dx,
  dy,
});

const WIDE: Layout = {
  width: 1000,
  height: 470,
  label: 22,
  at: {
    mic: { x: 80, y: 150 },
    desk: { x: 330, y: 150 },
    amp: { x: 610, y: 150 },
    speaker: { x: 885, y: 150 },
    interface: { x: 610, y: 370 },
    laptop: { x: 885, y: 370 },
  },
  // The mic's cable leaves from below it.
  names: { mic: 'above' },
  cables: {
    xlr: [a(80, 214, 0, 1), a(246, 160, -1, 0)],
    line: [a(414, 150, 1, 0), a(526, 150, -1, 0)],
    speakerCable: [a(694, 150, 1, 0), a(843, 150, -1, 0)],
    recLine: [a(330, 196, 0, 1), a(546, 370, -1, 0)],
    usb: [a(674, 370, 1, 0), a(825, 370, -1, 0)],
  },
};

const NARROW: Layout = {
  width: 600,
  height: 830,
  label: 26,
  at: {
    mic: { x: 330, y: 100 },
    desk: { x: 330, y: 300 },
    amp: { x: 330, y: 510 },
    speaker: { x: 330, y: 740 },
    interface: { x: 520, y: 480 },
    laptop: { x: 520, y: 730 },
  },
  // The chain runs straight down through the middle of each box.
  names: {
    mic: 'left',
    desk: 'left',
    amp: 'left',
    speaker: 'left',
    interface: 'above',
  },
  cables: {
    xlr: [a(330, 164, 0, 1), a(330, 256, 0, -1)],
    line: [a(330, 344, 0, 1), a(330, 476, 0, -1)],
    speakerCable: [a(330, 544, 0, 1), a(330, 676, 0, -1)],
    recLine: [a(414, 300, 1, 0), a(456, 480, -1, 0)],
    usb: [a(520, 510, 0, 1), a(520, 678, 0, -1)],
  },
};

/** A drooping cable from one anchor to the next. */
function cablePath([from, to]: readonly [Anchor, Anchor]) {
  const reach = Math.hypot(to.x - from.x, to.y - from.y) * 0.45;
  const c1 = { x: from.x + from.dx * reach, y: from.y + from.dy * reach };
  const c2 = { x: to.x + to.dx * reach, y: to.y + to.dy * reach };
  const mid = {
    x: (from.x + 3 * c1.x + 3 * c2.x + to.x) / 8,
    y: (from.y + 3 * c1.y + 3 * c2.y + to.y) / 8,
  };
  return {
    d: `M ${from.x} ${from.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`,
    mid,
  };
}

const LINE = 'rgb(255 255 255 / 0.78)';
const FAINT = 'rgb(255 255 255 / 0.3)';
const PANEL = '#17171b';

/** Line drawings of each box, centred on the origin. */
function GearArt({ id, stroke }: { id: GearId; stroke: string }) {
  const common = {
    fill: 'none',
    stroke,
    strokeWidth: 2.5,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };
  switch (id) {
    case 'mic':
      return (
        <g {...common}>
          <circle cx="0" cy="-30" r="26" fill={PANEL} />
          {[-16, -6, 4, 14].map((x) => (
            <line key={`v${x}`} x1={x} y1="-52" x2={x} y2="-8" stroke={FAINT} />
          ))}
          {[-44, -34, -24, -14].map((y) => (
            <line key={`h${y}`} x1="-22" y1={y} x2="22" y2={y} stroke={FAINT} />
          ))}
          <circle cx="0" cy="-30" r="26" />
          <path d="M -15 -6 L -9 50 L 9 50 L 15 -6 Z" fill={PANEL} />
          <rect x="-7" y="50" width="14" height="12" rx="2" />
        </g>
      );
    case 'desk':
      return (
        <g {...common}>
          <path d="M -84 44 L -70 -44 L 70 -44 L 84 44 Z" fill={PANEL} />
          {[-48, -24, 0, 24, 48].map((x) => (
            <g key={x}>
              <circle cx={x} cy="-30" r="5" />
              <circle cx={x} cy="-14" r="3.5" stroke={FAINT} />
              <circle cx={x} cy="-2" r="3.5" stroke={FAINT} />
              <line x1={x} y1="10" x2={x} y2="36" stroke={FAINT} />
              <rect
                x={x - 7}
                y={x === -48 ? 14 : 22}
                width="14"
                height="6"
                rx="1.5"
                fill={stroke}
                stroke="none"
              />
            </g>
          ))}
        </g>
      );
    case 'amp':
      return (
        <g {...common}>
          <rect x="-84" y="-34" width="168" height="68" rx="4" fill={PANEL} />
          <rect x="-94" y="-34" width="10" height="68" rx="2" />
          <rect x="84" y="-34" width="10" height="68" rx="2" />
          <circle cx="-56" cy="0" r="13" />
          <line x1="-56" y1="0" x2="-63" y2="-9" />
          <circle cx="-20" cy="0" r="13" />
          <line x1="-20" y1="0" x2="-13" y2="-9" />
          {[-18, -6, 6, 18].map((y, i) => (
            <circle
              key={y}
              cx="10"
              cy={y}
              r="3.5"
              fill={i === 0 ? '#ef4444' : '#34d399'}
              stroke="none"
              opacity={i === 0 ? 0.4 : 0.85}
            />
          ))}
          {[28, 38, 48, 58, 68].map((x) => (
            <line key={x} x1={x} y1="-22" x2={x} y2="22" stroke={FAINT} />
          ))}
        </g>
      );
    case 'speaker':
      return (
        <g {...common}>
          <path d="M -44 -64 L 44 -64 L 38 64 L -38 64 Z" fill={PANEL} />
          <path d="M -26 -52 L 26 -52 L 10 -34 L -10 -34 Z" />
          <circle cx="0" cy="18" r="30" />
          <circle cx="0" cy="18" r="21" stroke={FAINT} />
          <circle cx="0" cy="18" r="9" />
        </g>
      );
    case 'interface':
      return (
        <g {...common}>
          <rect x="-64" y="-30" width="128" height="60" rx="10" fill={PANEL} />
          <circle cx="-38" cy="0" r="10" />
          <circle cx="-10" cy="0" r="10" />
          <circle cx="30" cy="0" r="17" stroke={FAINT} />
          <circle cx="30" cy="0" r="11" />
        </g>
      );
    case 'laptop':
      return (
        <g {...common}>
          <rect x="-50" y="-52" width="100" height="66" rx="5" fill={PANEL} />
          <path d="M -40 -20 L -30 -20 L -26 -36 L -20 -6 L -14 -30 L -8 -12 L -2 -26 L 4 -16 L 10 -22 L 16 -18 L 24 -20 L 40 -20" />
          <path d="M -62 14 L 62 14 L 68 26 L -68 26 Z" fill={PANEL} />
        </g>
      );
  }
}

/** A box's name, placed clear of its cables. */
function nameAt(
  where: 'above' | 'left' | undefined,
  w: number,
  h: number,
  size: number,
) {
  if (where === 'left') {
    return {
      x: -w / 2 - 14,
      y: 0,
      textAnchor: 'end' as const,
      dominantBaseline: 'central' as const,
    };
  }
  if (where === 'above') {
    return { x: 0, y: -h / 2 - 12, textAnchor: 'middle' as const };
  }
  return { x: 0, y: h / 2 + size, textAnchor: 'middle' as const };
}

const HIT: Readonly<Record<GearId, readonly [number, number]>> = {
  mic: [72, 132],
  desk: [184, 104],
  amp: [204, 84],
  speaker: [104, 144],
  interface: [144, 76],
  laptop: [152, 96],
};

function Pressable({
  label,
  enabled,
  onPress,
  children,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  if (!enabled) return <g>{children}</g>;
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    onPress();
  };
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className="group cursor-pointer outline-none"
      onClick={onPress}
      onKeyDown={onKeyDown}
    >
      {children}
    </g>
  );
}

export function SignalChain({
  levels,
  lit = [],
  dim = [],
  pressable = null,
  onPress,
  flowing,
  accent,
}: {
  /** What each cable is carrying, as shown on its tag. */
  levels: Readonly<Record<CableId, string>>;
  /** Gear and cables picked out in the accent. */
  lit?: readonly (GearId | CableId)[];
  /** Gear and cables in the background on this screen. */
  dim?: readonly (GearId | CableId)[];
  /** What a tap answers: a box or a cable. */
  pressable?: 'gear' | 'cables' | null;
  onPress?: (term: string) => void;
  /** Sound is playing: the signal is drawn moving along the cables. */
  flowing: boolean;
  accent: string;
}) {
  const wide = useMediaQuery('(min-width: 640px)');
  const reduced = useReducedMotion() ?? false;
  const layout = wide ? WIDE : NARROW;
  const isLit = (id: string) => lit.includes(id as GearId);
  const isDim = (id: string) => dim.includes(id as GearId);

  const cables = (Object.keys(layout.cables) as CableId[]).map((id) => ({
    id,
    ...cablePath(layout.cables[id]),
  }));

  return (
    <figure
      className="m-0 flex flex-col gap-1"
      data-stage="signal-chain"
      data-pressable={pressable ?? undefined}
    >
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="mx-auto h-auto w-full max-w-[46rem]"
        role="group"
        aria-label="The signal path: mic, mixing desk, power amp and PA speaker, with the desk also feeding an interface and a laptop"
      >
        {cables.map(({ id, d, mid }) => {
          const lead = isLit(id) ? accent : isDim(id) ? FAINT : LINE;
          const thick = id === 'speakerCable';
          const enabled = pressable === 'cables';
          const term = CABLE_TERM[id];
          return (
            <Pressable
              key={id}
              label={CABLE_NAMES[id]}
              enabled={enabled}
              onPress={() => onPress?.(term)}
            >
              <g data-cable={id} opacity={isDim(id) ? 0.45 : 1}>
                {enabled && (
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="34"
                    pointerEvents="stroke"
                  />
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={lead}
                  strokeWidth={thick ? 9 : 3.5}
                  strokeLinecap="round"
                  className={
                    enabled
                      ? 'transition-[stroke-width] group-hover:[stroke-width:12] group-focus-visible:[stroke-width:12]'
                      : undefined
                  }
                />
                {thick && (
                  <path
                    d={d}
                    fill="none"
                    stroke="#101012"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}
                {flowing && !reduced && !isDim(id) && (
                  <circle r="6" fill={accent}>
                    <animateMotion
                      dur="1.1s"
                      repeatCount="indefinite"
                      path={d}
                    />
                  </circle>
                )}
                <g transform={`translate(${mid.x} ${mid.y})`}>
                  <rect
                    x={-levels[id].length * 6.6 - 14}
                    y="-17"
                    width={levels[id].length * 13.2 + 28}
                    height="34"
                    rx="17"
                    fill="#101012"
                    stroke={isLit(id) ? accent : 'rgb(255 255 255 / 0.35)'}
                    strokeWidth="2"
                    className={
                      enabled
                        ? 'group-hover:stroke-white group-focus-visible:stroke-white'
                        : undefined
                    }
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="21"
                    fontWeight="700"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {levels[id]}
                  </text>
                </g>
              </g>
            </Pressable>
          );
        })}

        {(Object.keys(layout.at) as GearId[]).map((id) => {
          const { x, y } = layout.at[id];
          const [w, h] = HIT[id];
          const enabled = pressable === 'gear';
          const stroke = isLit(id) ? accent : LINE;
          return (
            <Pressable
              key={id}
              label={GEAR_NAMES[id]}
              enabled={enabled}
              onPress={() => onPress?.(id)}
            >
              <g
                transform={`translate(${x} ${y})`}
                opacity={isDim(id) ? 0.4 : 1}
                data-gear={id}
              >
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx="14"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="2.5"
                  className={
                    enabled
                      ? 'group-hover:stroke-white/30 group-focus-visible:stroke-white/80'
                      : undefined
                  }
                />
                <GearArt id={id} stroke={stroke} />
                <text
                  {...nameAt(layout.names[id], w, h, layout.label)}
                  fill={isLit(id) ? accent : 'rgb(255 255 255 / 0.8)'}
                  fontSize={layout.label}
                  fontWeight="700"
                >
                  {GEAR_NAMES[id]}
                </text>
              </g>
            </Pressable>
          );
        })}
      </svg>
    </figure>
  );
}
