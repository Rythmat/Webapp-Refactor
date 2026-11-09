/**
 * The Production page, `/studio/production`: the DAW lessons, each opening
 * the editor at `/studio` with that lesson running. The Studio Dashboard
 * that held it went (owner, 2026-10-24); `/studio` is the editor itself, so
 * this page keeps just the tab bar's way there and the lessons.
 */
import { useEffect } from 'react';
import { prefetchDawOnIntent, prefetchDawWhenIdle } from '@/daw/preload';
import { StudioProduction } from './StudioProduction';
import { StudioTabBar } from './StudioTabBar';

/** The tiles and links here that open the editor, or may. */
const OPENS_EDITOR = 'a, button, [role="button"]';

export const StudioProductionPage = () => {
  // Every lesson opens the editor: fetch its chunk once the page is idle,
  // and sooner when the student points at, focuses or presses a tile
  // (milestone 1.12a, bundle-load-09).
  useEffect(() => prefetchDawWhenIdle(), []);
  const onIntent =
    (kind: 'hover' | 'focus' | 'press') => (event: React.SyntheticEvent) => {
      if ((event.target as Element).closest?.(OPENS_EDITOR))
        prefetchDawOnIntent(kind);
    };

  return (
    <div
      className="flex w-full flex-col gap-8 px-6 pt-4 pb-6 md:gap-10 md:px-10 md:pb-10"
      onPointerOver={onIntent('hover')}
      onFocus={onIntent('focus')}
      onPointerDown={onIntent('press')}
    >
      <StudioTabBar />
      <StudioProduction />
    </div>
  );
};
