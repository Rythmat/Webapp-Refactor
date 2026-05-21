import { useEffect, useRef, useState, type FC } from 'react';

interface HoneycombCarouselProps {
  slides: string[];
  intervalMs?: number;
  className?: string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const HoneycombCarousel: FC<HoneycombCarouselProps> = ({
  slides,
  intervalMs = 8000,
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (slides.length <= 1 || prefersReducedMotion()) return;

    const tick = () => {
      const next = (activeIndex + 1) % slides.length;
      const preload = new Image();
      preload.src = slides[next];
      preload.onload = () => {
        setNextIndex(next);
        timerRef.current = setTimeout(() => {
          setActiveIndex(next);
          setNextIndex(null);
        }, 1000);
      };
    };

    timerRef.current = setTimeout(tick, intervalMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, slides, intervalMs]);

  const containerStyle: React.CSSProperties = {
    height: '100%',
    background:
      'linear-gradient(135deg, rgba(214,90,101,0.15), rgba(157,92,99,0.12) 40%, rgba(42,42,42,0.4))',
  };

  if (slides.length === 0) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl ${className}`}
        style={containerStyle}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={containerStyle}
    >
      <img
        key={`active-${activeIndex}`}
        src={slides[activeIndex]}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover transition-opacity duration-1000"
        style={{ opacity: nextIndex === null ? 1 : 0 }}
      />
      {nextIndex !== null && (
        <img
          key={`next-${nextIndex}`}
          src={slides[nextIndex]}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover transition-opacity duration-1000"
          style={{ opacity: 1 }}
        />
      )}
    </div>
  );
};
