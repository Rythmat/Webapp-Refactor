/**
 * The Studio alone, for a lesson's Group Practice slide (owner, 2026-11-10:
 * the group practice inside the slides). The slide shows this page in a
 * frame (`SlideStudio`), opened on the class's tutorial (`?tutorial=`) and,
 * in a live session, the class's follow params (`classFollow.ts`):
 *
 *   - the teacher's Present leads (`lead=1`): the class goes where this
 *     Studio's tutorial goes, as when the teacher leads from their own tab;
 *   - the room's screen watches (`watch=1`): it shows the class's step.
 *
 * The editor itself, unchanged: no app rail, and its two ways out of the
 * frame (back to Home, the app rail's button) hidden. In a frame because the
 * editor boots from its page's address; here that address is the frame's, so
 * nothing it does moves the lesson. The slide moves the tutorial by message
 * (`slide-studio:step`) and hears where it is (`slide-studio:state`).
 */
import { Suspense, lazy, useEffect } from 'react';
import { getTutorial } from '@/daw/components/Tutorial/tutorials';
import { preloadDaw } from '@/daw/preload';
import { DawSkeleton } from '@/daw/shell/DawSkeleton';
import { EditorRouteBoundary } from '@/daw/shell/errors/EditorRouteBoundary';
import { useStore } from '@/daw/store';
import { connectSlideStudio } from './slideStudioBridge';

const DawApp = lazy(() =>
  preloadDaw().then(({ DawApp }) => ({ default: DawApp })),
);

/** The editor's way out of the frame, which a lesson's Studio has no use for. */
const FRAMED_CSS = `
.slide-studio [data-rail-toggle] { display: none !important; }
`;

/** Framed in a slide: wired to it (`connectSlideStudio`). */
export const useSlideStudioBridge = (): void => {
  useEffect(() => {
    if (window.parent === window) return;
    return connectSlideStudio({
      host: window,
      parent: window.parent,
      origin: window.location.origin,
      store: useStore,
      totalOf: (id) => getTutorial(id)?.steps.length ?? 0,
    });
  }, []);
};

const SlideStudioPage = () => {
  useSlideStudioBridge();
  return (
    <div className="slide-studio flex h-dvh w-screen flex-col overflow-hidden bg-black">
      <style>{FRAMED_CSS}</style>
      <Suspense fallback={<DawSkeleton />}>
        <EditorRouteBoundary>
          <DawApp />
        </EditorRouteBoundary>
      </Suspense>
    </div>
  );
};

export default SlideStudioPage;
