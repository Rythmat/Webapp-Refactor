/**
 * The Group Practice slide's Studio (owner, 2026-11-10: the group practice
 * inside the slides): the real editor, running the class's tutorial, framed
 * from its own page (`slides/studio/SlideStudioPage.tsx`, `/studio/slide`) as
 * the lesson globe frames the Globe.
 *
 *   Present        the Studio, to work in, filling the window; the teacher's
 *                  → / ← move through the tutorial's steps, then the slides.
 *                  In a session it leads: the class's devices follow it.
 *   room's screen  the same Studio on the class's step, not taking the pointer.
 *
 * A student's device keeps the tutorial's card and its launch, and the
 * editor and the thumbnails its still (`ActivityHero`): no Studio boots there.
 */
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePresentSteps } from '../../presentation/presentControls';
import {
  SLIDE_STUDIO_STEP,
  isSlideStudioKey,
  isSlideStudioState,
  lessonKeyOf,
  slideStudioSrc,
  type StudioFollow,
} from '../studio/slideStudio';
import { StageFillContext, StageScaleContext } from './SlideGlobe';

/**
 * The room's screen has no bar, only the lesson's section line 20px above
 * the slide's foot (`SectionProgress`): the Studio stops above it, in design
 * px.
 */
const LINE_FOOT = 44;

export const SlideStudio = ({
  tutorialId,
  follow,
  inert = false,
}: {
  tutorialId: string;
  /** The class it does the tutorial with, in a live session. */
  follow?: StudioFollow | undefined;
  /** The room's screen: the Studio shows the class's step, untouched. */
  inert?: boolean;
}) => {
  const scale = useContext(StageScaleContext);
  const area = useContext(StageFillContext);
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [at, setAt] = useState<{ step: number; total: number } | null>(null);

  // Opened once; later steps are messages, not reloads.
  const sessionId = follow?.sessionId;
  const lead = follow?.lead ?? false;
  const src = useMemo(
    () =>
      slideStudioSrc(
        tutorialId,
        sessionId ? { sessionId, lead: lead && !inert } : undefined,
      ),
    [tutorialId, sessionId, lead, inert],
  );

  const go = (step: number) =>
    frame.current?.contentWindow?.postMessage(
      { type: SLIDE_STUDIO_STEP, at: step },
      window.location.origin,
    );

  // Where the frame's tutorial is, and the lesson's keys from inside it.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frame.current?.contentWindow) return;
      if (isSlideStudioState(e.data))
        setAt({ step: e.data.step, total: e.data.total });
      else if (isSlideStudioKey(e.data))
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: lessonKeyOf(e.data.key) }),
        );
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // The class's step, moved from the teacher's panel (or, on the room's
  // screen, by the teacher): the frame goes there too, once its tutorial is
  // running (its first report). Its own report of the same step sends
  // nothing back.
  const classStep = follow?.step;
  const ready = at !== null;
  const atStep = useRef<number | undefined>(undefined);
  atStep.current = at?.step;
  useEffect(() => {
    if (classStep === undefined || !ready || classStep === atStep.current)
      return;
    go(classStep);
  }, [classStep, ready]);

  // Presenting, the teacher's arrow keys move through the tutorial's steps;
  // past the last (or before the first) they move the slide.
  usePresentSteps(
    inert
      ? null
      : {
          next: () =>
            at && at.step < at.total - 1 ? (go(at.step + 1), true) : false,
          prev: () => (at && at.step > 0 ? (go(at.step - 1), true) : false),
        },
    !inert && at ? { at: at.step, total: at.total } : null,
  );

  const fitted = Boolean(scale && scale > 0);
  // On the room's screen the Studio stops above the section line.
  const foot = fitted && inert ? LINE_FOOT * scale! : 0;
  const box = fitted
    ? {
        width: area.w * scale!,
        height: area.h * scale! - foot,
        transform: `scale(${1 / scale!})`,
        transformOrigin: '0 0',
      }
    : { width: '100%', height: '100%' };

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <iframe
        ref={frame}
        title="Studio"
        src={src}
        onLoad={() => setLoaded(true)}
        className={`absolute left-0 top-0 border-0 transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${inert ? 'pointer-events-none' : ''}`}
        style={box}
        // The app's own page, from its own origin; the Studio plays sound,
        // takes a microphone or a MIDI keyboard, and downloads its exports.
        allow="autoplay; microphone; midi; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
        tabIndex={inert ? -1 : undefined}
      />
    </div>
  );
};
