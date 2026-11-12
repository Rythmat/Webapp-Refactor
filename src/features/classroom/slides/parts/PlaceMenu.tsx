import { useReducedMotion } from 'framer-motion';
import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Logo } from '@/components/Logo';
import { AppIcons } from '@/components/icons/appIcons';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import { pickLocalized } from '../../presentation/localized';
import { resolveModuleUrl } from '../../presentation/resolveModuleUrl';
import { useTeacherConfig } from '../../settings/useTeacherConfig';
import type { StudentLanguage } from '../../types';
import { projectPlaceFor, type ProjectPlace } from '../projectPlaces';
import type { SlideElement, SlideSurface } from '../types';

// ── The Individual Project's menu (owner, 2026-11-12) ──────────────────────
// Where each student works today: the six places as the app's own icons,
// three on each side, each with its name, joined by a thin curved line to
// the Music Atlas logo in the middle, a short glowing streak running along
// each line into it in the app's key-colour rainbow (after the "Animated
// Beam Integration" diagram the owner chose; drawn here from scratch). A
// hand on an icon draws its whole line in the rainbow; the other streaks
// finish their run into the logo and no new ones set out until it leaves.
//
//   Present          each icon opens its place in a new tab
//   a student        each icon opens its place inside the lesson (`onOpen`)
//   room's screen    the same picture, nothing to click
//   thumbnail, or    the lines without streaks
//   reduced motion
//   a phone          no lines: the places as a list, icon and name

/** The place an element opens, if it is one of the six. */
const placeOf = (element: SlideElement): ProjectPlace | undefined => {
  if (element.kind !== 'content') return undefined;
  const ref =
    element.embed?.type === 'atlasCard'
      ? element.embed.ref
      : element.href.kind === 'atlas'
        ? element.href.ref
        : '';
  return projectPlaceFor(ref);
};

/**
 * The slide's places, when its call-to-action row holds nothing else: the
 * stage draws them as one menu instead of a card per element.
 */
