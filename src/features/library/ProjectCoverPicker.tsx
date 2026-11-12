import { Check, LayoutGrid } from 'lucide-react';
import { create } from 'zustand';
import { CAPTION } from '@/components/kit/libraryLook';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { useLibraryMeta } from './libraryLocalMeta';
import { setProjectCover } from './libraryProjects';
import {
  coverMotion,
  coverStill,
  PROJECT_COVERS,
  type ProjectCoverImage,
} from './projectCovers';

// ── A project's image (owner, 2026-11-11) ──────────────────────────────────
// The student picks one from the owner's collection (projectCovers.ts), or
// keeps the default, its sessions' covers. Animated where it shows; its
// first frame under reduced motion. The picker opens from a project's menu
// and from its page's cover (useCoverPicker), on whichever Library page
// mounts ProjectCoverPickerHost.

/** A cover image, square, filling its box. Animated, or still when the
 *  student asks for less motion (and in the picker's grid until hovered). */
export function ProjectImage({
  cover,
  still = false,
  className,
}: {
  cover: ProjectCoverImage;
  still?: boolean;
  className?: string;
}) {
  const img = cn('size-full object-cover', className);
  if (still) {
    return (
      <img
        src={coverStill(cover.id)}
        alt=""
        loading="lazy"
        draggable={false}
        className={img}
      />
    );
  }
  return (
    <picture>
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet={coverStill(cover.id)}
      />
      <img
        src={coverMotion(cover.id)}
        alt=""
        loading="lazy"
        draggable={false}
        className={img}
        style={{ background: cover.colour }}
      />
    </picture>
  );
}

export const useCoverPicker = create<{
  projectId: string | null;
  open(projectId: string): void;
  close(): void;
}>((set) => ({
  projectId: null,
  open: (projectId) => set({ projectId }),
  close: () => set({ projectId: null }),
}));

/** The picker; mount one on a page that shows projects. */
export function ProjectCoverPickerHost() {
  const projectId = useCoverPicker((s) => s.projectId);
  const close = useCoverPicker((s) => s.close);
  const project = useLibraryMeta().projects.find((p) => p.id === projectId);
  const current = project?.cover ?? null;

  const pick = (cover: string | null) => {
    if (project) setProjectCover(project.id, cover);
    close();
  };

  return (
    <Dialog
      open={Boolean(project)}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-3 border-white/10 bg-[#18181b] p-5 text-white">
        <DialogTitle className="text-[1rem] font-semibold">
          Choose an image for {project?.name}
        </DialogTitle>
        <DialogDescription className={CAPTION}>
          Point at one to see it move.
        </DialogDescription>
        <ul
          aria-label="Images"
          className="-mx-1 grid flex-1 grid-cols-3 gap-2 overflow-y-auto px-1 py-1 sm:grid-cols-5"
        >
          <li>
            <button
              type="button"
              aria-pressed={current === null}
              onClick={() => pick(null)}
              className={cn(
                'group relative grid aspect-square w-full place-items-center rounded-lg bg-white/[0.06] text-white/60 ring-1 ring-inset ring-white/10 hover:text-white',
                current === null && 'ring-2 ring-white',
                TRANSITION,
                FOCUS_RING,
              )}
            >
              <span className="flex flex-col items-center gap-1 px-2 text-center text-[0.682rem] leading-tight">
                <LayoutGrid aria-hidden className="size-5" />
                Its sessions’ covers
              </span>
              {current === null && <Picked />}
            </button>
          </li>
          {PROJECT_COVERS.map((cover) => {
            const on = cover.id === current;
            const label = cover.credit ? `Image by ${cover.credit}` : 'Image';
            return (
              <li key={cover.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={label}
                  title={cover.credit ? `by ${cover.credit}` : undefined}
                  onClick={() => pick(cover.id)}
                  className={cn(
                    'group relative block aspect-square w-full overflow-hidden rounded-lg ring-1 ring-inset ring-white/10',
                    on && 'ring-2 ring-white',
                    FOCUS_RING,
                  )}
                  style={{ background: cover.colour }}
                >
                  <ProjectImage cover={cover} still />
                  {/* Moving on hover or focus: only one animates at a time. */}
                  <span className="absolute inset-0 hidden group-hover:block group-focus-visible:block motion-reduce:!hidden">
                    <ProjectImage cover={cover} />
                  </span>
                  {on && <Picked />}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Picked() {
  return (
    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-white text-black shadow">
      <Check aria-hidden className="size-3.5" />
    </span>
  );
}
