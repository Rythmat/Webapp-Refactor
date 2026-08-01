/**
 * AddSlideMenu — the filmstrip "add slide" affordance. Opens a small menu of
 * slide kinds; picking one appends a blank slide of that kind (inheriting the
 * current phase).
 */
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SlideKind } from '../../slides/types';

const KIND_LABELS: { kind: SlideKind; label: string }[] = [
  { kind: 'content', label: 'Content' },
  { kind: 'media', label: 'Media' },
  { kind: 'interaction', label: 'Question' },
  { kind: 'app-route', label: 'App route' },
  { kind: 'studio-collab', label: 'Studio' },
  { kind: 'showcase', label: 'Showcase' },
];

interface AddSlideMenuProps {
  onAdd: (kind: SlideKind) => void;
}

export const AddSlideMenu = ({ onAdd }: AddSlideMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative flex w-40 shrink-0 items-stretch">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-white/[0.02] py-6 text-white/50 transition-colors hover:border-white/30 hover:text-white"
        style={{ aspectRatio: '16 / 9' }}
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">Add slide</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-44 rounded-xl border border-white/10 bg-neutral-950 p-1 shadow-2xl">
          {KIND_LABELS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                onAdd(kind);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 hover:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
