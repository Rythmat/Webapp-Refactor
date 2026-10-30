/**
 * Loads the ring's code and the links it draws before they are asked for:
 * when the pointer or focus heads for its tab (atlas.tsx loads it lazily).
 * Both by import(), so neither joins the page's own code.
 */
export const prefetchRing = () => {
  void import('@/components/atlas/components/Ring/RingView');
  void import('@/components/atlas/network/useNetwork').then((m) =>
    m.prefetchNetwork(),
  );
};
