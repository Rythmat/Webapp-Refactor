import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { GuitarScene } from './GuitarScene';
import { TermList } from './TermPanels';
import { cameraFor, poseFor } from './anatomyPose';
import { frameFor, layoutCallouts } from './callouts';
import type { CompiledModel } from './compileCore';

const LABEL_REM = 0.8125;

/**
 * An Anatomy drawing as a lesson's stage: apart, or with one term lifted out and
 * named. Tapping a part reports its term. There's a plain list for a keyboard or
 * a screen reader, since the drawing itself is only for pointing at.
 */
export function AnatomyStage({
  model,
  term,
  apart = 1,
  locked,
  onPressTerm,
  listLabel,
  focus,
}: {
  model: CompiledModel;
  /** The term lifted out and named, if any. */
  term: string | null;
  /** How far apart the rest are: 0 is assembled. */
  apart?: number;
  locked?: boolean;
  onPressTerm?: (term: string) => void;
  /** The summary of the list of parts, if pressing one is the point. */
  listLabel?: string;
  /** The terms to frame while none is lifted out, for small parts. */
  focus?: readonly string[];
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chosen = term ? (model.termById[term] ?? null) : null;
  const frame = useMemo(() => frameFor(model.view, size), [model.view, size]);
  const labelSize = useMemo(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return size.width > 0 ? (LABEL_REM * rem * frame.width) / size.width : 0.82;
  }, [size.width, frame.width]);
  const pose = useMemo(
    () => poseFor(model, apart, chosen?.id ?? null),
    [model, apart, chosen?.id],
  );
  const camera = useMemo(() => {
    const first = focus?.[0] ? model.termById[focus[0]] : undefined;
    const framed =
      chosen ??
      (first && focus
        ? {
            ...first,
            parts: focus.flatMap((id) => model.termById[id]?.parts ?? []),
          }
        : null);
    return cameraFor(model, framed, pose, null);
  }, [model, chosen, focus, pose]);
  const callouts = useMemo(
    () =>
      chosen
        ? layoutCallouts(model, [chosen], pose, camera, labelSize, frame)
        : [],
    [camera, chosen, frame, labelSize, model, pose],
  );

  return (
    <div className="flex flex-col gap-2" data-stage="anatomy">
      <div
        ref={stage}
        className={cn(
          'mx-auto w-full',
          (locked || !onPressTerm) && 'pointer-events-none',
        )}
        style={{
          height: 'clamp(15rem, 48dvh, 28rem)',
        }}
      >
        <GuitarScene
          model={model}
          pose={pose}
          camera={camera}
          frame={frame}
          callouts={callouts}
          stagger={0}
          onPressPart={(part) => {
            const id = model.termOfPart[part];
            if (id && !locked) onPressTerm?.(id);
          }}
          label={
            chosen
              ? `A microphone, with the ${chosen.name} lifted out`
              : 'A microphone, its parts drawn apart'
          }
        />
      </div>
      {listLabel && (
        <details className="text-[0.875rem] text-white/70">
          <summary className="cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            {listLabel}
          </summary>
          <div className="mt-2">
            <TermList
              model={model}
              selected={chosen?.id ?? null}
              onSelect={(id) => {
                if (!locked) onPressTerm?.(id);
              }}
            />
          </div>
        </details>
      )}
    </div>
  );
}
