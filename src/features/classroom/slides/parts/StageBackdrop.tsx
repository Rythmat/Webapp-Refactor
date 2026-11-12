/**
 * The stage presets' backdrop (owner, 2026-11-10: one thing, big): the
 * slide's own visual painted edge to edge under its elements.
 *
 *   portrait  the subject's photo, darkened on the left for the name and bio
 *   bleed     a video (the live player on the room's screen), the Globe
 *             section's own map (`SlideGlobe`), or a photo
 *
 * Painted by the stage, like the Showcase halves, so no teacher moves it and
 * the grid's footer rule holds for the slide's elements.
 */
import { useState } from 'react';
import type { StudentLanguage } from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import { SLIDE_CANVAS } from '../slideLayout';
import { useLessonSong } from '../song/LessonSong';
import {
  SPLIT_MEDIA_RECT,
  paintsBleed,
  stageKindOf,
  stageMedia,
} from '../stage';
import type { Slide, SlideMedia, SlideSurface } from '../types';
import { ShowcasePhoto } from './ShowcaseBackdrop';
import { SlideGlobe } from './SlideGlobe';
import { SlideMediaPanel } from './SlideMediaPanel';

/** A video's best still, for the editor and thumbnails. */
const VideoStill = ({ videoId }: { videoId: string }) => {
  const [src, setSrc] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  );
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute inset-0 size-full object-cover"
      onError={() => setSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
    />
  );
};

const BleedMedia = ({
  media,
  live,
  still = false,
  inert = false,
  language,
  command,
}: {
  media: SlideMedia;
  live: boolean;
  still?: boolean;
  inert?: boolean;
  language: StudentLanguage;
  command: SlideSlots['mediaCommand'];
}) => {
  switch (media.type) {
    case 'youtube':
      return (
        // The video keeps the canvas's 16:9 in the middle of a wider
        // screen, black either side, as a theatre's.
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div
            className="relative flex shrink-0 items-center"
            style={{ width: SLIDE_CANVAS.w, height: SLIDE_CANVAS.h }}
          >
            {live ? (
              <SlideMediaPanel
                media={media}
                language={language}
                interactive
                className="!rounded-none !border-0"
                {...(command ? { command } : {})}
              />
            ) : (
              <VideoStill videoId={media.videoId} />
            )}
          </div>
        </div>
      );
    case 'globePreview':
      // The Globe section's own map (owner, 2026-11-10).
      return (
        <SlideGlobe
          globe={media}
          language={language}
          live={live}
          still={still}
          inert={inert}
        />
      );
    case 'artistImage':
      return <ShowcasePhoto songId={media.songId} />;
    default:
      return (
        <div className="absolute inset-[64px] flex items-center justify-center">
          <SlideMediaPanel
            media={media}
            language={language}
            interactive={live}
          />
        </div>
      );
  }
};

export const StageBackdrop = ({
  slide,
  surface,
  live,
  still = false,
  inert = false,
  language,
  command,
}: {
  slide: Slide;
  surface: SlideSurface;
  /** A shown slide (the room's screen, Present): videos play, globes fly. */
  live: boolean;
  /** A thumbnail: stills only, no players or maps. */
  still?: boolean;
  /** The editor's canvas: embeds show but don't take the pointer. */
  inert?: boolean;
  language: StudentLanguage;
  command?: SlideSlots['mediaCommand'];
}) => {
  if (!paintsBleed(slide, surface)) return null;
  // A split slide's video sits in its half, on the canvas (`SplitMedia`).
  if (stageKindOf(slide) === 'split') return null;
  const media = stageMedia(slide);
  if (!media) return null;

  if (stageKindOf(slide) === 'portrait') {
    const songId = media.type === 'artistImage' ? media.songId : undefined;
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0b0b0d]"
      >
        {/* A portrait is tall: it stands on the right, its top (the face)
            kept, and fades into the dark the name sits on. */}
        <div
          className={`absolute inset-y-0 right-0 w-[64%] ${live ? '[animation:stage-push-in_14s_ease-out_both] motion-reduce:animate-none' : ''}`}
        >
          {songId ? (
            <ShowcasePhoto songId={songId} position="top" />
          ) : (
            <BleedMedia
              media={media}
              live={false}
              still
              language={language}
              command={undefined}
            />
          )}
        </div>
        {/* The name and bio sit over the dark left side. */}
        <div className="absolute inset-y-0 left-0 w-[62%] [background:linear-gradient(to_right,#0b0b0d_58%,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <BleedMedia
        media={media}
        live={live}
        still={still}
        inert={inert}
        language={language}
        command={command}
      />
    </div>
  );
};

/**
 * A split slide's video, in the left half (owner, 2026-11-12): the lesson's
 * song on the room's screen and Present (`LessonSong`: the player the
 * portrait started moves here and plays on), its still on a student's
 * device, in the editor and in thumbnails.
 */
export const SplitMedia = ({
  slide,
  live,
  language,
  command,
}: {
  slide: Slide;
  live: boolean;
  language: StudentLanguage;
  command?: SlideSlots['mediaCommand'];
}) => {
  const media = stageMedia(slide);
  const videoId = media?.type === 'youtube' ? media.videoId : null;
  const [place, setPlace] = useState<HTMLDivElement | null>(null);
  // The deck's one player claims this half, and starts as the slide opens.
  const song = useLessonSong(live ? videoId : null, place, {
    autoplay: true,
    ...(command ? { command } : {}),
  });
  if (media?.type !== 'youtube') return null;
  const { x, y, w, h } = SPLIT_MEDIA_RECT;
  return (
    <div
      ref={setPlace}
      data-split-media=""
      className="absolute overflow-hidden rounded-[16px] bg-black"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {!live ? (
        <VideoStill videoId={media.videoId} />
      ) : song ? null : (
        // No deck player (a preview): a player of its own.
        <SlideMediaPanel
          media={media}
          language={language}
          interactive
          className="!rounded-none !border-0"
          {...(command ? { command } : {})}
        />
      )}
    </div>
  );
};
