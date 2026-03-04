import { useState, useEffect, type RefObject } from 'react';

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

interface ContainerTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function useContainerScale(ref: RefObject<HTMLDivElement | null>): ContainerTransform {
  const [transform, setTransform] = useState<ContainerTransform>({
    scale: 0.5,
    offsetX: 0,
    offsetY: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = (width: number, height: number): ContainerTransform => {
      const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
      const offsetX = (width - DESIGN_WIDTH * scale) / 2;
      const offsetY = (height - DESIGN_HEIGHT * scale) / 2;
      return { scale, offsetX, offsetY };
    };

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setTransform(compute(width, height));
    });

    ro.observe(el);

    // Initial measurement
    const rect = el.getBoundingClientRect();
    setTransform(compute(rect.width, rect.height));

    return () => ro.disconnect();
  }, [ref]);

  return transform;
}
