import { useEffect, useState, useCallback } from 'react';

export const OCTAVE_WIDTH = 119;
export const OCTAVE_HEIGHT = 119;

const MIN_C = 1;
const MAX_C = 8;

export const useExpandedRange = ({
  params,
}: {
  params: {
    mode: 'vertical' | 'horizontal';
    startC: number;
    endC: number;
  };
}) => {
  const { mode, startC: initialStartC, endC: initialEndC } = params;
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [expandedRange, setExpandedRange] = useState({
    startC: initialStartC,
    endC: initialEndC,
  });

  const calculateExpandedRange = useCallback(() => {
    if (!ref) {
      setExpandedRange({ startC: initialStartC, endC: initialEndC });
      return;
    }

    const containerSize =
      mode === 'vertical' ? ref.clientHeight : ref.clientWidth;
    const octaveSize = mode === 'vertical' ? OCTAVE_HEIGHT : OCTAVE_WIDTH;

    if (containerSize <= 0 || octaveSize <= 0) {
      setExpandedRange({ startC: initialStartC, endC: initialEndC });
      return;
    }

    const totalFitOctaves = Math.max(0, Math.floor(containerSize / octaveSize));
    const initialOctaves = initialEndC - initialStartC + 1;

    if (totalFitOctaves <= initialOctaves) {
      setExpandedRange({ startC: initialStartC, endC: initialEndC });
      return;
    }

    let additionalOctaves = totalFitOctaves - initialOctaves;
    let currentStartC = initialStartC;
    let currentEndC = initialEndC;

    // Expand outwards symmetrically in pairs
    while (
      additionalOctaves >= 2 &&
      currentStartC > MIN_C &&
      currentEndC < MAX_C
    ) {
      currentStartC -= 1;
      currentEndC += 1;
      additionalOctaves -= 2;
    }

    setExpandedRange({ startC: currentStartC, endC: currentEndC });
  }, [ref, mode, initialStartC, initialEndC]);

  useEffect(() => {
    calculateExpandedRange(); // Initial calculation
    window.addEventListener('resize', calculateExpandedRange);

    return () => {
      window.removeEventListener('resize', calculateExpandedRange);
    };
  }, [calculateExpandedRange]); // Rerun effect if calculation logic changes

  return {
    setRef,
    expandedStartC: expandedRange.startC,
    expandedEndC: expandedRange.endC,
  };
};
