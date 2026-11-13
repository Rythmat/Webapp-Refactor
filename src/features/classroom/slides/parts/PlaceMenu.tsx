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
// Where each student works today: the six places as cards, three down each
// side, each joined by a thin curved line to the Music Atlas logo in the
// middle, a short glowing streak running along each line into it in the
// app's key-colour rainbow (after the "Animated Beam Integration" diagram the
// owner chose; drawn here from scratch). A hand on a card runs the rainbow
// along its whole line, in place of its streak; the other streaks finish
// their run into the logo and no new ones set out until it leaves.
//
// A card is the place's app icon and name, and where the person left off
// there (owner, 2026-11-13: one card per place, the beams running from them,
// in place of icons over a row of boxes that named every place twice).
//
//   Present          each card opens where the teacher left off, in a new tab
//   a student        each card opens theirs inside the lesson (`onOpen`)
//   room's screen    the places and what each is, nothing to click
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

/** A place's card and the logo's tile, in the box's px (canvas px on a slide). */
export const CARD_W = 320;
export const CARD_H = 112;
const HUB = 128;

export interface PlaceNode {
  place: ProjectPlace;
  side: 'left' | 'right';
  /** The card's centre. */
  x: number;
  y: number;
  /** Where its line leaves the card: the card's inner edge. */
  from: number;
  /** The curve from the card to the logo. */
  path: string;
}

/**
 * Where each place sits in a box `w` × `h`: the first half (rounded up) down
 * the left edge, the rest down the right, each column spread from the box's
 * top to its foot, and each one's curve from the card's inner edge to the
 * logo in the middle: level as it leaves the card, level as it reaches the
 * logo.
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
    count === 1 ? cy : CARD_H / 2 + (i * (h - CARD_H)) / (count - 1);
  return places.map((place, index) => {
    const left = index < leftCount;
    const i = left ? index : index - leftCount;
    const count = left ? leftCount : places.length - leftCount;
    const x = left ? CARD_W / 2 : w - CARD_W / 2;
    const y = rowsY(count, i);
    const from = left ? CARD_W : w - CARD_W;
    const to = left ? cx - HUB / 2 : cx + HUB / 2;
    const mx = (from + to) / 2;
    return {
      place,
      side: left ? 'left' : 'right',
      x,
      y,
      from,
      path: `M ${from} ${y} C ${mx} ${y}, ${mx} ${cy}, ${to} ${cy}`,
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
   * A student's device in a live session: a card opens the very thing they
   * left off at (`href`), else its place, inside the lesson instead of a new
   * tab (the `openPlace` slot).
   */
  onOpen?: (place: ProjectPlace, href?: string) => void;
  /**
   * The screen is one person's (Present, a student's device): the cards
   * show where they left off in each place. Never on the room's screen, a
   * thumbnail or the editor, which show the places alone.
   */
  personal?: boolean;
}

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

  const nodes = size ? layoutPlaces(places, size.w, size.h) : [];
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
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
        >
          <defs>
            {nodes.map((node) => (
              <linearGradient
                key={node.place.id}
                id={`${uid}-${node.place.id}`}
                gradientUnits="userSpaceOnUse"
                x1={node.from}
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
            {/* The line under a hand: the rainbow flowing along it into the
                logo, round and round (the key colours close into a circle,
                so it repeats without a seam). Still under reduced motion. */}
            {nodes
              .filter((node) => node.place.id === lit)
              .map((node) => {
                const dx = size.w / 2 - node.from;
                const dy = size.h / 2 - node.y;
                const ring = [...KEY_RAINBOW_COLORS, KEY_RAINBOW_COLORS[0]!];
                return (
                  <linearGradient
                    key={node.place.id}
                    id={`${uid}-${node.place.id}-flow`}
                    gradientUnits="userSpaceOnUse"
                    spreadMethod="repeat"
                    x1={node.from}
                    y1={node.y}
                    x2={size.w / 2}
                    y2={size.h / 2}
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
            // A hand on a card: its whole line in the flowing rainbow and no
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
          className="absolute flex items-center justify-center rounded-[28px] border border-white/10 bg-[#141418] shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
          style={{
            left: size.w / 2 - HUB / 2,
            top: size.h / 2 - HUB / 2,
            width: HUB,
            height: HUB,
          }}
        >
          <Logo className="size-[60px]" />
        </div>
      )}

      {nodes.map((node) => {
        const { place } = node;
        const name = pickLocalized(place.label, language);
        const Icon = AppIcons[place.id];
        const on = lit === place.id;
        // Where the person left off there; none on a screen that isn't theirs.
        const left = summaries?.[place.id] ?? null;
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
            className={`absolute flex items-center gap-[16px] rounded-[20px] border bg-[#141418] px-[20px] text-left shadow-[0_10px_32px_rgba(0,0,0,0.4)] transition-[border-color,transform] duration-300 ${
              on ? 'translate-y-[-2px] border-white/30' : 'border-white/10'
            }`}
            style={{
              left: node.x - CARD_W / 2,
              top: node.y - CARD_H / 2,
              width: CARD_W,
              height: CARD_H,
            }}
          >
            <span
              data-place={place.id}
              className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white"
            >
              <Icon className="size-[26px]" aria-hidden />
            </span>
            <span
              data-place-card={place.id}
              className="flex min-w-0 flex-col gap-[6px]"
            >
              {summaries ? (
                <>
                  <span className="text-[0.6em] leading-none text-white/55">
                    {name}
                  </span>
                  <span className="line-clamp-2 text-[0.85em] leading-tight text-white">
                    {left?.title ?? PLACE_INVITATION[place.id]}
                  </span>
                  {left?.detail && (
                    <span className="truncate text-[0.6em] leading-none text-white/45">
                      {left.detail}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-[0.9em] leading-tight text-white">
                    {name}
                  </span>
                  <span className="text-[0.62em] leading-tight text-white/50">
                    {pickLocalized(place.blurb, language)}
                  </span>
                </>
              )}
            </span>
          </PlaceControl>
        );
      })}
    </div>
  );
};
