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
import {
  PLACE_INVITATION,
  usePlaceSummaries,
  type PlaceSummaries,
} from '../placeSummaries';
import { projectPlaceFor, type ProjectPlace } from '../projectPlaces';
import type { SlideElement, SlideSurface } from '../types';

// ── The Individual Project's menu (owner, 2026-11-12) ──────────────────────
// Where each student works today: the six places as the app's own icons,
// three on each side, each with its name, joined by a thin curved line to
// the Music Atlas logo in the middle, a short glowing streak running along
// each line into it in the app's key-colour rainbow (after the "Animated
// Beam Integration" diagram the owner chose; drawn here from scratch). A
// hand on an icon runs the rainbow along its whole line, in place of its
// streak; the other streaks finish their run into the logo and no new ones
// set out until it leaves.
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
const TILE = 52;
const HUB = 96;
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
   * the lesson instead of a new tab (the `openPlace` slot), a box the very
   * thing they left off at (`href`).
   */
  onOpen?: (place: ProjectPlace, href?: string) => void;
  /**
   * The screen is one person's (Present, a student's device): the boxes
   * show where they left off in each place. Never on the room's screen, a
   * thumbnail or the editor, which show the places alone.
   */
  personal?: boolean;
}

/** The row of boxes along the menu's foot, and the gap above it. */
const BOXES_H = 84;
const BOXES_GAP = 16;

