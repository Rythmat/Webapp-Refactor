import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/components/utilities';
import { swallowNativeMenu } from '@/daw/commands/clipCommands';
import { SECTION_DRAG_SCOPE, SECTIONS_SCOPE } from '@/daw/commands/keymaps';
import { useKeymap, type KeymapHandlers } from '@/daw/commands/registry';
import { pauseFollow } from '@/daw/editor/follow';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import {
  resizeSectionEdge,
  sectionTypeInfo,
  type SongSection,
} from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { pixelToTick, tickToPixel } from '@/daw/utils/timelineScale';
import { useCanvasMenuStore } from '../clipMenu/canvasMenuStore';
import { SECTIONS_LANE_PX } from '../../tracklist/rowLayout';
import { AddSectionMenu } from './AddSectionMenu';
import {
  deleteSection,
  duplicateSection,
  renameSection,
  seekToSection,
  stepSectionEnd,
} from './sectionActions';

// ── The sections lane (milestone 2.13) ─────────────────────────────────────
//
// The song's form, above the ruler, in the row Create's toolbar had (decision
// 16, ST4): neutral blocks placed end to end, + Section after the last one.
// A click on a section goes to its start; dragging either edge resizes it on
// bar lines, and an edge two sections share moves both. A right-click, or
// Alt+Return, opens its menu (the canvas's one menu). The blocks are buttons
// in one Tab stop: the arrows move between them (the 'sections' scope).
//
// It is drawn in the page rather than on the timeline's canvas, so every
// section has a name and a focus; the lane scrolls with the timeline by a
// transform the store's scroll writes straight to, without a render. The
// lane clips rather than scrolls, and focus never scrolls it: a block that
// gets focus off screen is brought into view by scrolling the timeline, so
// the blocks always line up with the ruler under them.

/** How far a press may move and still be a click. */
const CLICK_SLOP_PX = 3;
/** The grab zone at each end of a block. */
const EDGE_PX = 8;
/** Room for + Section's button when it sits after the last section. */
const ADD_GAP_PX = 4;
/** Where a section the keys bring into view starts, from the lane's left. */
const REVEAL_PX = EDGE_PX * 4;
/** One wheel step of zoom: the timeline's own, so both zoom alike. */
const WHEEL_ZOOM_STEP = 0.03;

interface EdgeDrag {
  id: string;
  /** Puts the edge back and lets the pointer go, storing nothing. */
  cancel: () => void;
}

/** "bars 9 to 16": a section's bars, counted from 1 as the ruler counts. */
function barsText(section: SongSection, bar: number): string {
  const first = Math.floor(section.startTick / bar) + 1;
  const last = Math.max(first, Math.ceil(section.endTick / bar));
  return first === last ? `bar ${first}` : `bars ${first} to ${last}`;
}

/** The section whose block `target` is in, inside `lane`. */
function sectionIdOf(
  lane: HTMLElement | null,
  target: EventTarget | null,
): string | null {
  if (!(target instanceof Element)) return null;
  const block = target.closest<HTMLElement>('[data-section-id]');
  return block && lane?.contains(block) ? block.dataset.sectionId! : null;
}

/** Focus that scrolls nothing: the timeline's scroll places the lane. */
function focusInPlace(el: HTMLElement | null | undefined): void {
  el?.focus({ preventScroll: true });
}

