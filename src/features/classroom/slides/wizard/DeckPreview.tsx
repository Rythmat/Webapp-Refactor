import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { publishDay } from '../../publish/publishDay';
import type { Day, StudentLanguage } from '../../types';
import { SlideRenderer } from '../SlideRenderer';
import { interactionsForSlide } from '../deck';

/** Logical projector canvas the preview scales down from. */
const CANVAS_W = 1280;
const CANVAS_H = 720;

interface DeckPreviewProps {
  day: Day;
  language?: StudentLanguage;
}

/**
 * Step 4 of the deck wizard — the real projector-surface SlideRenderer inside
 * a scaled 16:9 frame, with prev/next + dots. Renders from the same
 * `publishDay` snapshot a live session would use, so what you preview is
 * exactly what will project.
 */
export const DeckPreview = ({ day, language = 'both' }: DeckPreviewProps) => {
  const [index, setIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  const snapshot = useMemo(() => publishDay(day), [day]);
  const deck = snapshot.deck;

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CANVAS_W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!deck || deck.slides.length === 0) {
    return (
      <p className="text-sm text-white/50">
        Nothing to preview yet — pick a song first.
      </p>
    );
  }

  const clamped = Math.min(index, deck.slides.length - 1);
  const slide = deck.slides[clamped];

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#141416]"
        style={{ height: CANVAS_H * scale }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <SlideRenderer
            slide={slide}
            surface="projector"
            language={language}
            interactions={interactionsForSlide(snapshot, slide)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex(Math.max(0, clamped - 1))}
          disabled={clamped === 0}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <div className="flex items-center gap-1.5">
          {deck.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={
                'h-1.5 rounded-full transition-all ' +
                (i === clamped ? 'w-5 bg-[#7ecfcf]' : 'w-1.5 bg-white/25')
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setIndex(Math.min(deck.slides.length - 1, clamped + 1))
          }
          disabled={clamped === deck.slides.length - 1}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
