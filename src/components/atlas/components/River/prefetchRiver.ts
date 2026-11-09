/** Loads the timeline's code before it is asked for (atlas.tsx). */
export const prefetchRiver = () =>
  void import('@/components/atlas/components/River/TimeRiver');
