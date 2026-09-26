/**
 * SlideStage — the single, surface-agnostic renderer. Every slide kind and
 * every surface (projector, student, teacher, present, and the editor canvas)
 * renders through this file.
 *
 * It fits a fixed 1280×720 design canvas into its container with one uniform
 * transform (so rem type and px positions scale together, no drift), paints the
 * shared frame chrome (glow, optional accent bar, phase chip), then
 * absolutely-positions each ELEMENT at the rect its zone derives from
 * `SLIDE_GRID`. Hidden elements are skipped everywhere — that is how a removed
 * title disappears on every surface at once.
 *
 * Two things it owns that are not elements, because no author writes them:
 *   - the BAND (`RevealBand`), which carries a revealed aggregate or the slide's
 *     live layer — the student's input, the projected question, the showcase
 *     frame. Rule 9 confines interaction ELEMENTS to the 100px footer strip,
 *     which is too small to ask a class a question from.
 *   - `layoutMode: 'reflow'`, the derived reading column a student device gets
 *     below 768px (Rule 11). Same elements, same gating, stacked not placed.
 *
 * `blocks` + `editable` are the LEGACY block path, kept only for callers that
 * still pass `blocks` without `elements`. It carries the old select / move /
 * resize / hide UX. Nothing in the app reaches it any more; it goes when the
 * last `blocks`-only caller does.
 */
import { ArrowDownToLine, ArrowUpToLine, X } from 'lucide-react';
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { STUDENT_PHASE_LABELS } from '../../phases';
import { pickLocalized } from '../../presentation/localized';
import type { Interaction, StudentLanguage } from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import { blockKeyForElement, resolveElements } from '../migrateDeckV1';
import {
  REVEAL_BAND_PADDING,
  resolveElementRects,
  hasBandContent,
  revealBandRect,
} from '../slideGrid';
import {
  applyMove,
  applyResize,
  bringToFront,
  clampRect,
  hideBlock,
  resolveLayout,
  sendToBack,
  SLIDE_CANVAS,
  withBlock,
  type ResizeEdge,
} from '../slideLayout';
import type {
  Slide,
  SlideBlockKey,
  SlideBlockRect,
  SlideElement,
  SlideLayout,
  SlideSurface,
} from '../types';
import { SlideElementView } from './SlideElementView';
import { SlideFrameChrome } from './SlideFrameChrome';
import { SlideReflow } from './SlideReflow';
import { useAutofit } from './useAutofit';
import { useStageScale } from './useStageScale';
import '../slides.css';

/** Blocks whose content fills a fixed box (aspect media); others auto-grow. */
const BOX_KEYS = new Set<SlideBlockKey>(['media', 'sideMedia', 'interaction']);
const defaultZ = (key: SlideBlockKey): number =>
  key === 'media' || key === 'sideMedia' ? 0 : 1;