/** A place's control: a button in a lesson, a link on Present, else none. */
const PlaceControl = ({
  place,
  name,
  url,
  sectionLabel,
  onOpen,
  href,
  className,
  style,
  onHand,
  children,
}: {
  place: ProjectPlace;
  name: string;
  url: string | null;
  sectionLabel: string;
  onOpen?: ((place: ProjectPlace, href?: string) => void) | undefined;
  /** What a lesson's button opens: the very thing, else the place. */
  href?: string | undefined;
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
        onClick={() => (href ? onOpen(place, href) : onOpen(place))}
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

/** Where the person left off in each place: read only on their own screen. */
const PersonalPlaceMenu = (props: PlaceMenuProps) => {
  const summaries = usePlaceSummaries();
  return <PlaceMenuView {...props} summaries={summaries} />;
};

export const PlaceMenu = (props: PlaceMenuProps) =>
  props.personal ? (
    <PersonalPlaceMenu {...props} />
  ) : (
    <PlaceMenuView {...props} summaries={null} />
  );

const PlaceMenuView = ({
  places,
  surface,
  language,
  sectionLabel,
  still = false,
  stacked = false,
  onOpen,
  summaries,
}: PlaceMenuProps & { summaries: PlaceSummaries | null }) => {
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
    if (lit === null) return;
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
          const left = summaries?.[place.id];
          return (
            <PlaceControl
              key={place.id}
              place={place}
              name={name}
              url={left?.href ?? urlOf(place)}
              href={left?.href}
              sectionLabel={sectionLabel}
              onOpen={onOpen}
              className="flex h-14 w-full items-center gap-3 rounded-xl border border-white/10 bg-[#141418] px-4 text-left text-white"
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="text-[0.9em] text-white/80">{name}</span>
                {left && (
                  <span className="truncate text-[0.75em] text-white/50">
                    {left.title}
                  </span>
                )}
              </span>
            </PlaceControl>
          );
        })}
      </div>
    );

  // The diagram above, the boxes along the foot.
  const beamsH = size ? Math.max(0, size.h - BOXES_H - BOXES_GAP) : 0;
  const nodes = size ? layoutPlaces(places, size.w, beamsH) : [];
  const hand = (id: string) =>
    projected
      ? undefined
      : (on: boolean) => setLit((was) => (on ? id : was === id ? null : was));

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
          className="pointer-events-none absolute left-0 top-0"
          width={size.w}
          height={beamsH}
          viewBox={`0 0 ${size.w} ${beamsH}`}
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
                y2={beamsH / 2}
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
            {/* The line under a hand: the rainbow flowing along it into the
                logo, round and round (the key colours close into a circle,
                so it repeats without a seam). Still under reduced motion. */}
            {nodes
              .filter((node) => node.place.id === lit)
              .map((node) => {
                const dx = size.w / 2 - node.x;
                const dy = beamsH / 2 - node.y;
                const ring = [...KEY_RAINBOW_COLORS, KEY_RAINBOW_COLORS[0]!];
                return (
                  <linearGradient
                    key={node.place.id}
                    id={`${uid}-${node.place.id}-flow`}
                    gradientUnits="userSpaceOnUse"
                    spreadMethod="repeat"
                    x1={node.x}
                    y1={node.y}
                    x2={size.w / 2}
                    y2={beamsH / 2}
                  >
                    {ring.map((color, i) => (
                      <stop
                        key={i}
                        offset={`${((i / (ring.length - 1)) * 100).toFixed(1)}%`}
                        stopColor={color}
                      />
                    ))}
                    {!reduce && (
                      <animateTransform
                        attributeName="gradientTransform"
                        type="translate"
                        from="0 0"
                        to={`${dx} ${dy}`}
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    )}
                  </linearGradient>
                );
              })}
          </defs>
          {nodes.map((node, index) => {
            const on = lit === node.place.id;
            const stroke = `url(#${uid}-${node.place.id})`;
            // A hand on an icon: its whole line in the flowing rainbow and no
            // streak of its own; every other line's streak runs on into the
            // logo, and then no new one sets out (it stops at the end of its
            // loop, where nothing shows) until the hand leaves.
            const held = rested.has(node.place.id);
            const motion = {
              animationDelay: `${(index * 0.55).toFixed(2)}s`,
              animationPlayState: held ? 'paused' : 'running',
            };
            return (
              <g key={node.place.id} data-beam={node.place.id}>
                <path
                  d={node.path}
                  fill="none"
                  stroke={
                    on
                      ? `url(#${uid}-${node.place.id}-flow)`
                      : 'rgba(255,255,255,0.1)'
                  }
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
                      opacity={on ? 0 : 0.18}
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
                      opacity={on ? 0 : 0.85}
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
          className="absolute flex items-center justify-center rounded-[24px] border border-white/10 bg-[#141418] shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
          style={{
            left: size.w / 2 - HUB / 2,
            top: beamsH / 2 - HUB / 2,
            width: HUB,
            height: HUB,
          }}
        >
          <Logo className="size-[44px]" />
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
            onHand={hand(node.place.id)}
            className="absolute flex flex-col items-center gap-[6px] rounded-[16px]"
            style={{
              left: node.x - NODE_W / 2,
              top: node.y - TILE / 2,
              width: NODE_W,
            }}
          >
            <span
              data-place={node.place.id}
              className={`flex items-center justify-center rounded-[16px] border bg-[#141418] text-white shadow-[0_6px_24px_rgba(0,0,0,0.4)] transition-[border-color,transform] duration-300 ${
                on ? 'scale-105 border-white/30' : 'border-white/10'
              }`}
              style={{ width: TILE, height: TILE }}
            >
              <Icon className="size-[26px]" aria-hidden />
            </span>
            <span className="whitespace-nowrap text-[0.7em] leading-none text-white/60">
              {name}
            </span>
          </PlaceControl>
        );
      })}

      {/* Where the person left off in each place (owner, 2026-11-12): six
          boxes along the foot, each opening the very thing; the room's
          screen and a thumbnail show the places alone. */}
      <div
        data-place-boxes=""
        className="absolute inset-x-0 bottom-0 grid grid-cols-6 gap-[12px]"
        style={{ height: BOXES_H }}
      >
        {places.map((place) => {
          const name = pickLocalized(place.label, language);
          const Icon = AppIcons[place.id];
          const left = summaries?.[place.id] ?? null;
          const on = lit === place.id;
          return (
            <PlaceControl
              key={place.id}
              place={place}
              name={name}
              url={left?.href ?? urlOf(place)}
              href={left?.href}
              sectionLabel={sectionLabel}
              onOpen={onOpen}
              onHand={hand(place.id)}
              className={`flex min-w-0 flex-col justify-center gap-[6px] rounded-[16px] border bg-[#141418] px-[16px] text-left transition-colors duration-300 ${
                on ? 'border-white/30' : 'border-white/10'
              }`}
            >
              <span
                data-place-box={place.id}
                className="flex items-center gap-[6px] text-[0.6em] leading-none text-white/50"
              >
                <Icon className="size-[1.1em] shrink-0" aria-hidden />
                {name}
              </span>
              {summaries && (
                <>
                  <span className="truncate text-[0.72em] leading-tight text-white">
                    {left?.title ?? PLACE_INVITATION[place.id]}
                  </span>
                  {left?.detail && (
                    <span className="truncate text-[0.58em] leading-none text-white/45">
                      {left.detail}
                    </span>
                  )}
                </>
              )}
            </PlaceControl>
          );
        })}
      </div>
    </div>
  );
};
