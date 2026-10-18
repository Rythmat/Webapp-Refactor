import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { cn } from '@/components/utilities';
import { SECTIONS_SCOPE } from '@/daw/commands/keymaps';
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
import { anchorOf, useCanvasMenuStore } from '../clipMenu/canvasMenuStore';
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
// transform the store's scroll writes straight to, without a render.

/** How far a press may move and still be a click. */
const CLICK_SLOP_PX = 3;
/** The grab zone at each end of a block. */
const EDGE_PX = 8;
/** Room for + Section's button when it sits after the last section. */
const ADD_GAP_PX = 4;

interface EdgeDrag {
  id: string;
  edge: 'start' | 'end';
  pointerId: number;
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

  const focusSection = (id: string) => {
    setCurrent(id);
    requestAnimationFrame(() => {
      const block = laneRef.current?.querySelector<HTMLElement>(
        `[data-section-id="${CSS.escape(id)}"]`,
      );
      block?.focus();
      // Bring it into view when the timeline has it scrolled away.
      const section = useStore.getState().sections.find((s) => s.id === id);
      if (!section || !laneRef.current) return;
      const s = useStore.getState();
      const x = tickToPixel(section.startTick, s.timelineZoom, 0);
      const lane = laneRef.current.clientWidth;
      if (
        x < s.timelineScrollLeft ||
        x > s.timelineScrollLeft + lane - EDGE_PX * 4
      ) {
        pauseFollow();
        s.setTimelineScrollLeft(Math.max(0, x - EDGE_PX * 4));
      }
    });
  };

  const openMenu = (
    id: string,
    anchorEl: HTMLElement,
    source: 'pointer' | 'key',
    point?: { x: number; y: number },
  ) => {
    const section = useStore.getState().sections.find((s) => s.id === id);
    if (!section) return;
    useCanvasMenuStore.getState().open({
      target: { kind: 'section', sectionId: id, tick: section.startTick },
      anchor: point
        ? { x: point.x, y: point.y, width: 0, height: 0 }
        : anchorOf(anchorEl),
      source,
      playheadTick: getPlayheadTick(),
      returnFocus: anchorEl,
    });
  };

  // ── Pointer ──

  const onBlockPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    section: SongSection,
  ) => {
    if (e.button !== 0) return;
    const edge = (e.target as HTMLElement).closest<HTMLElement>('[data-edge]')
      ?.dataset.edge as 'start' | 'end' | undefined;
    const block = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    setCurrent(section.id);

    if (edge) {
      // An edge: resize on bar lines, shown as it moves, stored on release.
      e.preventDefault();
      block.setPointerCapture(pointerId);
      dragRef.current = { id: section.id, edge, pointerId };
      const ts = timeSignatureOf(useStore.getState());
      const onMove = (m: globalThis.PointerEvent) => {
        if (m.pointerId !== pointerId) return;
        const next = resizeSectionEdge(
          useStore.getState().sections,
          section.id,
          edge,
          tickAt(m.clientX),
          ts,
        );
        setPreview(next === useStore.getState().sections ? null : next);
      };
      const onEnd = (u: globalThis.PointerEvent) => {
        if (u.pointerId !== pointerId) return;
        block.removeEventListener('pointermove', onMove);
        block.removeEventListener('pointerup', onEnd);
        block.removeEventListener('pointercancel', onEnd);
        dragRef.current = null;
        setPreview(null);
        if (u.type === 'pointercancel') return;
        const tick = tickAt(u.clientX);
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

  // A sideways scroll over the lane scrolls the timeline, as over the lanes.
  const onWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX;
    if (dx === 0) return;
    pauseFollow();
    const s = useStore.getState();
    s.setTimelineScrollLeft(Math.max(0, s.timelineScrollLeft + dx));
  };

  // Escape while dragging an edge puts it back.
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !dragRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const lane = laneRef.current;
      const block = lane?.querySelector<HTMLElement>(
        `[data-section-id="${CSS.escape(dragRef.current.id)}"]`,
      );
      block?.releasePointerCapture(dragRef.current.pointerId);
      block?.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: dragRef.current.pointerId,
        }),
      );
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () =>
      window.removeEventListener('keydown', onKey, { capture: true });
  }, [preview]);

  // ── Keys ──

  const ids = () => useStore.getState().sections.map((s) => s.id);
  const onSection =
    (act: (id: string, e: KeyboardEvent) => void) => (e: KeyboardEvent) => {
      const id = sectionIdOf(laneRef.current, e.target);
      if (!id) return false;
      act(id, e);
    };
  const move = (pick: (index: number, count: number) => number) =>
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
    });
  const handlers: KeymapHandlers = {
    'sections.previous': move((i) => i - 1),
    'sections.next': move((i) => i + 1),
    'sections.first': move(() => 0),
    'sections.last': move((_, n) => n - 1),
    'sections.seek': onSection((id) => seekToSection(id)),
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
      if (next) focusSection(next);
    }),
    'sections.menu': onSection((id, e) => {
      const block = (e.target as Element).closest<HTMLElement>(
        '[data-section-id]',
      );
      if (block) openMenu(id, block, 'key');
    }),
  };
  useKeymap(SECTIONS_SCOPE.id, handlers, { element: laneRef });

  return (
    <div
      ref={laneRef}
      role="group"
      aria-label="Song sections"
      data-testid="sections-lane"
      className="relative h-full min-w-0 overflow-hidden"
      onWheel={onWheel}
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
            <Tooltip
              key={section.id}
              content={`${section.label} · ${bars}. ${info.purpose}`}
              side="bottom"
            >
              <button
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
                onFocus={() => setCurrent(section.id)}
              >
                <span className="min-w-0 truncate px-2 font-bold">
                  {section.label}
                </span>
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
            </Tooltip>
          );
        })}
      </div>
      <AddSectionMenu ref={addRef} onAdded={focusSection} />
    </div>
  );
});