export const SectionsLane = memo(function SectionsLane() {
  const stored = useStore((s) => s.sections);
  const zoom = useStore((s) => s.timelineZoom);
  const numerator = useStore((s) => s.timeSignatureNumerator);
  const denominator = useStore((s) => s.timeSignatureDenominator);
  const bar = ticksPerBar({ numerator, denominator });

  const laneRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);
  /** The sections while an edge is dragged: shown, not yet stored. */
  const [preview, setPreview] = useState<SongSection[] | null>(null);
  const dragRef = useRef<EdgeDrag | null>(null);
  /** The section that has the lane's one Tab stop. */
  const [current, setCurrent] = useState<string | null>(null);

  const sections = preview ?? stored;
  const lastEnd = sections.reduce((end, s) => Math.max(end, s.endTick), 0);
  const tabStop =
    current && sections.some((s) => s.id === current)
      ? current
      : (sections[0]?.id ?? null);

  // The lane is as wide as the lanes under it.
  useLayoutEffect(() => {
    const lane = laneRef.current;
    if (!lane) return;
    setWidth(lane.clientWidth);
    const observer = new ResizeObserver(() => setWidth(lane.clientWidth));
    observer.observe(lane);
    return () => observer.disconnect();
  }, []);

  // The blocks scroll with the timeline, and + Section stays in view after
  // the last one: both follow the store's scroll without a render.
  const place = useCallback(
    (scrollLeft: number) => {
      const layer = layerRef.current;
      if (layer) layer.style.transform = `translateX(${-scrollLeft}px)`;
      const add = addRef.current;
      if (!add) return;
      const after =
        lastEnd > 0 ? tickToPixel(lastEnd, zoom, scrollLeft) + ADD_GAP_PX : 0;
      const max = Math.max(0, width - add.offsetWidth);
      add.style.left = `${Math.min(max, Math.max(0, after))}px`;
    },
    [lastEnd, zoom, width],
  );
  useLayoutEffect(() => {
    place(useStore.getState().timelineScrollLeft);
    return useStore.subscribe((s) => s.timelineScrollLeft, place);
  }, [place]);

  const tickAt = (clientX: number) => {
    const lane = laneRef.current;
    const left = lane ? lane.getBoundingClientRect().left : 0;
    return pixelToTick(
      clientX - left,
      zoom,
      useStore.getState().timelineScrollLeft,
    );
  };

  const blockOf = (id: string) =>
    laneRef.current?.querySelector<HTMLElement>(
      `[data-section-id="${CSS.escape(id)}"]`,
    ) ?? null;

  /**
   * Scrolls the timeline (never the lane) to a section that is out of view:
   * for the keys, one whose start is; for a focus from Tab or a menu, one
   * with nothing in view, so a click on a long section never jumps.
   */
  const reveal = (id: string, when: 'startHidden' | 'allHidden') => {
    const lane = laneRef.current;
    const s = useStore.getState();
    const section = s.sections.find((x) => x.id === id);
    if (!lane || !section) return;
    const start = tickToPixel(section.startTick, s.timelineZoom, 0);
    const end = tickToPixel(section.endTick, s.timelineZoom, 0);
    const left = s.timelineScrollLeft;
    const right = left + lane.clientWidth;
    const hidden =
      when === 'startHidden'
        ? start < left || start > right - REVEAL_PX
        : end <= left || start >= right;
    if (!hidden) return;
    pauseFollow();
    s.setTimelineScrollLeft(Math.max(0, start - REVEAL_PX));
  };

  const focusSection = (id: string) => {
    setCurrent(id);
    requestAnimationFrame(() => {
      // The timeline first, so the block is where it will stay; then a
      // focus that scrolls nothing.
      reveal(id, 'startHidden');
      focusInPlace(blockOf(id));
    });
  };
  const focusAdd = () =>
    requestAnimationFrame(() => focusInPlace(addRef.current));

  /**
   * Where focus goes when a section has gone (deleted from its menu, or by
   * someone else while the menu was open): the section after it, else the
   * one before, else + Section, so the next key still acts in the lane.
   */
  const neighbourAt = (tick: number): HTMLElement | null => {
    const all = useStore.getState().sections;
    const next =
      all.find((x) => x.startTick >= tick) ??
      [...all].reverse().find((x) => x.startTick < tick);
    return (next && blockOf(next.id)) ?? addRef.current;
  };

  /**
   * A key's menu hangs from the part of the block in view: a long section
   * scrolled partly away still opens its menu on screen.
   */
  const keyAnchor = (block: HTMLElement) => {
    const box = block.getBoundingClientRect();
    const lane = laneRef.current?.getBoundingClientRect();
    const x = lane
      ? Math.max(lane.left, Math.min(box.left, lane.right - EDGE_PX))
      : box.left;
    return { x, y: box.top, width: 0, height: box.height };
  };

  const openMenu = (
    id: string,
    block: HTMLElement,
    source: 'pointer' | 'key',
    point?: { x: number; y: number },
  ) => {
    const section = useStore.getState().sections.find((s) => s.id === id);
    if (!section) return;
    useCanvasMenuStore.getState().open({
      target: { kind: 'section', sectionId: id, tick: section.startTick },
      anchor: point
        ? { x: point.x, y: point.y, width: 0, height: 0 }
        : keyAnchor(block),
      source,
      playheadTick: getPlayheadTick(),
      returnFocus: block,
      returnFocusFallback: () => neighbourAt(section.startTick),
    });
  };

  // ── Pointer ──

  const onBlockPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    section: SongSection,
  ) => {
    // On a Mac, Ctrl+click is the right-click: the menu opens, nothing moves.
    if (e.button !== 0 || e.ctrlKey) return;
    const edge = (e.target as HTMLElement).closest<HTMLElement>('[data-edge]')
      ?.dataset.edge as 'start' | 'end' | undefined;
    const block = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    setCurrent(section.id);

    if (edge) {
      // An edge: resize on bar lines, shown as it moves, stored on release.
      // The edge moves as far as the pointer does from where it was
      // grabbed, and only once the pointer has moved more than a click
      // does: at narrow bars a block is nearly all edge, and a click on it
      // goes to the section, as on its body.
      e.preventDefault();
      block.setPointerCapture(pointerId);
      const ts = timeSignatureOf(useStore.getState());
      const from = edge === 'start' ? section.startTick : section.endTick;
      const grabbed = tickAt(startX);
      const edgeAt = (clientX: number) => from + tickAt(clientX) - grabbed;
      let moved = false;
      const stop = () => {
        block.removeEventListener('pointermove', onMove);
        block.removeEventListener('pointerup', onEnd);
        block.removeEventListener('pointercancel', onEnd);
        if (block.hasPointerCapture(pointerId)) {
          block.releasePointerCapture(pointerId);
        }
        dragRef.current = null;
        setPreview(null);
      };
      const onMove = (m: globalThis.PointerEvent) => {
        if (m.pointerId !== pointerId) return;
        if (!moved && Math.abs(m.clientX - startX) <= CLICK_SLOP_PX) return;
        moved = true;
        setPreview(
          resizeSectionEdge(
            useStore.getState().sections,
            section.id,
            edge,
            edgeAt(m.clientX),
            ts,
          ),
        );
      };
      const onEnd = (u: globalThis.PointerEvent) => {
        if (u.pointerId !== pointerId) return;
        stop();
        if (u.type === 'pointercancel') return;
        if (!moved && Math.abs(u.clientX - startX) <= CLICK_SLOP_PX) {
          seekToSection(section.id);
          return;
        }
        const tick = edgeAt(u.clientX);
        const s = useStore.getState();
        if (
          resizeSectionEdge(s.sections, section.id, edge, tick, ts) ===
          s.sections
        ) {
          return;
        }
        withTransaction('Resize section', () =>
          useStore.getState().resizeSection(section.id, edge, tick),
        );
      };
      dragRef.current = { id: section.id, cancel: stop };
      block.addEventListener('pointermove', onMove);
      block.addEventListener('pointerup', onEnd);
      block.addEventListener('pointercancel', onEnd);
      return;
    }

    // The body: a click goes to the section's start.
    const onUp = (u: globalThis.PointerEvent) => {
      if (u.pointerId !== pointerId) return;
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (u.type === 'pointercancel') return;
      if (Math.abs(u.clientX - startX) <= CLICK_SLOP_PX) {
        seekToSection(section.id);
      }
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const onBlockContextMenu = (
    e: ReactMouseEvent<HTMLButtonElement>,
    section: SongSection,
  ) => {
    e.preventDefault();
    setCurrent(section.id);
    openMenu(section.id, e.currentTarget, 'pointer', {
      x: e.clientX,
      y: e.clientY,
    });
  };

  // The wheel over the lane does what it does over the lanes under it: a
  // sideways scroll scrolls the timeline, and Ctrl or ⌘ with the wheel (a
  // trackpad pinch too) zooms it at the pointer instead of zooming the
  // page. React's wheel listener can't keep the page's zoom away (it is
  // passive), so this one is the lane's own.
  useEffect(() => {
    const lane = laneRef.current;
    if (!lane) return;
    const onWheel = (e: WheelEvent) => {
      const s = useStore.getState();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        pauseFollow();
        const x = e.clientX - lane.getBoundingClientRect().left;
        s.zoomAtPoint(
          e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP,
          x + s.timelineScrollLeft,
        );
        return;
      }
      const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
      if (dx === 0) return;
      pauseFollow();
      s.setTimelineScrollLeft(Math.max(0, s.timelineScrollLeft + dx));
    };
    lane.addEventListener('wheel', onWheel, { passive: false });
    return () => lane.removeEventListener('wheel', onWheel);
  }, []);

  // Escape while an edge is dragged puts it back, and does nothing else: it
  // is a dialog-level key while the drag lasts, so it never reaches Stop.
  useKeymap(
    SECTION_DRAG_SCOPE.id,
    {
      'sectionDrag.cancel': () => {
        const drag = dragRef.current;
        if (!drag) return false;
        drag.cancel();
      },
    },
    { active: preview !== null },
  );

  // ── Keys ──

  const ids = () => useStore.getState().sections.map((s) => s.id);
  /**
   * A section key: on a section it acts on it. Anywhere else in the lane
   * (+ Section) `off` runs instead and the key stops there, so Backspace on
   * + Section never deletes the selected clip; 'pass' lets it go on (Return
   * is + Section's own).
   */
  const onSection =
    (
      act: (id: string, e: KeyboardEvent) => void,
      off: (() => void) | 'pass' = () => {},
    ) =>
    (e: KeyboardEvent) => {
      const id = sectionIdOf(laneRef.current, e.target);
      if (id) {
        act(id, e);
        return;
      }
      if (off === 'pass') return false;
      off();
    };
  const move = (
    pick: (index: number, count: number) => number,
    off?: () => void,
  ) =>
    onSection((id) => {
      const all = ids();
      const next =
        all[
          Math.max(
            0,
            Math.min(all.length - 1, pick(all.indexOf(id), all.length)),
          )
        ];
      if (next) focusSection(next);
    }, off);
  /** From + Section, ← and End go back to the last section. */
  const toLast = () => {
    const all = ids();
    const last = all[all.length - 1];
    if (last) focusSection(last);
  };
  const toFirst = () => {
    const first = ids()[0];
    if (first) focusSection(first);
  };
  const handlers: KeymapHandlers = {
    'sections.previous': move((i) => i - 1, toLast),
    'sections.next': move((i) => i + 1),
    'sections.first': move(() => 0, toFirst),
    'sections.last': move((_, n) => n - 1, toLast),
    'sections.seek': onSection((id) => seekToSection(id), 'pass'),
    'sections.longer': onSection((id) => stepSectionEnd(id, 1)),
    'sections.shorter': onSection((id) => stepSectionEnd(id, -1)),
    'sections.rename': onSection((id) => void renameSection(id)),
    'sections.duplicate': onSection((id) => {
      duplicateSection(id);
    }),
    'sections.delete': onSection((id) => {
      const all = ids();
      const index = all.indexOf(id);
      deleteSection(id);
      const next = all[index + 1] ?? all[index - 1];
      // The last one gone: + Section keeps the focus in the lane.
      if (next) focusSection(next);
      else focusAdd();
    }),
    'sections.menu': onSection((id, e) => {
      const block = (e.target as Element).closest<HTMLElement>(
        '[data-section-id]',
      );
      if (!block) return;
      if (e.code === 'ContextMenu') swallowNativeMenu();
      openMenu(id, block, 'key');
    }, 'pass'),
  };
  useKeymap(SECTIONS_SCOPE.id, handlers, { element: laneRef });

  return (
    <div
      ref={laneRef}
      role="group"
      aria-label="Song sections"
      data-testid="sections-lane"
      // Clipped, not a scroll container: nothing can scroll it away from
      // the ruler.
      className="relative h-full min-w-0 overflow-clip"
    >
      <div
        ref={layerRef}
        className="absolute inset-y-0 left-0 will-change-transform"
      >
        {sections.map((section) => {
          const left = tickToPixel(section.startTick, zoom, 0);
          const blockWidth = Math.max(
            1,
            tickToPixel(section.endTick, zoom, 0) - left,
          );
          const info = sectionTypeInfo(section.type);
          const bars = barsText(section, bar);
          return (
            <button
              key={section.id}
              type="button"
              data-testid="section-block"
              data-section-id={section.id}
              data-section-type={section.type}
              aria-label={`${section.label}, ${bars}`}
              tabIndex={section.id === tabStop ? 0 : -1}
              className={cn(
                'group absolute top-0 flex items-center overflow-hidden rounded-[var(--daw-radius-sm)] border !border-daw-outline bg-daw-chip text-left text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
                TYPE_CLASS.label,
                TRANSITION,
                FOCUS_RING,
                // Inside the block: the lane is 24 px and clips, so a ring
                // drawn outside would be cut off.
                'focus-visible:outline-offset-[-2px]',
              )}
              // The lane's full height: a 24 px target (decision 2).
              style={{
                left,
                width: blockWidth,
                height: SECTIONS_LANE_PX,
              }}
              onPointerDown={(e) => onBlockPointerDown(e, section)}
              onContextMenu={(e) => onBlockContextMenu(e, section)}
              onDoubleClick={() => void renameSection(section.id)}
              onFocus={() => {
                setCurrent(section.id);
                reveal(section.id, 'allHidden');
              }}
            >
              {/* The tip hangs from the name, not the whole block: a long
                  section's would be pushed to the window's edge, over the
                  timeline's controls. */}
              <Tooltip
                content={`${section.label} · ${bars}. ${info.purpose}`}
                side="bottom"
              >
                <span
                  data-testid="section-name"
                  className="min-w-0 truncate px-2 font-bold"
                >
                  {section.label}
                </span>
              </Tooltip>
              <span
                aria-hidden
                data-edge="start"
                className="absolute inset-y-0 left-0 cursor-ew-resize"
                style={{ width: EDGE_PX }}
              >
                <span className="absolute inset-y-1 left-0.5 w-0.5 rounded-full bg-daw-text-3 opacity-0 group-hover:opacity-100" />
              </span>
              <span
                aria-hidden
                data-edge="end"
                className="absolute inset-y-0 right-0 cursor-ew-resize"
                style={{ width: EDGE_PX }}
              >
                <span className="absolute inset-y-1 right-0.5 w-0.5 rounded-full bg-daw-text-3 opacity-0 group-hover:opacity-100" />
              </span>
            </button>
          );
        })}
      </div>
      <AddSectionMenu ref={addRef} onAdded={focusSection} />
    </div>
  );
});
