import { useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { StudioRoutes } from '@/constants/routes';
import posterUrl from './media/studio-preview.jpg';
import mp4Url from './media/studio-preview.mp4';

/** Opens the editor on a fresh, empty session (same as Studio › Blank Project). */
const NEW_PROJECT_HREF = `${StudioRoutes.editor.definition}?new=1`;

/**
 * The real Studio playing the "Midnight Groove" demo on the Create page, then
 * the Mix page. Recorded by scripts/home/recordStudioPreview.mjs; rerun it
 * when the Studio's look changes. Imported, so each recording gets a new
 * hashed URL and no browser keeps (or range-requests into) an old one.
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
      className="group flex min-h-[466px] flex-col gap-5 rounded-2xl bg-white/[0.04] p-5 outline-none transition-colors duration-150 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/50"
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
            <div className="text-base font-bold leading-6 text-white">
              Studio
            </div>
          </div>
        </div>
        <span className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-[#101012] transition-colors group-hover:bg-[#E6E6E8]">
          <Plus className="size-4" strokeWidth={2.5} />
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