export interface SlideStageProps {
  slide: Slide;
  surface: SlideSurface;
  language: StudentLanguage;
  /** Rendered content per block; only provided, non-hidden keys are shown. */
  blocks: Partial<Record<SlideBlockKey, ReactNode>>;
  /**
   * A revealed interaction's visualization, injected by the owning surface.
   *
   * Rule 9 keeps interaction ELEMENTS in the 100px footer strip, but a reveal
   * needs a body-sized area — none of bars/wall/words/scale fits 100px. So the
   * reveal is not an element at all: it is a slot the stage paints over the
   * slide's occupied middle band (`revealBandRect`), with a scrim.
   *
   * The band's own blocks do NOT move. Rule 2 promises that showing an
   * interaction never reflows the content above it, so a teacher sharing and
   * un-sharing must not make the class screen jump.
   */
  reveal?: ReactNode;
  /**
   * The slide's live layer BEFORE anything is revealed — the student's input,
   * or the projected question and participation chip. Painted at the same band
   * rect as `reveal`, which replaces it, and only when the band is free
   * (`hasBandContent`): a slide that authored a picture there keeps it.
   */
  bandFallback?: ReactNode;
  /**
   * Interaction ids whose question the band already carries. Their footer
   * elements render nothing, so the question is never on screen twice.
   */
  bandInteractionIds?: readonly string[];
  /**
   * ZONE MODE. When given, the stage lays this slide out from the grid instead
   * of from the legacy block rects — one absolutely-positioned box per zone,
   * rects derived by `resolveElementRects`. This is what makes one renderer
   * serve all six kinds on all four surfaces.
   *
   * The block path below stays until every caller has moved over; the two never
   * run together.
   */
  elements?: SlideElement[];
  /** Resolved interactions for this slide, by id. Zone mode only. */
  interactionsById?: Record<string, Interaction>;
  /** Pre-gated surface slots (input / reveal / launch …). Zone mode only. */
  slots?: SlideSlots;
  /**
   * `'stage'` (default) is the fitted 1280x720 canvas every surface shares.
   * `'reflow'` is the derived single-column reading order for a student device
   * below 768px — the same elements and the same gating, stacked instead of
   * positioned. Rule 11: "Student devices at >=768px render the identical
   * stage, contain-fit. Below that, a derived reflow in zone reading order."
   */
  layoutMode?: 'stage' | 'reflow';
  /**
   * Zone-mode editor substitutes, keyed by block key — the same map the block
   * path uses, so the editor's controls did not have to be rewritten to move
   * the canvas onto the element path.
   */
  zoneOverrides?: Partial<Record<SlideBlockKey, ReactNode>>;
  /**
   * Hide the block behind an element. Without this the canvas had no hide
   * control at all once it left the block path — `HiddenComponentsTray` could
   * only ever un-hide, so a teacher could not remove a title from a full-bleed
   * image slide, and anything already hidden could never be hidden again.
   */
  onHideBlock?: (key: SlideBlockKey) => void;
  /** Mount live players instead of static thumbnails. Zone mode only. */
  playableMedia?: boolean;
  /** Per-phase accent (present surface) → recolors glow + chip dot. */
  accent?: string;
  className?: string;
  // ── editor mode ──
  editable?: boolean;
  selectedBlock?: SlideBlockKey | null;
  onSelectBlock?: (key: SlideBlockKey | null) => void;
  onLayoutChange?: (next: SlideLayout) => void;
}

