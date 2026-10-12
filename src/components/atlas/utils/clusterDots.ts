/**
 * Timeline dots that would sit on top of each other, merged into clusters.
 *
 * A country with hundreds of events packs dozens of dots into a few pixels of
 * the timeline, where they overlap into one smudge of buttons nobody can aim
 * at. Walking left to right, each dot joins the current cluster while it is
 * within `windowPx` of that cluster's first dot; otherwise it starts a new
 * one. Clusters therefore never span more than `windowPx`, and a cluster of
 * one is just a dot.
 *
 * A cluster is drawn at its first dot, so two clusters always start more
 * than `windowPx` apart: with the window at least as wide as the widest
 * cluster marker, markers never overlap each other.
 */
export interface DotCluster<T> {
  items: T[];
  /** Where to draw the cluster: its first dot. */
  x: number;
}

export function clusterDots<T>(
  items: readonly T[],
  xOf: (item: T) => number,
  windowPx: number,
): DotCluster<T>[] {
  const clusters: DotCluster<T>[] = [];
  let current: DotCluster<T> | null = null;
  for (const item of items) {
    const x = xOf(item);
    if (current && x - current.x <= windowPx) {
      current.items.push(item);
      continue;
    }
    current = { items: [item], x };
    clusters.push(current);
  }
  return clusters;
}
