import { useState, useEffect, useCallback } from 'react';

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function useViewportScale(): ViewportTransform {
  const compute = useCallback((): ViewportTransform => {
    const scale = Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT
    );
    const offsetX = (window.innerWidth - DESIGN_WIDTH * scale) / 2;
    const offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;
    return { scale, offsetX, offsetY };
  }, []);

  const [transform, setTransform] = useState(compute);

  useEffect(() => {
    const onResize = () => setTransform(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [compute]);

  return transform;
}
