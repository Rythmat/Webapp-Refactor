/**
 * SlideStage — the single, surface-agnostic freeform renderer. It fits a fixed
 * 1280×720 design canvas into its container with one uniform transform (so rem
 * type + px positions scale together, no drift), paints the shared frame chrome
 * (glow + phase chip), then absolutely-positions each provided block at its
 * resolved rect (stored layout merged over the kind default). Hidden blocks are
 * skipped everywhere — this is how a removed title disappears on every surface.
 *
 * In `editable` mode each block gains a select → move-bar / 8 resize-handles /
 * hide UX (pointer-capture math divided by the live scale). All editor chrome is
 * gated behind `editable`; publish/live surfaces never pass it, so it can't leak.
 */
import { ArrowDownToLine, ArrowUpToLine, X } from 'lucide-react';
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { StudentLanguage } from '../../types';
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
  SlideLayout,
  SlideSurface,
} from '../types';
import { SlideFrameChrome } from './SlideFrameChrome';
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
  accent,
  className,
  editable = false,
  selectedBlock = null,
  onSelectBlock,
  onLayoutChange,
}: SlideStageProps) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const { scale, offsetX, offsetY } = useStageScale(outerRef);
  const resolved = resolveLayout(slide);

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

  return (
    <div
      ref={outerRef}
      className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
    >
      <div
        data-surface={surface}
        className="slide-frame absolute left-0 top-0"
        style={frameStyle}
        onPointerDown={editable ? () => onSelectBlock?.(null) : undefined}
      >
        <SlideFrameChrome slide={slide} language={language} />
        {keys.map((key) => (
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