export const SlideStage = ({
  slide,
  surface,
  language,
  blocks,
  reveal,
  bandFallback,
  bandInteractionIds,
  elements,
  interactionsById,
  slots,
  layoutMode = 'stage',
  zoneOverrides,
  onHideBlock,
  playableMedia = false,
  accent,
  className,
  editable = false,
  selectedBlock = null,
  onSelectBlock,
  onLayoutChange,
}: SlideStageProps) => {
  const { scale, offsetX, offsetY, ref: stageRef } = useStageScale();
  const resolved = resolveLayout(slide);
  // Derive ONCE. `elements` is the caller's list when it has one (the editor
  // will pass an unsaved draft); otherwise fall back to the slide's own. Before
  // this the stage resolved the slide three times per render — here, in the
  // band-occupancy test and again inside RevealBand.
  const zoneElements = useMemo(
    () => elements ?? resolveElements(slide),
    [elements, slide],
  );

  /**
   * Which element an editor override belongs to, when several share a block.
   *
   * `launchTiles` derives ONE element per tile, and they all map back to the
   * same block key — but the editor's override is the whole-row editor. Handing
   * it to every tile element rendered the row editor once per tile: three tiles
   * meant three stacked copies of the same control. The override goes to the
   * FIRST element of its block, and its siblings render nothing, because the
   * control they would each draw already covers all of them.
   */
  const overrideOwner = useMemo(() => {
    const owner = new Map<SlideBlockKey, string>();
    if (!zoneOverrides) return owner;
    for (const element of zoneElements) {
      const key = blockKeyForElement(element, slide.id);
      if (!key || zoneOverrides[key] === undefined || owner.has(key)) continue;
      owner.set(key, element.id);
    }
    return owner;
  }, [zoneOverrides, zoneElements, slide.id]);

  // Whether the band actually paints the QUESTION decides whether the footer
  // element must stand down — and only the stage knows that. The caller used
  // to decide, which meant a slide with a picture in its body suppressed the
  // footer interaction while `hasBandContent` independently suppressed the
  // band: no band, no footer, and a student with no way to answer.
  //
  // A reveal is not the question — it is the aggregate — so the footer keeps
  // showing what was asked while the results are up.
  const bandShowsQuestion =
    Boolean(bandFallback) && !hasBandContent(zoneElements);

  const keys = (Object.keys(blocks) as SlideBlockKey[])
    .filter((k) => blocks[k] != null && resolved[k] && !resolved[k]?.hidden)
    .sort(
      (a, b) =>
        (resolved[a]?.z ?? defaultZ(a)) - (resolved[b]?.z ?? defaultZ(b)),
    );

  const frameStyle: CSSProperties = {
    width: SLIDE_CANVAS.w,
    height: SLIDE_CANVAS.h,
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
    transformOrigin: 'top left',
    ...(accent ? ({ '--slide-accent': accent } as CSSProperties) : {}),
  };

  if (layoutMode === 'reflow' && elements) {
    return (
      <SlideReflow
        slide={slide}
        surface={surface}
        language={language}
        elements={zoneElements}
        interactionsById={interactionsById ?? {}}
        slots={slots}
        playableMedia={playableMedia}
        accent={accent}
        band={reveal ?? (bandShowsQuestion ? bandFallback : null)}
        bandInteractionIds={
          bandShowsQuestion || reveal ? bandInteractionIds : undefined
        }
      />
    );
  }

  return (
    <div
      ref={stageRef}
      className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
    >
      <div
        data-surface={surface}
        // `variant` is a PUBLISHED field on a content slide, and the type-scale
        // rules keyed on `.slide-frame--welcome` in slides.css (5.5rem title on
        // a projector) are the only thing that reads it. The deleted SlideFrame
        // applied this class; the stage has to keep doing so or every welcome
        // slide silently drops to the ordinary title size.
        className={`slide-frame absolute left-0 top-0 ${
          slide.kind === 'content' && slide.variant && slide.variant !== 'plain'
            ? `slide-frame--${slide.variant}`
            : ''
        }`}
        style={frameStyle}
        onPointerDown={editable ? () => onSelectBlock?.(null) : undefined}
      >
        <SlideFrameChrome slide={slide} language={language} />
        {reveal ? (
          <RevealBand elements={zoneElements} scrim>
            {reveal}
          </RevealBand>
        ) : bandShowsQuestion ? (
          <RevealBand elements={zoneElements}>{bandFallback}</RevealBand>
        ) : null}
        {elements
          ? resolveElementRects(zoneElements).map(({ element, rect }) => (
              <ZoneBox
                key={element.id}
                element={element}
                rect={rect}
                selected={
                  editable &&
                  selectedBlock !== null &&
                  blockKeyForElement(element, slide.id) === selectedBlock
                }
                onSelect={
                  editable && onSelectBlock
                    ? () => {
                        const key = blockKeyForElement(element, slide.id);
                        if (key) onSelectBlock(key);
                      }
                    : undefined
                }
                onHide={
                  editable && onHideBlock
                    ? () => {
                        const key = blockKeyForElement(element, slide.id);
                        // `title` is required on every slide and some presets
                        // hide it themselves; everything else is the teacher's
                        // to remove.
                        if (key) onHideBlock(key);
                      }
                    : undefined
                }
              >
                <SlideElementView
                  element={element}
                  surface={surface}
                  language={language}
                  interactionsById={interactionsById ?? {}}
                  hiddenInteractionIds={
                    bandShowsQuestion ? bandInteractionIds : undefined
                  }
                  override={resolveOverride(
                    element,
                    slide.id,
                    zoneOverrides,
                    overrideOwner,
                  )}
                  slots={slots}
                  playableMedia={playableMedia}
                  phaseLabel={pickLocalized(
                    STUDENT_PHASE_LABELS[slide.phase],
                    language,
                  )}
                />
              </ZoneBox>
            ))
          : null}
        {elements
          ? null
          : keys.map((key) => (
              <BlockBox
                key={key}
                blockKey={key}
                rect={resolved[key] as SlideBlockRect}
                box={BOX_KEYS.has(key)}
                z={resolved[key]?.z ?? defaultZ(key)}
                editable={editable}
                selected={selectedBlock === key}
                scale={scale || 1}
                onSelect={() => onSelectBlock?.(key)}
                onCommit={(rect) =>
                  onLayoutChange?.(withBlock(slide.layout, key, rect))
                }
                onHide={() => onLayoutChange?.(hideBlock(slide, key))}
                onFront={() => onLayoutChange?.(bringToFront(slide, key))}
                onBack={() => onLayoutChange?.(sendToBack(slide, key))}
              >
                {blocks[key]}
              </BlockBox>
            ))}
      </div>
    </div>
  );
};