export const placeMenuOf = (
  elements: readonly SlideElement[],
): { places: ProjectPlace[]; ids: Set<string> } | null => {
  const row = elements
    .filter((e) => e.zone === 'ctaCenter' && !e.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const places = row.map(placeOf);
  if (row.length === 0 || places.some((p) => !p)) return null;
  return {
    places: places as ProjectPlace[],
    ids: new Set(row.map((e) => e.id)),
  };
};

/** An icon's tile and the logo's, in the box's px (canvas px on a slide). */
const TILE = 64;
const HUB = 112;
/** An icon's control: its tile, with room for its name under it. */
const NODE_W = TILE + 48;
/** How far in from each side the two columns stand, as a share of the width. */
const COLUMN_IN = 0.2;

export interface PlaceNode {
  place: ProjectPlace;
  side: 'left' | 'right';
  /** The tile's centre. */
  x: number;
  y: number;
  /** The curve from the tile to the logo. */
  path: string;
}

/**
 * Where each place sits in a box `w` × `h`: the first half (rounded up) down
 * the left, the rest down the right, each column spread over the height, and
 * each one's curve to the logo in the middle: level as it leaves the tile,
 * level as it reaches the logo.
 */
export const layoutPlaces = (
  places: readonly ProjectPlace[],
  w: number,
  h: number,
): PlaceNode[] => {
  const leftCount = Math.ceil(places.length / 2);
  const cx = w / 2;
  const cy = h / 2;
  const rowsY = (count: number, i: number) =>
    count === 1 ? cy : h * (0.17 + (0.66 * i) / (count - 1));
  return places.map((place, index) => {
    const left = index < leftCount;
    const i = left ? index : index - leftCount;
    const count = left ? leftCount : places.length - leftCount;
    const x = left ? w * COLUMN_IN : w * (1 - COLUMN_IN);
    const y = rowsY(count, i);
    const sx = left ? x + TILE / 2 : x - TILE / 2;
    const ex = left ? cx - HUB / 2 : cx + HUB / 2;
    const mx = (sx + ex) / 2;
    return {
      place,
      side: left ? 'left' : 'right',
      x,
      y,
      path: `M ${sx} ${y} C ${mx} ${y}, ${mx} ${cy}, ${ex} ${cy}`,
    };
  });
};

interface PlaceMenuProps {
  places: readonly ProjectPlace[];
  surface: SlideSurface;
  language: StudentLanguage;
  /** For accessibility: the section the menu belongs to. */
  sectionLabel: string;
  /** A thumbnail: no streaks. */
  still?: boolean;
  /** A phone's column: the places as a list, no lines. */
  stacked?: boolean;
  /**
   * A student's device in a live session: an icon opens its place inside
   * the lesson instead of a new tab (the `openPlace` slot).
   */
  onOpen?: (place: ProjectPlace) => void;
}

/** A place's control: a button in a lesson, a link on Present, else none. */
const PlaceControl = ({
  place,
  name,
  url,
  sectionLabel,
  onOpen,
  className,
  style,
  onHand,
  children,
}: {
  place: ProjectPlace;
  name: string;
  url: string | null;
  sectionLabel: string;
  onOpen?: ((place: ProjectPlace) => void) | undefined;
  className: string;
  style?: CSSProperties;
  onHand?: ((on: boolean) => void) | undefined;
  children: ReactNode;
}) => {
  const hand = onHand
    ? {
        onPointerEnter: () => onHand(true),
        onPointerLeave: () => onHand(false),
        onFocus: () => onHand(true),
        onBlur: () => onHand(false),
      }
    : {};
  const ring =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';
  if (onOpen)
    return (
      <button
        type="button"
        onClick={() => onOpen(place)}
        aria-label={`${name}, opens inside the lesson (${sectionLabel})`}
        className={`${className} ${ring}`}
        style={style}
        {...hand}
      >
        {children}
      </button>
    );
  if (url)
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${name}, opens ${name} (${sectionLabel})`}
        className={`${className} ${ring}`}
        style={style}
        {...hand}
      >
        {children}
      </a>
    );
  return (
    <div className={className} style={style} {...hand}>
      {children}
    </div>
  );
};

export const PlaceMenu = ({
  places,
  surface,
  language,
  sectionLabel,
  still = false,
  stacked = false,
  onOpen,
}: PlaceMenuProps) => {
  const reduce = useReducedMotion() ?? false;
  const { config } = useTeacherConfig();
  // The room's screen can't be tapped.
  const projected = surface === 'projector';
  const streaks = !still && !reduce;
  const urlOf = (place: ProjectPlace) =>
    projected || onOpen
      ? null
      : resolveModuleUrl(
          { id: place.id, module: place.module, activityRef: place.ref },
          config.moduleUrls,
        );

  // The box's own size (layout px, so canvas px on a scaled slide).
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || stacked) return;
    const measure = () =>
      setSize((was) =>
        was && was.w === el.offsetWidth && was.h === el.offsetHeight
          ? was
          : { w: el.offsetWidth, h: el.offsetHeight },
      );
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const seen = new ResizeObserver(measure);
    seen.observe(el);
    return () => seen.disconnect();
  }, [stacked]);

  const [lit, setLit] = useState<string | null>(null);
  // Lines whose streak has come to rest while a hand is on another icon.
  const [rested, setRested] = useState<ReadonlySet<string>>(new Set());
  // Each line's run of streaks; a rested line starts a new run when the hand
  // leaves, its own delay keeping the lines out of step as before.
  const [runs, setRuns] = useState<Readonly<Record<string, number>>>({});
  useEffect(() => {
    if (lit !== null || rested.size === 0) return;
    setRuns((was) => {
      const next = { ...was };
      for (const id of rested) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
    setRested(new Set());
  }, [lit, rested]);
  /** A streak finished its run (and its rest): stop it there, under a hand. */
  const restAt = (id: string) => {
    if (lit === null || lit === id) return;
    setRested((was) => (was.has(id) ? was : new Set(was).add(id)));
  };
  const uid = useId().replace(/:/g, '');

  if (stacked)
    return (
      <div
        className="flex w-full flex-col gap-2"
        style={{ fontSize: 'var(--slide-body-fz)' }}
      >
        {places.map((place) => {
          const name = pickLocalized(place.label, language);
          const Icon = AppIcons[place.id];
          return (
            <PlaceControl
              key={place.id}
              place={place}
              name={name}
              url={urlOf(place)}
              sectionLabel={sectionLabel}
              onOpen={onOpen}
              className="flex h-14 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#141418] px-4 text-left text-white"
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="text-[0.9em] text-white/80">{name}</span>
            </PlaceControl>
          );
        })}
      </div>
    );

  const nodes = size ? layoutPlaces(places, size.w, size.h) : [];

  return (
    <div
      ref={box}
      data-place-beams=""
      className="relative size-full"
      style={{ fontSize: 'var(--slide-body-fz)' }}
    >
      {size && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
        >
          <defs>
            {nodes.map((node) => (
              <linearGradient
                key={node.place.id}
                id={`${uid}-${node.place.id}`}
                gradientUnits="userSpaceOnUse"
                x1={node.x}
                y1={node.y}
                x2={size.w / 2}
                y2={size.h / 2}
              >
                {KEY_RAINBOW_COLORS.map((color, i) => (
                  <stop
                    key={color}
                    offset={`${((i / (KEY_RAINBOW_COLORS.length - 1)) * 100).toFixed(1)}%`}
                    stopColor={color}
                  />
                ))}
              </linearGradient>
            ))}
          </defs>
          {nodes.map((node, index) => {
            const on = lit === node.place.id;
            const stroke = `url(#${uid}-${node.place.id})`;
            // A hand on an icon: its whole line in the rainbow; every other
            // line's streak runs on into the logo, and then no new one sets
            // out (it stops at the end of its loop, where nothing shows)
            // until the hand leaves.
            const held = !on && rested.has(node.place.id);
            const motion = {
              animationDelay: `${(index * 0.55).toFixed(2)}s`,
              animationPlayState: held ? 'paused' : 'running',
            };
            return (
              <g key={node.place.id} data-beam={node.place.id}>
                <path
                  d={node.path}
                  fill="none"
                  stroke={on ? stroke : 'rgba(255,255,255,0.1)'}
                  strokeWidth={on ? 2 : 1.5}
                  data-lit={on || undefined}
                  className="transition-[stroke] duration-300"
                />
                {streaks && (
                  <Fragment key={runs[node.place.id] ?? 0}>
                    {/* The glow: a wider, fainter copy (no blur on a slide). */}
                    <path
                      d={node.path}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={7}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray="0.26 1.3"
                      opacity={on ? 0.35 : 0.18}
                      className="place-beam"
                      style={motion}
                    />
                    <path
                      d={node.path}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray="0.26 1.3"
                      opacity={on ? 1 : 0.85}
                      className="place-beam"
                      style={motion}
                      onAnimationIteration={() => restAt(node.place.id)}
                    />
                  </Fragment>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {size && (
        <div
          className="absolute flex items-center justify-center rounded-[28px] border border-white/10 bg-[#141418] shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
          style={{
            left: size.w / 2 - HUB / 2,
            top: size.h / 2 - HUB / 2,
            width: HUB,
            height: HUB,
          }}
        >
          <Logo className="size-[52px]" />
        </div>
      )}

      {nodes.map((node) => {
        const name = pickLocalized(node.place.label, language);
        const Icon = AppIcons[node.place.id];
        const on = lit === node.place.id;
        return (
          <PlaceControl
            key={node.place.id}
            place={node.place}
            name={name}
            url={urlOf(node.place)}
            sectionLabel={sectionLabel}
            onOpen={onOpen}
            onHand={
              projected
                ? undefined
                : (hand) =>
                    setLit((was) =>
                      hand ? node.place.id : was === node.place.id ? null : was,
                    )
            }
            className="absolute flex flex-col items-center gap-[8px] rounded-[20px]"
            style={{
              left: node.x - NODE_W / 2,
              top: node.y - TILE / 2,
              width: NODE_W,
            }}
          >
            <span
              data-place={node.place.id}
              className={`flex items-center justify-center rounded-[20px] border bg-[#141418] text-white shadow-[0_6px_24px_rgba(0,0,0,0.4)] transition-[border-color,transform] duration-300 ${
                on ? 'scale-105 border-white/30' : 'border-white/10'
              }`}
              style={{ width: TILE, height: TILE }}
            >
              <Icon className="size-[30px]" aria-hidden />
            </span>
            <span className="whitespace-nowrap text-[0.7em] leading-none text-white/60">
              {name}
            </span>
          </PlaceControl>
        );
      })}
    </div>
  );
};
