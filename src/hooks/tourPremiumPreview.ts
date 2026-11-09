import { create } from 'zustand';

/**
 * A Learn tour's look at a Premium course. The How to Navigate tour walks
 * through Hip Hop, which a free player can't open, so for that part of the
 * tour only the course opens for them, and the lock comes back when the tour
 * moves on (Peter, 2026-10-21). `useIsPremium` reads it. In memory only: a
 * reload ends the tour and the preview with it.
 */
export const useTourPremiumPreview = create<{ on: boolean }>(() => ({
  on: false,
}));

export function setTourPremiumPreview(on: boolean) {
  if (useTourPremiumPreview.getState().on !== on)
    useTourPremiumPreview.setState({ on });
}
