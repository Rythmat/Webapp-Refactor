/**
 * The student reflow — the same slide, below 768px, as a reading column.
 *
 * Rule 11: a student device at >=768px renders the identical fitted stage;
 * below that, a derived reflow in zone reading order. "Derived" is the load
 * bearing word — this reads the SAME elements the stage lays out and applies
 * the SAME gating, so nothing can be visible on a phone that would not be
 * visible on the projector. It is a different arrangement, never a different
 * slide.
 *
 * Two things a naive "iterate the zones" reflow gets wrong, both of which cost
 * the student the thing they are there for:
 *
 *  1. The spec's reading order names 13 of the 17 content zones (see
 *     `REFLOW_ORDER`), so four render nowhere.
 *  2. The student's question and input are NOT in the `footer` zone. They are
 *     painted over the middle band by `SlideStage`, and the footer element
 *     renders nothing when the band carries it. A zone-only reflow drops them.
 *     The band is injected at `REFLOW_BAND_AFTER` instead.
 */
import type { CSSProperties, ReactNode } from 'react';
import { STUDENT_PHASE_LABELS } from '../../phases';
import { pickLocalized, secondaryLine } from '../../presentation/localized';
import type { Interaction, StudentLanguage } from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import { showsPhaseChip } from '../deck';
import { REFLOW_BAND_AFTER, REFLOW_ORDER } from '../slideGrid';
import type { Slide, SlideElement, SlideSurface } from '../types';
import { SlideElementView } from './SlideElementView';

interface SlideReflowProps {
  slide: Slide;
  surface: SlideSurface;
  language: StudentLanguage;
  elements: readonly SlideElement[];
  interactionsById: Record<string, Interaction>;
  slots?: SlideSlots;
  playableMedia?: boolean;
  accent?: string;
  /** The live layer (reveal, or the question + input), already gated. */
  band?: ReactNode;
  bandInteractionIds?: readonly string[];
}

export const SlideReflow = ({
  slide,
  surface,
  language,
  elements,
  interactionsById,
  slots,
  playableMedia = false,
  accent,
  band,
  bandInteractionIds,
}: SlideReflowProps) => {
  const phaseLabel = STUDENT_PHASE_LABELS[slide.phase];
  const label = pickLocalized(phaseLabel, language);
  const labelAlt = secondaryLine(phaseLabel, language);

  // An interaction the band already carries renders nothing, and an empty
  // wrapper still takes a `gap-4` of dead space in a column. In the stage that
  // div is absolutely positioned and costs nothing; here it is visible.
  const carriedByBand = (e: SlideElement): boolean =>
    e.kind === 'interaction' &&
    Boolean(bandInteractionIds?.includes(e.interactionId));

  const visible = elements.filter((e) => !e.hidden && !carriedByBand(e));
  const byZone = new Map<string, SlideElement[]>();
  for (const el of visible) {
    const bucket = byZone.get(el.zone);
    if (bucket) bucket.push(el);
    else byZone.set(el.zone, [el]);
  }
  for (const bucket of byZone.values()) {
    bucket.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const style: CSSProperties = accent
    ? ({ '--slide-accent': accent } as CSSProperties)
    : {};

  return (
    <div
      data-surface={surface}
      data-layout="reflow"
      className="slide-frame flex w-full flex-col gap-4 p-4"
      style={style}
    >
      {showsPhaseChip(slide) && (
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
          <span aria-hidden className="slide-frame__chip-dot" />
          <span
            className="font-semibold uppercase tracking-widest text-white/80"
            style={{ fontSize: 'var(--slide-label-fz)' }}
          >
            {label}
            {labelAlt && <span className="text-white/40"> · {labelAlt}</span>}
          </span>
        </span>
      )}

      {REFLOW_ORDER.flatMap((zone) => {
        const nodes: ReactNode[] = (byZone.get(zone) ?? []).map((element) => (
          <div
            key={element.id}
            data-zone={element.zone}
            data-element-id={element.id}
          >
            <SlideElementView
              element={element}
              surface={surface}
              language={language}
              interactionsById={interactionsById}
              hiddenInteractionIds={bandInteractionIds}
              slots={slots}
              playableMedia={playableMedia}
              phaseLabel={label}
            />
          </div>
        ));
        // The middle band's place in the column.
        if (zone === REFLOW_BAND_AFTER && band) {
          nodes.push(
            <div key="__band" data-reflow-band>
              {band}
            </div>,
          );
        }
        return nodes;
      })}
    </div>
  );
};
