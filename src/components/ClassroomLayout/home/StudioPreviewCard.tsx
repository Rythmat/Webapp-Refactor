import { useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  GO_PILL,
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { StudioRoutes } from '@/constants/routes';
import posterUrl from './media/studio-preview.jpg';
import mp4Url from './media/studio-preview.mp4';

/** Opens the editor on a fresh, empty session (same as Studio › Blank Project). */
const NEW_PROJECT_HREF = `${StudioRoutes.editor.definition}?new=1`;

/**
 * The real Studio playing sixteen bars its own prompt box wrote: the drums'
 * Instrument dock, the chords', then the Mix view, a seamless 2560×1440 loop
 * (owner, 2026-10-24). Recorded by scripts/home/recordStudioPreview.mjs;
 * rerun it when the Studio's look changes. Imported, so each recording gets
 * a new hashed URL and no browser keeps (or range-requests into) an old one.
 */
const VIDEO = { mp4: mp4Url, poster: posterUrl };

/**
 * Plays the loop only while it is on screen, and never under reduced motion
 * (the poster stays).
 */
const useOnScreenPlayback = (reduce: boolean | null) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (reduce) {
      video.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduce]);
  return ref;
};

/**
 * Home's left column: a muted loop of the Studio in action that opens a new
 * blank project on click. Decorative only; the whole card is one link.
 */
export const StudioPreviewCard = () => {
  const reduce = useReducedMotion();
  const videoRef = useOnScreenPlayback(reduce);

  return (
    <Link
      to={NEW_PROJECT_HREF}
      aria-label="Open a new blank Studio project"
      // The prompt box's card (hairline edge, 20px corners, soft shadow,
      // light wash), as the Projects card beside it. No set height: it is
      // its header and the video, so it scales with the video, and the
      // Projects card takes its height from it.
      className={cn(
        PROMPT_FRAME,
        PROMPT_WASH,
        'group flex flex-col gap-5 p-5 outline-none duration-150 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/50',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="size-6 shrink-0 bg-white"
            style={{
              maskImage: 'url(/icons/studio-icon.svg)',
              WebkitMaskImage: 'url(/icons/studio-icon.svg)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          <div className="min-w-0">
            <div className="text-base leading-6 text-white">Studio</div>
          </div>
        </div>
        {/* The prompt box's Go pill; the whole card is the link, so its
          hover wash follows the card's. */}
        <span
          className={cn(
            GO_PILL,
            'text-[#FCFBF9] group-hover:bg-white/[0.04] group-active:bg-white/[0.08]',
          )}
        >
          <Plus aria-hidden className="size-4" />
          New project
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#101012] transition-[border-color,transform] duration-200 ease-out group-hover:border-white/15 motion-safe:group-hover:scale-[1.01]">
        <video
          ref={videoRef}
          aria-hidden
          tabIndex={-1}
          className="absolute inset-0 size-full object-cover"
          poster={VIDEO.poster}
          muted
          loop
          playsInline
          autoPlay={!reduce}
          preload="metadata"
          disablePictureInPicture
        >
          <source src={VIDEO.mp4} type="video/mp4" />
        </video>
      </div>
    </Link>
  );
};
