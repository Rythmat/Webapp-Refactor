/**
 * AddSlideMenu — the filmstrip "add slide" affordance. Opens a menu of
 * content-optimized TEMPLATES; picking one opens the matching content picker and
 * (on pick) seeds a slide tuned for that content type (inheriting the current
 * phase). See `slides/templates/slideTemplates.ts`.
 *
 * The menu is rendered in a portal with fixed positioning so it escapes the
 * filmstrip's `overflow-x-auto` clip (which would otherwise hide items behind
 * the canvas) and any slide-canvas stacking context.
 */
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SLIDE_TEMPLATES,
  type SlideTemplateId,
} from '../../slides/templates/slideTemplates';

interface AddSlideMenuProps {
  onAdd: (templateId: SlideTemplateId) => void;
}

export const AddSlideMenu = ({ onAdd }: AddSlideMenuProps) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Anchor the menu's bottom just above the trigger (it opens upward).
      setPos({ left: r.left, bottom: window.innerHeight - r.top + 8 });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative flex w-40 shrink-0 items-stretch">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-white/[0.02] py-6 text-white/50 transition-colors hover:border-white/30 hover:text-white"
        style={{ aspectRatio: '16 / 9' }}
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">Add slide</span>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-44 rounded-xl border border-white/10 bg-neutral-950 p-1 shadow-2xl"
            style={{ left: pos.left, bottom: pos.bottom }}
          >
            {SLIDE_TEMPLATES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onAdd(id);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
