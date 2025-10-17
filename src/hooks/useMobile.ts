import { useEffect, useState } from 'react';
import { SCREEN_SIZES } from '../constants/theme';

export function useIsMobile() {
  const [mql] = useState(() =>
    window.matchMedia(`(max-width: ${SCREEN_SIZES.sm - 1}px)`),
  );

  const [isMobile, setIsMobile] = useState<boolean | undefined>(mql?.matches);

  useEffect(() => {
    const onChange = () => {
      setIsMobile(window.innerWidth < SCREEN_SIZES.sm);
    };

    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < SCREEN_SIZES.sm);

    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, [mql]);

  return !!isMobile;
}
