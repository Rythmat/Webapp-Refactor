import { X } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

// ── Lesson Insight panel ───────────────────────────────────────────────────
// After the Studio's Insight (InspectorPanel; owner, 2026-10-26): a 300px
// card beside the tool rail, its name and a close at the top, and under it
// Insight's cards (InsightCard). It opens over the lesson's right edge, as
// the settings sheet does (the lesson keeps its size), and isn't modal: the
// lesson stays in reach while it's open. Escape, or the rail's icon again,
// closes it.

/** Where the panel goes: between the lesson and the tool rail (LessonFrame). */
export const LessonPanelSlotContext = createContext<HTMLElement | null>(null);

export function LessonInsightPanel({
  open,
  title,
  onClose,
  name,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Its data-lesson-panel name ("about"). */
  name: string;
  children: ReactNode;
}) {
  const slot = useContext(LessonPanelSlotContext);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // What had focus as it opened (the rail's icon), to give it back.
  const returnTo = useRef<HTMLElement | null>(null);

  // Opening takes focus to its name, as the sheets did; closing gives it
  // back, unless it has moved on into the lesson.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    returnTo.current = active instanceof HTMLElement ? active : null;
    titleRef.current?.focus();
    return () => {
      const panel = titleRef.current?.closest('[data-lesson-panel]');
      const focus = document.activeElement;
      if (!focus || focus === document.body || panel?.contains(focus)) {
        returnTo.current?.focus();
      }
    };
  }, [open]);

  if (!open) return null;
  const panel = (
    // A dialog that isn't modal (the lesson stays in reach): no aria-modal,
    // no backdrop.
    <aside
      role="dialog"
      aria-labelledby={`lesson-panel-${name}`}
      data-lesson-panel={name}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
      className="flex h-full w-[300px] min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[#151518] text-[#e8e8f0] shadow-2xl duration-150 animate-in fade-in-0 motion-reduce:animate-none"
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.06] pl-3 pr-1.5">
        <h2
          ref={titleRef}
          id={`lesson-panel-${name}`}
          tabIndex={-1}
          className="flex-1 truncate text-sm font-medium text-white outline-none"
        >
          {title}
        </h2>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-md text-white/60 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex flex-col gap-2 p-2 text-left">{children}</div>
      </div>
    </aside>
  );
  return slot ? createPortal(panel, slot) : panel;
}