const HANDLES: { edges: ResizeEdge[]; cls: string; cursor: string }[] = [
  {
    edges: ['n'],
    cls: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
    cursor: 'ns-resize',
  },
  {
    edges: ['s'],
    cls: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
    cursor: 'ns-resize',
  },
  {
    edges: ['e'],
    cls: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
    cursor: 'ew-resize',
  },
  {
    edges: ['w'],
    cls: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
    cursor: 'ew-resize',
  },
  {
    edges: ['n', 'w'],
    cls: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    cursor: 'nwse-resize',
  },
  {
    edges: ['n', 'e'],
    cls: 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    cursor: 'nesw-resize',
  },
  {
    edges: ['s', 'w'],
    cls: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
    cursor: 'nesw-resize',
  },
  {
    edges: ['s', 'e'],
    cls: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    cursor: 'nwse-resize',
  },
];

interface BlockBoxProps {
  blockKey: SlideBlockKey;
  rect: SlideBlockRect;
  box: boolean;
  z: number;
  editable: boolean;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onCommit: (rect: SlideBlockRect) => void;
  onHide: () => void;
  onFront: () => void;
  onBack: () => void;
  children: ReactNode;
}

const BlockBox = ({
  rect,
  box,
  z,
  editable,
  selected,
  scale,
  onSelect,
  onCommit,
  onHide,
  onFront,
  onBack,
  children,
}: BlockBoxProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    mode: 'move' | ResizeEdge[];
    sx: number;
    sy: number;
    base: SlideBlockRect;
  } | null>(null);
  const [live, setLive] = useState<SlideBlockRect | null>(null);
  const shown = live ?? rect;

  // Chrome is drawn in design-space, so divide by scale to render ~constant px.
  const px = (n: number) => n / scale;

  const begin =
    (mode: 'move' | ResizeEdge[]) => (e: ReactPointerEvent<HTMLElement>) => {
      if (!editable) return;
      e.stopPropagation();
      e.preventDefault();
      onSelect();
      rootRef.current?.setPointerCapture(e.pointerId);
      dragRef.current = { mode, sx: e.clientX, sy: e.clientY, base: rect };
      setLive(rect);
    };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale;
    const dy = (e.clientY - d.sy) / scale;
    const next =
      d.mode === 'move'
        ? applyMove(d.base, dx, dy)
        : applyResize(d.base, d.mode, dx, dy);
    setLive(clampRect(next));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    rootRef.current?.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    if (live) onCommit(live);
    setLive(null);
  };

  const style: CSSProperties = {
    position: 'absolute',
    left: shown.x,
    top: shown.y,
    width: shown.w,
    [box ? 'height' : 'minHeight']: shown.h,
    zIndex: selected ? 1000 : z,
  };

  return (
    <div
      ref={rootRef}
      style={style}
      onPointerMove={editable ? onPointerMove : undefined}
      onPointerUp={editable ? endDrag : undefined}
      onPointerDown={
        editable
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
      className={
        editable
          ? `outline-dashed outline-offset-2 ${selected ? 'outline-2 outline-[#7ecfcf]' : 'outline-1 outline-white/15 hover:outline-white/40'}`
          : undefined
      }
    >
      {children}

      {editable && selected && (
        <>
          {/* Move bar + actions, floated above the block. */}
          <div
            className="absolute left-0 flex items-center gap-1 rounded-md bg-[#7ecfcf] text-black"
            style={{
              top: -px(30),
              height: px(26),
              paddingLeft: px(6),
              paddingRight: px(4),
              gap: px(4),
              fontSize: px(13),
            }}
          >
            <span
              onPointerDown={begin('move')}
              className="cursor-grab select-none active:cursor-grabbing"
              style={{ paddingRight: px(4) }}
              aria-label="Move block"
            >
              ⠿
            </span>
            <button
              type="button"
              onClick={onBack}
              aria-label="Send to back"
              className="grid place-items-center rounded hover:bg-black/10"
              style={{ width: px(20), height: px(20) }}
            >
              <ArrowDownToLine style={{ width: px(13), height: px(13) }} />
            </button>
            <button
              type="button"
              onClick={onFront}
              aria-label="Bring to front"
              className="grid place-items-center rounded hover:bg-black/10"
              style={{ width: px(20), height: px(20) }}
            >
              <ArrowUpToLine style={{ width: px(13), height: px(13) }} />
            </button>
            <button
              type="button"
              onClick={onHide}
              aria-label="Hide block"
              className="grid place-items-center rounded hover:bg-black/10"
              style={{ width: px(20), height: px(20) }}
            >
              <X style={{ width: px(14), height: px(14) }} />
            </button>
          </div>

          {/* 8 resize handles. */}
          {HANDLES.map((h) => (
            <span
              key={h.edges.join('')}
              onPointerDown={begin(h.edges)}
              className={`absolute rounded-full border border-[#7ecfcf] bg-white ${h.cls}`}
              style={{
                width: px(12),
                height: px(12),
                cursor: h.cursor,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

/**
 * The editor control for this element, or undefined.
 *
 * `null` (rather than undefined) for a non-owning sibling of a block whose
 * override was already placed — `SlideElementView` returns any non-undefined
 * override as-is, so `null` renders nothing and the sibling stays silent.
 */
const resolveOverride = (
  element: SlideElement,
  slideId: string,
  zoneOverrides: Partial<Record<SlideBlockKey, ReactNode>> | undefined,
  owner: Map<SlideBlockKey, string>,
): ReactNode | undefined => {
  if (!zoneOverrides) return undefined;
  const key = blockKeyForElement(element, slideId);
  if (!key) return undefined;
  const node = zoneOverrides[key];
  if (node === undefined) return undefined;
  return owner.get(key) === element.id ? node : null;
};

/**
 * One element, positioned at its zone rect.
 *
 * Text zones autofit (see `useAutofit`): the grid's heights come from the
 * teacher's monolingual decks and Rule 10 stacks both languages in the same
 * zone, so a bilingual title needs ~136px in a 104px band. Media and
 * interaction elements are NOT autofit — a picture scaled to 0.55 is just a
 * small picture in a big empty box, and an interaction element is already
 * sized to the footer strip.
 */
const ZoneBox = ({
  element,
  rect,
  children,
  selected = false,
  onSelect,
  onHide,
}: {
  element: SlideElement;
  rect: { x: number; y: number; w: number; h: number };
  children: ReactNode;
  /** Editor: this zone is the one the format menu acts on. */
  selected?: boolean;
  onSelect?: () => void;
  /** Editor: remove this block from the slide (a flag, never a delete). */
  onHide?: () => void;
}) => {
  const fits = element.kind === 'text' || element.kind === 'checklist';
  const { ref, scale } = useAutofit();

  return (
    <div
      data-zone={element.zone}
      data-element-id={element.id}
      className={`absolute flex flex-col overflow-hidden ${
        onSelect
          ? 'cursor-text rounded-lg ring-offset-2 ring-offset-transparent'
          : ''
      } ${selected ? 'ring-2 ring-[var(--slide-accent,#7ecfcf)]' : ''}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        ...(element.z !== undefined ? { zIndex: element.z } : {}),
      }}
      onPointerDown={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect();
            }
          : undefined
      }
    >
      {onHide && selected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHide();
          }}
          aria-label="Hide this block"
          title="Hide — the text is kept and can be restored from the tray"
          className="absolute right-1 top-1 z-20 grid size-6 place-items-center rounded-full bg-black/70 text-white/70 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {fits ? (
        <div
          ref={ref}
          data-autofit={scale < 1 ? scale.toFixed(3) : undefined}
          className="flex flex-col"
          style={{
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'top left',
            width: '100%',
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

/**
 * The reveal overlay: a scrim plus the injected visualization, painted at the
 * slide's middle band.
 *
 * The rect comes from `revealBandRect(elements)`, so it is the
 * same derivation on every surface — which is what makes the Capstone's
 * "teacher-Present and the projector agree zone for zone" true by construction
 * rather than by coincidence.
 */
const RevealBand = ({
  elements,
  children,
  scrim = false,
}: {
  /**
   * The SAME resolved element list the stage laid out, not `slide.elements`.
   * Re-deriving here would let the band's geometry come from the stored slide
   * while the content came from the caller's list — so an editor previewing an
   * unsaved layout would paint the reveal at the old slide's band.
   */
  elements: readonly SlideElement[];
  children: ReactNode;
  /** A reveal covers the band's own elements, so it darkens them. The
   *  pre-reveal live layer only ever paints an empty band, so it does not. */
  scrim?: boolean;
}) => {
  const rect = revealBandRect(elements);
  return (
    <div
      data-reveal-band
      className={`absolute flex items-center justify-center overflow-hidden rounded-2xl ${
        scrim ? 'bg-black/70 backdrop-blur-sm' : ''
      }`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        // Above every block, below the editor chrome (which uses 1000).
        zIndex: 900,
      }}
    >
      <div
        className="h-full w-full overflow-hidden"
        style={{ padding: REVEAL_BAND_PADDING }}
      >
        {children}
      </div>
    </div>
  );
};
