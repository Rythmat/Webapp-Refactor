import { useEffect, useRef, useState } from 'react';
import { cn } from '../components/utilities';

interface ScrollGradientOptions {
  gradientHeight?: string;
  lightModeColor?: string;
  darkModeColor?: string;
  topGradientHeight?: string;
  topGradientClassName?: string;
  topLightModeColor?: string;
  topDarkModeColor?: string;
  bottomGradientClassName?: string;
}

/**
 * A hook that provides a reference for a scrollable element and gradient elements
 * that appear at the top and bottom when content is scrollable.
 * - Bottom gradient disappears when scrolled to the bottom
 * - Top gradient appears when scrolled down from the top
 *
 * @param options Configuration options for the gradients
 * @returns [mainRef, bottomGradientElement, topGradientElement] - A ref to attach to your scrollable element and the gradient elements to render
 */
export function useScrollGradient(options: ScrollGradientOptions = {}) {
  const {
    gradientHeight = 'h-16',
    lightModeColor = 'from-white',
    darkModeColor = 'dark:from-gray-900/80',
    topGradientHeight = 'h-16',
    topLightModeColor = 'from-white',
    topDarkModeColor = 'dark:from-gray-900/80',
    bottomGradientClassName = 'bottom-0',
    topGradientClassName = 'top-0',
  } = options;

  const mainRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const checkOverflow = () => {
      if (mainRef.current) {
        const hasVerticalOverflow =
          mainRef.current.scrollHeight > mainRef.current.clientHeight;
        setHasOverflow(hasVerticalOverflow);
      }
    };

    checkOverflow();

    // Check again when content might change
    window.addEventListener('resize', checkOverflow);
    const observer = new MutationObserver(checkOverflow);

    if (mainRef.current) {
      observer.observe(mainRef.current, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', checkOverflow);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        // Check if at bottom (with a small threshold for browser rounding errors)
        const isBottom =
          Math.abs(
            mainRef.current.scrollHeight -
              mainRef.current.scrollTop -
              mainRef.current.clientHeight,
          ) < 2;

        // Check if at top
        const isTop = mainRef.current.scrollTop < 2;

        setIsAtBottom(isBottom);
        setIsAtTop(isTop);
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const bottomGradientElement = (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 w-full rounded-b-xl bg-gradient-to-t to-transparent transition-opacity',
        gradientHeight,
        lightModeColor,
        darkModeColor,
        bottomGradientClassName,
        {
          'opacity-0': !hasOverflow || isAtBottom,
          'opacity-100': hasOverflow && !isAtBottom,
        },
      )}
    />
  );

  const topGradientElement = (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 w-full rounded-t-xl bg-gradient-to-b to-transparent transition-opacity duration-75',
        topGradientHeight,
        topLightModeColor,
        topDarkModeColor,
        topGradientClassName,
        {
          'opacity-0': !hasOverflow || isAtTop,
          'opacity-100': hasOverflow && !isAtTop,
        },
      )}
    />
  );

  return [mainRef, bottomGradientElement, topGradientElement] as const;
}
