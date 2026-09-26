/**
 * Shrink a zone's content until it fits the zone.
 *
 * Rule 10 renders both languages inside the SAME zone, and the grid's zone
 * heights come from the teacher's monolingual decks: a stacked EN/ES title
 * needs ~136px in a 104px `title`, a subtitle ~82px in 72px. Every bilingual
 * slide in the corpus overflowed, and `SlideStage` clips each zone box, so the
 * Spanish line was sliced mid-glyph on the projector. Not a rounding error —
 * a whole line, on a screen a class is reading.
 *
 * Scaling via `transform` rather than font-size is deliberate: transforms do
 * not affect layout, so the natural size this measures can never be changed by
 * the scale it applies. "Shrink the font, remeasure, shrink again" has no such
 * guarantee. For the same reason the scaled content is NOT widened to reclaim
 * the space the scale gives back — that would change wrapping, which changes
 * the measurement, which is exactly the feedback loop this avoids.
 *
 * Measurement happens on the 1280x720 design canvas, before the stage's own
 * fit-to-viewport transform, so a zone fits identically on every surface —
 * which is what keeps "Present and the projector agree" true at text level too.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The smallest rendered size any autofit text may reach, in DESIGN px on the
 * 1280x720 canvas.
 *
 * A floor on the SCALE was wrong: it treated a 64px title and a 24px body line
 * identically, so the title — which had the most room to give — bottomed out
 * first and clipped. A bilingual title on the shipped demo deck was sliced
 * through the middle of its Spanish line at EN/ES.
 *
 * A floor on the resulting SIZE is what the rule actually means: "still legible
 * from the back of a room". A title may shrink to a third of itself and stay
 * well above it; body copy has almost nothing to give and barely moves.
 */
export const AUTOFIT_MIN_FONT_PX = 20;

export interface Autofit {
  ref: (node: HTMLElement | null) => void;
  scale: number;
}

export const useAutofit = (): Autofit => {
  const [scale, setScale] = useState(1);
  const nodeRef = useRef<HTMLElement | null>(null);

  const measure = useCallback(() => {
    const el = nodeRef.current;
    const box = el?.parentElement;
    if (!el || !box) return;

    const availableH = box.clientHeight;
    const naturalH = el.scrollHeight;
    if (!availableH || !naturalH) return;

    // The largest type in the zone sets the floor: shrinking is uniform, so the
    // biggest line is the one that stays legible longest and the smallest is
    // the one that would disappear first.
    let largestFontPx = 0;
    for (const node of [el, ...el.querySelectorAll('*')]) {
      const fz = parseFloat(getComputedStyle(node).fontSize);
      if (Number.isFinite(fz) && fz > largestFontPx) largestFontPx = fz;
    }
    const floor =
      largestFontPx > 0 ? Math.min(1, AUTOFIT_MIN_FONT_PX / largestFontPx) : 1;

    const next = availableH / naturalH;
    setScale(next >= 0.999 ? 1 : Math.max(floor, next));
  }, []);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      if (node) measure();
    },
    [measure],
  );

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;
    measure();

    // The content changes without the element being remounted — the teacher
    // switches EN → EN/ES, a title is edited, a translation arrives. Keying
    // off the element id missed all of those: the first slide of a deck kept
    // the scale it measured while still monolingual and clipped once the
    // second language appeared.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);

    // Fonts load after first paint and change every measurement.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    let live = true;
    if (fonts?.ready) {
      void fonts.ready.then(() => {
        if (live) measure();
      });
    }

    return () => {
      live = false;
      observer.disconnect();
    };
  }, [measure]);

  return { ref, scale };
};
