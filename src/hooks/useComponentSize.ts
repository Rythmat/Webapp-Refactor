import { useEffect, useState } from 'react';

export const useComponentSize = () => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (ref) {
        setSize({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [ref]);

  return [setRef, size] as const;
};
