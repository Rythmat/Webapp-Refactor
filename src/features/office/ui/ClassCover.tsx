import { memo, useMemo } from 'react';
import { CourseCover } from '@/components/learn/cover/CourseCover';
import { cn } from '@/components/utilities';
import { intervalTruchetCover } from '@/lib/cover';
import { truchetPair } from '@/lib/cover/color';

// ── A class's cover (owner, 2026-11-09) ────────────────────────────────────
// Each class wears a Truchet tapestry, as every Learn card does, drawn from
// its id so it never changes and two classes rarely match: a key round the
// fifths for its colours, an interval for its pattern.

const KEYS = ['C', 'G', 'D', 'E', 'B', 'F#', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
const RATIOS: readonly (readonly [number, number])[] = [
  [3, 2],
  [4, 3],
  [5, 4],
  [6, 5],
  [5, 3],
  [8, 5],
  [9, 8],
];

/** A stable, well-spread number from an id (FNV-1a). */
export const hashId = (id: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const classCoverSpec = (classroomId: string) => {
  const h = hashId(classroomId || 'class');
  return intervalTruchetCover(
    classroomId,
    h % 6,
    RATIOS[(h >>> 3) % RATIOS.length],
    truchetPair(KEYS[(h >>> 7) % KEYS.length]),
    false,
  );
};

/** The cover any Office item wears, drawn from its id (a class, a seed). */
export const IdCover = memo(function IdCover({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const cover = useMemo(() => classCoverSpec(id), [id]);
  return (
    <span
      aria-hidden
      className={cn(
        'relative block aspect-square shrink-0 overflow-hidden rounded-xl',
        className,
      )}
    >
      <CourseCover cover={cover} stack={false} className="absolute inset-0" />
    </span>
  );
});

export const ClassCover = ({
  classroomId,
  className,
}: {
  classroomId: string;
  className?: string;
}) => <IdCover id={classroomId} className={className} />;
